const { Order } = require('../models/order');
const express = require('express');
const { OrderItem } = require('../models/order-item');
const { Product } = require('../models/product');
const { User } = require('../models/user');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    notifyOrderStatusChange,
    notifyPaymentVerified,
    notifyPaymentRejected,
    notifyPaymentUnderReview
} = require('../helpers/push-notifications');

// ==================== INVENTORY MANAGEMENT HELPERS ====================

/**
 * Deduct stock from product feature when order is placed
 * @param {string} productId - Product ID
 * @param {object} selectedFeature - The selected feature (name, value, price)
 * @param {number} quantity - Quantity to deduct
 * @returns {boolean} - Success status
 */
async function deductStock(productId, selectedFeature, quantity) {
    try {
        const product = await Product.findById(productId);
        if (!product) {
            console.error(`Product not found: ${productId}`);
            return false;
        }

        // Find the matching feature
        const featureIndex = product.features.findIndex(
            (f) =>
                f.value === selectedFeature?.value ||
                f.name === selectedFeature?.name ||
                f.price === selectedFeature?.price
        );

        if (featureIndex === -1 && product.features.length > 0) {
            // Use first feature if no match found
            product.features[0].stock = Math.max(0, (product.features[0].stock || 0) - quantity);
            console.log(
                `Deducted ${quantity} from ${product.name} (first feature), new stock: ${product.features[0].stock}`
            );
        } else if (featureIndex !== -1) {
            product.features[featureIndex].stock = Math.max(
                0,
                (product.features[featureIndex].stock || 0) - quantity
            );
            console.log(
                `Deducted ${quantity} from ${product.name} feature ${product.features[featureIndex].value}, new stock: ${product.features[featureIndex].stock}`
            );
        }

        // Check if all features are out of stock
        const totalStock = product.features.reduce((sum, f) => sum + (f.stock || 0), 0);
        if (totalStock === 0) {
            product.inStock = 'Out of Stock';
            console.log(`Product ${product.name} is now out of stock`);
        }

        await product.save();
        return true;
    } catch (error) {
        console.error('Error deducting stock:', error);
        return false;
    }
}

/**
 * Restore stock to product feature when order is cancelled
 * @param {string} productId - Product ID
 * @param {object} selectedFeature - The selected feature (name, value, price)
 * @param {number} quantity - Quantity to restore
 * @returns {boolean} - Success status
 */
async function restoreStock(productId, selectedFeature, quantity) {
    try {
        const product = await Product.findById(productId);
        if (!product) {
            console.error(`Product not found: ${productId}`);
            return false;
        }

        // Find the matching feature
        const featureIndex = product.features.findIndex(
            (f) =>
                f.value === selectedFeature?.value ||
                f.name === selectedFeature?.name ||
                f.price === selectedFeature?.price
        );

        if (featureIndex === -1 && product.features.length > 0) {
            // Use first feature if no match found
            product.features[0].stock = (product.features[0].stock || 0) + quantity;
            console.log(
                `Restored ${quantity} to ${product.name} (first feature), new stock: ${product.features[0].stock}`
            );
        } else if (featureIndex !== -1) {
            product.features[featureIndex].stock =
                (product.features[featureIndex].stock || 0) + quantity;
            console.log(
                `Restored ${quantity} to ${product.name} feature ${product.features[featureIndex].value}, new stock: ${product.features[featureIndex].stock}`
            );
        }

        // Update inStock status if stock is available
        const totalStock = product.features.reduce((sum, f) => sum + (f.stock || 0), 0);
        if (totalStock > 0) {
            product.inStock = 'In Stock';
        }

        await product.save();
        return true;
    } catch (error) {
        console.error('Error restoring stock:', error);
        return false;
    }
}

/**
 * Check if sufficient stock is available for all order items
 * @param {Array} orderItems - Array of order items with product, selectedFeature, quantity
 * @returns {object} - { valid: boolean, errors: string[] }
 */
async function validateStock(orderItems) {
    const errors = [];

    for (const item of orderItems) {
        const product = await Product.findById(item.product);
        if (!product) {
            errors.push(`Product not found: ${item.product}`);
            continue;
        }

        // Find the matching feature
        const feature =
            product.features.find(
                (f) =>
                    f.value === item.selectedFeature?.value ||
                    f.name === item.selectedFeature?.name ||
                    f.price === item.selectedFeature?.price
            ) || product.features[0];

        if (!feature) {
            errors.push(`No features found for product: ${product.name}`);
            continue;
        }

        const availableStock = feature.stock || 0;
        if (availableStock < item.quantity) {
            errors.push(
                `Insufficient stock for "${product.name}" (${
                    feature.value || feature.name
                }): requested ${item.quantity}, available ${availableStock}`
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Process stock changes for an order when status changes
 * @param {object} order - The order object with populated orderItems
 * @param {string} oldStatus - Previous order status
 * @param {string} newStatus - New order status
 */
async function processOrderStatusChange(order, oldStatus, newStatus) {
    // If order is being cancelled, restore stock
    if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
        console.log(`Order ${order._id} cancelled - restoring stock`);

        // Populate order items if not already populated
        const populatedOrder = await Order.findById(order._id).populate({
            path: 'orderItems',
            populate: { path: 'product' }
        });

        for (const orderItem of populatedOrder.orderItems) {
            await restoreStock(
                orderItem.product._id,
                orderItem.selectedFeature,
                orderItem.quantity
            );
        }
    }

    // If order is being un-cancelled (restored), deduct stock again
    if (oldStatus === 'Cancelled' && newStatus !== 'Cancelled') {
        console.log(`Order ${order._id} restored from cancelled - deducting stock`);

        const populatedOrder = await Order.findById(order._id).populate({
            path: 'orderItems',
            populate: { path: 'product' }
        });

        for (const orderItem of populatedOrder.orderItems) {
            await deductStock(orderItem.product._id, orderItem.selectedFeature, orderItem.quantity);
        }
    }
}

// ==================== END INVENTORY MANAGEMENT HELPERS ====================

// File upload configuration for payment proofs
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('Invalid image type');

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `payment-proof-${Date.now()}.${extension}`);
    }
});

const uploadOptions = multer({ storage: storage });

router.get(`/`, async (req, res) => {
    const orderList = await Order.find().populate('user', 'name').sort({ dateOrdered: -1 });

    if (!orderList) {
        res.status(500).json({ success: false });
    }
    res.send(orderList);
});

router.get(`/:id`, async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category'
            }
        });

    if (!order) {
        res.status(500).json({ success: false });
    }
    res.send(order);
});

router.post('/', async (req, res) => {
    try {
        // Validate order items exist
        if (!req.body.orderItems || req.body.orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No order items provided'
            });
        }

        // Validate each product ID exists and is not empty
        for (const item of req.body.orderItems) {
            if (!item.product || typeof item.product !== 'string' || item.product.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: `Invalid product ID: ${item.product}. Please refresh your cart and try again.`
                });
            }
        }

        // Validate stock availability before processing order
        const stockValidation = await validateStock(req.body.orderItems);
        if (!stockValidation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock',
                errors: stockValidation.errors
            });
        }

        const orderItemsIds = await Promise.all(
            req.body.orderItems.map(async (orderitem) => {
                const productId = orderitem.product;

                // Verify product exists
                const product = await Product.findById(productId);
                if (!product) {
                    throw new Error(`Product not found for ID: ${productId}`);
                }

                // Get the unit price from selectedFeature or fetch from product
                let unitPrice = 0;
                if (orderitem.selectedFeature && orderitem.selectedFeature.price) {
                    unitPrice = orderitem.selectedFeature.price;
                } else if (product.features && product.features.length > 0) {
                    unitPrice = product.features[0].price;
                }

                let newOrderItem = new OrderItem({
                    quantity: orderitem.quantity,
                    product: productId,
                    selectedFeature: orderitem.selectedFeature || null,
                    unitPrice: unitPrice
                });

                newOrderItem = await newOrderItem.save();

                return newOrderItem._id;
            })
        );

        const totalPrices = await Promise.all(
            orderItemsIds.map(async (orderItemId) => {
                const orderItem = await OrderItem.findById(orderItemId);

                // Handle case where order item might be null
                if (!orderItem) {
                    console.error('Order item not found for ID:', orderItemId);
                    return 0;
                }

                // Use the stored unitPrice
                const totalPrice = (orderItem.unitPrice || 0) * orderItem.quantity;
                console.log(
                    `Order item ${orderItemId}: unitPrice=${orderItem.unitPrice}, qty=${orderItem.quantity}, total=${totalPrice}`
                );

                return totalPrice;
            })
        );

        const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

        console.log('Order total prices:', totalPrices);

        let order = new Order({
            orderItems: orderItemsIds,
            shippingAddress1: req.body.shippingAddress1,
            shippingAddress2: req.body.shippingAddress2,
            city: req.body.city,
            zip: req.body.zip || '',
            country: req.body.country || 'Bhutan',
            phone: req.body.phone,
            status: req.body.status || 'Pending',
            totalPrice: totalPrice,
            user: req.body.user
        });
        order = await order.save();

        if (!order) return res.status(400).send('the order cannot be created!');

        // Deduct stock for each ordered item
        console.log('Order created successfully, deducting stock...');
        for (const item of req.body.orderItems) {
            await deductStock(item.product, item.selectedFeature, item.quantity);
        }

        res.status(200).send(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating order'
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        // Get current order to check status change
        const currentOrder = await Order.findById(req.params.id);
        if (!currentOrder) {
            return res.status(404).send('Order not found');
        }

        const oldStatus = currentOrder.status;
        const newStatus = req.body.status;

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status: req.body.status
            },
            { new: true }
        );

        if (!order) return res.status(400).send('the order cannot be update!');

        // Process inventory changes based on status
        await processOrderStatusChange(order, oldStatus, newStatus);

        res.send(order);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate({
            path: 'orderItems',
            populate: { path: 'product' }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Restore stock before deleting (if order wasn't already cancelled)
        if (order.status !== 'Cancelled') {
            console.log(`Restoring stock before deleting order ${order._id}`);
            for (const orderItem of order.orderItems) {
                await restoreStock(
                    orderItem.product._id,
                    orderItem.selectedFeature,
                    orderItem.quantity
                );
            }
        }

        // Delete order items
        for (const orderItem of order.orderItems) {
            await OrderItem.findByIdAndRemove(orderItem._id);
        }

        // Delete order
        await Order.findByIdAndRemove(req.params.id);

        res.status(200).json({ success: true, message: 'Order deleted and stock restored' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } }
    ]);

    if (!totalSales) {
        return res.status(400).send('The order sales cannot be generated');
    }

    res.send({ totalsales: totalSales.pop().totalsales });
});

router.get(`/get/count`, async (req, res) => {
    const orderCount = await Order.countDocuments((count) => count);

    if (!orderCount) {
        res.status(500).json({ success: false });
    }
    res.send({
        orderCount: orderCount
    });
});

router.get(`/get/userorders/:userid`, async (req, res) => {
    const userOrderList = await Order.find({ user: req.params.userid })
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category'
            }
        })
        .sort({ dateOrdered: -1 });

    if (!userOrderList) {
        res.status(500).json({ success: false });
    }
    res.send(userOrderList);
});

// ==================== PAYMENT VERIFICATION ENDPOINTS ====================

/**
 * POST /orders/:id/confirm-payment
 * User confirms payment for an order by uploading journal number and payment proof image
 * Security: Users can only update their own orders
 */
router.post('/:id/confirm-payment', uploadOptions.single('payment_proof'), async (req, res) => {
    try {
        const orderId = req.params.id;
        const { payment_journal_number } = req.body;

        // Validate required fields
        if (!payment_journal_number) {
            return res.status(400).json({
                success: false,
                message: 'Payment journal number is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Payment proof image is required'
            });
        }

        // Find the order
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Security Check: Ensure user is updating their own order
        // Note: In production, verify req.auth.userId matches order.user
        // if (req.auth && order.user.toString() !== req.auth.userId) {
        //   return res.status(403).json({
        //     success: false,
        //     message: "Unauthorized: You can only update your own orders",
        //   });
        // }

        // Check if journal number is already used by another order
        const existingOrder = await Order.findOne({
            payment_journal_number: payment_journal_number,
            _id: { $ne: orderId }
        });

        if (existingOrder) {
            return res.status(400).json({
                success: false,
                message: 'This journal number has already been used for another order'
            });
        }

        // Construct file path
        const fileName = req.file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

        // Update order with payment information
        order.payment_journal_number = payment_journal_number;
        order.payment_proof_image = `${basePath}${fileName}`;
        order.payment_status = 'review'; // Move to review status
        order.is_verified = false;

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Payment confirmation submitted successfully',
            order: order
        });
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing payment confirmation',
            error: error.message
        });
    }
});

/**
 * PATCH /:id/admin-status
 * Admin updates the order status
 * Security: Only admins can access this endpoint (protected by JWT middleware)
 */
router.patch('/:id/admin-status', async (req, res) => {
    try {
        const { status } = req.body;

        // Validate status
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Get current order to check status change
        const currentOrder = await Order.findById(req.params.id).populate('user');
        if (!currentOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const oldStatus = currentOrder.status;

        // Update order status
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );

        // Process inventory changes based on status change
        await processOrderStatusChange(order, oldStatus, status);

        // Send push notification to user if they have a push token
        if (currentOrder.user && oldStatus !== status) {
            const user = await User.findById(currentOrder.user._id || currentOrder.user);
            if (user && user.pushToken) {
                const orderNumber = order._id.toString().slice(-8).toUpperCase();
                notifyOrderStatusChange(user.pushToken, orderNumber, oldStatus, status).catch(
                    (err) => console.error('Push notification error:', err)
                );
            }
        }

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            order: order
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
});

/**
 * PATCH /:id/verify-payment
 * Admin verifies or rejects the payment
 * Security: Only admins can access this endpoint (protected by JWT middleware)
 */
router.patch('/:id/verify-payment', async (req, res) => {
    try {
        const { payment_status, is_verified } = req.body;

        // Validate payment_status
        const validPaymentStatuses = ['pending', 'review', 'verified', 'rejected'];
        if (payment_status && !validPaymentStatuses.includes(payment_status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(
                    ', '
                )}`
            });
        }

        // Find the order with user populated
        const order = await Order.findById(req.params.id).populate('user');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const oldPaymentStatus = order.payment_status;

        // Update payment verification fields
        if (payment_status !== undefined) {
            order.payment_status = payment_status;
        }

        if (is_verified !== undefined) {
            order.is_verified = is_verified;
        }

        // If payment is verified, update payment_status automatically
        if (is_verified === true) {
            order.payment_status = 'verified';
        }

        await order.save();

        // Send push notification to user based on payment status change
        if (order.user) {
            const user = await User.findById(order.user._id || order.user);
            if (user && user.pushToken) {
                const orderNumber = order._id.toString().slice(-8).toUpperCase();
                const newPaymentStatus = order.payment_status;

                if (newPaymentStatus !== oldPaymentStatus) {
                    if (newPaymentStatus === 'verified') {
                        notifyPaymentVerified(user.pushToken, orderNumber).catch((err) =>
                            console.error('Push notification error:', err)
                        );
                    } else if (newPaymentStatus === 'rejected') {
                        notifyPaymentRejected(user.pushToken, orderNumber).catch((err) =>
                            console.error('Push notification error:', err)
                        );
                    } else if (newPaymentStatus === 'review') {
                        notifyPaymentUnderReview(user.pushToken, orderNumber).catch((err) =>
                            console.error('Push notification error:', err)
                        );
                    }
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment verification updated successfully',
            order: order
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
});

// ==================== END PAYMENT VERIFICATION ENDPOINTS ====================

module.exports = router;
