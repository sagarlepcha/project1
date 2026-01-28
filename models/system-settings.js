const mongoose = require('mongoose');

const systemSettingsSchema = mongoose.Schema({
    setting_key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    setting_value: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

systemSettingsSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

systemSettingsSchema.set('toJSON', {
    virtuals: true
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
