// Initialize System Settings Script
// Run this once to create default settings in the database

const mongoose = require('mongoose');
require('dotenv/config');

const SystemSettings = require('./models/system-settings');

const defaultSettings = [
    {
        setting_key: 'company_bank_account',
        setting_value: '1234567890',
        description: 'Company bank account number for customer payments - CHANGE THIS!'
    },
    {
        setting_key: 'company_name',
        setting_value: 'E-Shop',
        description: 'Company name'
    },
    {
        setting_key: 'support_email',
        setting_value: 'support@eshop.com',
        description: 'Customer support email'
    },
    {
        setting_key: 'support_phone',
        setting_value: '+975-XXXXXXXX',
        description: 'Customer support phone number'
    }
];

async function initializeSettings() {
    try {
        // Connect to database
        await mongoose.connect(process.env.CONNECTION_STRING, {
            dbName: 'eshop-database',
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to database...');

        // Create or update each setting
        for (const setting of defaultSettings) {
            const existing = await SystemSettings.findOne({
                setting_key: setting.setting_key
            });

            if (existing) {
                console.log(`✓ Setting '${setting.setting_key}' already exists`);
            } else {
                await SystemSettings.create(setting);
                console.log(`✓ Created setting '${setting.setting_key}'`);
            }
        }

        console.log('\n✅ System settings initialization complete!');
        console.log(
            '\n⚠️  IMPORTANT: Please update the company_bank_account setting in the admin panel!'
        );

        process.exit(0);
    } catch (error) {
        console.error('Error initializing settings:', error);
        process.exit(1);
    }
}

initializeSettings();
