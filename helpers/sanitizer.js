/**
 * Input Sanitization Helper
 * Provides validation and sanitization functions for user inputs
 */

/**
 * Sanitize a string to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';

    return str
        .trim()
        .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
        .substring(0, 1000); // Limit length to prevent overflow
}

/**
 * Sanitize an email address
 * @param {string} email - Email address
 * @returns {string} - Sanitized and lowercased email
 */
function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') return '';

    return email
        .trim()
        .toLowerCase()
        .replace(/[<>'"]/g, '') // Remove quotes and angle brackets
        .substring(0, 255); // Limit length
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
}

/**
 * Sanitize and validate phone number (Bhutan format)
 * Bhutan phone numbers: +975 followed by 8 digits, or just 8 digits starting with 17/77
 * @param {string} phone - Phone number
 * @returns {string} - Sanitized phone number
 */
function sanitizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';

    // Remove all non-digit characters except + at the beginning
    let sanitized = phone.trim().replace(/[^\d+]/g, '');

    // Limit length
    return sanitized.substring(0, 15);
}

/**
 * Validate Bhutan phone number format
 * Valid formats: +97517XXXXXX, +97577XXXXXX, 17XXXXXX, 77XXXXXX
 * @param {string} phone - Phone number
 * @returns {boolean} - True if valid
 */
function isValidBhutanPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;

    const sanitized = phone.replace(/[^\d+]/g, '');

    // Bhutan mobile: +975 17XXXXXX or +975 77XXXXXX (10 digits after +975)
    // or 17XXXXXX or 77XXXXXX (8 digits)
    const bhutanMobileRegex = /^(\+975)?(17|77)\d{6}$/;

    return bhutanMobileRegex.test(sanitized);
}

/**
 * Sanitize name field
 * @param {string} name - Name string
 * @returns {string} - Sanitized name
 */
function sanitizeName(name) {
    if (!name || typeof name !== 'string') return '';

    return name
        .trim()
        .replace(/[<>'"`;]/g, '') // Remove dangerous characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .substring(0, 100); // Limit length
}

/**
 * Sanitize address field
 * @param {string} address - Address string
 * @returns {string} - Sanitized address
 */
function sanitizeAddress(address) {
    if (!address || typeof address !== 'string') return '';

    return address
        .trim()
        .replace(/[<>'"`;]/g, '') // Remove dangerous characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .substring(0, 500); // Limit length
}

/**
 * Validate dzongkhag (Bhutan district)
 * @param {string} dzongkhag - Dzongkhag name
 * @returns {boolean} - True if valid
 */
function isValidDzongkhag(dzongkhag) {
    const validDzongkhags = [
        'Bumthang',
        'Chhukha',
        'Dagana',
        'Gasa',
        'Haa',
        'Lhuentse',
        'Mongar',
        'Paro',
        'Pemagatshel',
        'Punakha',
        'Samdrup Jongkhar',
        'Samtse',
        'Sarpang',
        'Thimphu',
        'Trashigang',
        'Trashiyangtse',
        'Trongsa',
        'Tsirang',
        'Wangdue Phodrang',
        'Zhemgang'
    ];

    if (!dzongkhag || typeof dzongkhag !== 'string') return false;

    return validDzongkhags.includes(dzongkhag.trim());
}

/**
 * Sanitize and validate price/number
 * @param {number|string} value - Number value
 * @returns {number} - Sanitized number (0 if invalid)
 */
function sanitizeNumber(value) {
    const num = parseFloat(value);
    if (isNaN(num) || !isFinite(num)) return 0;
    return Math.max(0, num); // Ensure non-negative
}

/**
 * Sanitize quantity (positive integer)
 * @param {number|string} value - Quantity value
 * @returns {number} - Sanitized quantity (1 if invalid)
 */
function sanitizeQuantity(value) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return 1;
    return Math.min(num, 9999); // Limit to reasonable quantity
}

/**
 * Sanitize MongoDB ObjectId
 * @param {string} id - ObjectId string
 * @returns {string|null} - Sanitized ObjectId or null if invalid
 */
function sanitizeObjectId(id) {
    if (!id || typeof id !== 'string') return null;

    // MongoDB ObjectId is a 24-character hex string
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    const sanitized = id.trim();

    return objectIdRegex.test(sanitized) ? sanitized : null;
}

/**
 * Validate password strength
 * @param {string} password - Password string
 * @returns {object} - { valid: boolean, message: string }
 */
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long' };
    }

    if (password.length > 128) {
        return { valid: false, message: 'Password is too long' };
    }

    return { valid: true, message: 'Password is valid' };
}

/**
 * Sanitize order status
 * @param {string} status - Order status
 * @returns {string} - Valid status or 'Pending'
 */
function sanitizeOrderStatus(status) {
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (!status || typeof status !== 'string') return 'Pending';

    const trimmed = status.trim();
    return validStatuses.includes(trimmed) ? trimmed : 'Pending';
}

/**
 * Sanitize payment status
 * @param {string} status - Payment status
 * @returns {string} - Valid status or 'pending'
 */
function sanitizePaymentStatus(status) {
    const validStatuses = ['pending', 'review', 'verified', 'rejected'];

    if (!status || typeof status !== 'string') return 'pending';

    const trimmed = status.trim().toLowerCase();
    return validStatuses.includes(trimmed) ? trimmed : 'pending';
}

module.exports = {
    sanitizeString,
    sanitizeEmail,
    isValidEmail,
    sanitizePhone,
    isValidBhutanPhone,
    sanitizeName,
    sanitizeAddress,
    isValidDzongkhag,
    sanitizeNumber,
    sanitizeQuantity,
    sanitizeObjectId,
    validatePassword,
    sanitizeOrderStatus,
    sanitizePaymentStatus
};
