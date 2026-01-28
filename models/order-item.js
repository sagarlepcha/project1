const mongoose = require('mongoose');

const orderItemSchema = mongoose.Schema({
    quantity: {
        type: Number,
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    selectedFeature: {
        name: { type: String },
        value: { type: String },
        price: { type: Number }
    },
    unitPrice: {
        type: Number,
        required: true,
        default: 0
    }
});

exports.OrderItem = mongoose.model('OrderItem', orderItemSchema);
