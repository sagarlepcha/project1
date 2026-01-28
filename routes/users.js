const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
    sanitizeEmail,
    isValidEmail,
    sanitizeName,
    sanitizePhone,
    isValidBhutanPhone,
    sanitizeAddress,
    isValidDzongkhag,
    validatePassword
} = require('../helpers/sanitizer');

router.get(`/`, async (req, res) => {
    const userList = await User.find().select('-passwordHash');

    if (!userList) {
        res.status(500).json({ success: false });
    }
    res.send(userList);
});

router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-passwordHash');

        if (!user) {
            return res.status(404).json({ message: 'The user with the given ID was not found.' });
        }
        return res.status(200).send(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
});

router.post('/', async (req, res) => {
    // Sanitize inputs
    const email = sanitizeEmail(req.body.email);
    const name = sanitizeName(req.body.name);
    const phone = sanitizePhone(req.body.phone);
    const address = sanitizeAddress(req.body.address);
    const dzongkhag = req.body.dzongkhag?.trim() || '';

    // Validate required fields
    if (!name) {
        return res.status(400).json({ message: 'Name is required' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    // Validate password
    const passwordValidation = validatePassword(req.body.password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    let user = new User({
        name,
        email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone,
        isAdmin: req.body.isAdmin || false,
        address,
        dzongkhag
    });
    user = await user.save();

    if (!user) return res.status(400).send('The user cannot be created!');

    res.send(user);
});

router.put('/:id', async (req, res) => {
    try {
        const userExist = await User.findById(req.params.id);
        if (!userExist) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Sanitize inputs
        const name = sanitizeName(req.body.name) || userExist.name;
        const email = req.body.email ? sanitizeEmail(req.body.email) : userExist.email;
        const phone = req.body.phone ? sanitizePhone(req.body.phone) : userExist.phone;
        const address =
            req.body.address !== undefined ? sanitizeAddress(req.body.address) : userExist.address;
        const dzongkhag =
            req.body.dzongkhag !== undefined
                ? req.body.dzongkhag?.trim() || ''
                : userExist.dzongkhag;

        // Validate email if changed
        if (req.body.email && !isValidEmail(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        // Check if new email is already taken by another user
        if (req.body.email && email !== userExist.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        // Handle password update
        let newPassword;
        if (req.body.password) {
            const passwordValidation = validatePassword(req.body.password);
            if (!passwordValidation.valid) {
                return res.status(400).json({ message: passwordValidation.message });
            }
            newPassword = bcrypt.hashSync(req.body.password, 10);
        } else {
            newPassword = userExist.passwordHash;
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                name,
                email,
                passwordHash: newPassword,
                phone,
                isAdmin: req.body.isAdmin !== undefined ? req.body.isAdmin : userExist.isAdmin,
                address,
                dzongkhag
            },
            { new: true }
        );

        if (!user) return res.status(400).send('The user cannot be updated!');

        res.send(user);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    const email = sanitizeEmail(req.body.email);

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    const secret = process.env.secret;
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin
            },
            secret,
            { expiresIn: '1d' }
        );

        // Return full user data (excluding password)
        res.status(200).send({
            user: user.email,
            token: token,
            userId: user.id,
            name: user.name,
            phone: user.phone,
            address: user.address,
            dzongkhag: user.dzongkhag,
            isAdmin: user.isAdmin
        });
    } else {
        res.status(400).json({ message: 'Invalid password' });
    }
});

router.post('/register', async (req, res) => {
    // Sanitize inputs
    const email = sanitizeEmail(req.body.email);
    const name = sanitizeName(req.body.name);
    const phone = sanitizePhone(req.body.phone);
    const address = sanitizeAddress(req.body.address);
    const dzongkhag = req.body.dzongkhag?.trim() || '';

    // Validate required fields
    if (!name) {
        return res.status(400).json({ message: 'Name is required' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    // Validate password
    const passwordValidation = validatePassword(req.body.password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    let user = new User({
        name,
        email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone,
        isAdmin: false, // Never allow admin registration via public endpoint
        address,
        dzongkhag
    });
    user = await user.save();

    if (!user) return res.status(400).send('The user cannot be created!');

    res.send(user);
});

router.delete('/:id', (req, res) => {
    User.findByIdAndRemove(req.params.id)
        .then((user) => {
            if (user) {
                return res.status(200).json({ success: true, message: 'the user is deleted!' });
            } else {
                return res.status(404).json({ success: false, message: 'user not found!' });
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err });
        });
});

router.get(`/get/count`, async (req, res) => {
    const userCount = await User.countDocuments((count) => count);

    if (!userCount) {
        res.status(500).json({ success: false });
    }
    res.send({
        userCount: userCount
    });
});

/**
 * POST /push-token
 * Save or update user's push notification token
 */
router.post('/push-token', async (req, res) => {
    try {
        const { userId, pushToken, platform } = req.body;

        if (!userId || !pushToken) {
            return res.status(400).json({
                success: false,
                message: 'userId and pushToken are required'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                pushToken: pushToken,
                pushTokenUpdatedAt: new Date()
            },
            { new: true }
        ).select('-passwordHash');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log(`Push token saved for user ${userId} (${platform || 'unknown'})`);

        res.status(200).json({
            success: true,
            message: 'Push token saved successfully'
        });
    } catch (error) {
        console.error('Error saving push token:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving push token',
            error: error.message
        });
    }
});

/**
 * DELETE /push-token/:userId
 * Remove user's push notification token (logout)
 */
router.delete('/push-token/:userId', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                pushToken: '',
                pushTokenUpdatedAt: null
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log(`Push token removed for user ${req.params.userId}`);

        res.status(200).json({
            success: true,
            message: 'Push token removed successfully'
        });
    } catch (error) {
        console.error('Error removing push token:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing push token',
            error: error.message
        });
    }
});

module.exports = router;
