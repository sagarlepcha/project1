const express = require('express');
const router = express.Router();
const SystemSettings = require('../models/system-settings');

/**
 * GET /api/v1/settings/:key
 * Public endpoint to get a specific setting by key
 */
router.get('/:key', async (req, res) => {
    try {
        const setting = await SystemSettings.findOne({
            setting_key: req.params.key
        });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                key: setting.setting_key,
                value: setting.setting_value,
                description: setting.description
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching setting',
            error: error.message
        });
    }
});

/**
 * GET /api/v1/settings
 * Admin endpoint to get all settings
 */
router.get('/', async (req, res) => {
    try {
        const settings = await SystemSettings.find().sort({ setting_key: 1 });

        res.status(200).json({
            success: true,
            count: settings.length,
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching settings',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/settings
 * Admin endpoint to create or update a setting
 */
router.post('/', async (req, res) => {
    try {
        const { setting_key, setting_value, description } = req.body;

        if (!setting_key || !setting_value) {
            return res.status(400).json({
                success: false,
                message: 'setting_key and setting_value are required'
            });
        }

        // Check if setting already exists
        let setting = await SystemSettings.findOne({ setting_key });

        if (setting) {
            // Update existing setting
            setting.setting_value = setting_value;
            if (description) setting.description = description;
            setting.updated_at = Date.now();

            await setting.save();

            return res.status(200).json({
                success: true,
                message: 'Setting updated successfully',
                data: setting
            });
        } else {
            // Create new setting
            setting = new SystemSettings({
                setting_key,
                setting_value,
                description: description || ''
            });

            await setting.save();

            return res.status(201).json({
                success: true,
                message: 'Setting created successfully',
                data: setting
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving setting',
            error: error.message
        });
    }
});

/**
 * PUT /api/v1/settings/:key
 * Admin endpoint to update a specific setting
 */
router.put('/:key', async (req, res) => {
    try {
        const { setting_value, description } = req.body;

        if (!setting_value) {
            return res.status(400).json({
                success: false,
                message: 'setting_value is required'
            });
        }

        const setting = await SystemSettings.findOne({
            setting_key: req.params.key
        });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        setting.setting_value = setting_value;
        if (description) setting.description = description;
        setting.updated_at = Date.now();

        await setting.save();

        res.status(200).json({
            success: true,
            message: 'Setting updated successfully',
            data: setting
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating setting',
            error: error.message
        });
    }
});

/**
 * DELETE /api/v1/settings/:key
 * Admin endpoint to delete a setting
 */
router.delete('/:key', async (req, res) => {
    try {
        const setting = await SystemSettings.findOneAndDelete({
            setting_key: req.params.key
        });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Setting deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting setting',
            error: error.message
        });
    }
});

module.exports = router;
