const expressJwt = require('express-jwt');

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;
    return expressJwt({
        secret,
        algorithms: ['HS256'],
        isRevoked: isRevoked
    }).unless({
        path: [
            // Health check endpoints (no auth required)
            { url: /^\/health$/, methods: ['GET', 'OPTIONS'] },
            // Public file uploads
            { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
            // Public API endpoints - anyone can view products and categories
            { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS'] },
            // Settings - public read access
            { url: /\/api\/v1\/settings\/(.*)/, methods: ['GET', 'OPTIONS'] },
            // Orders - allow GET for viewing orders (auth still required for POST in isRevoked)
            { url: /\/api\/v1\/orders(.*)/, methods: ['GET', 'OPTIONS'] },
            // Auth endpoints
            `${api}/users/login`,
            `${api}/users/register`
        ]
    });
}

async function isRevoked(req, payload, done) {
    try {
        // Allow all authenticated users to access these endpoints
        const userAllowedPaths = [
            /^\/api\/v1\/users\/[a-fA-F0-9]+$/, // GET user by ID
            /^\/api\/v1\/orders/, // Orders endpoints
            /^\/api\/v1\/products/ // Products endpoints
        ];

        const requestPath = req.originalUrl || req.url;

        // Check if the path is allowed for all authenticated users
        for (const pattern of userAllowedPaths) {
            if (pattern.test(requestPath)) {
                return done(null, false); // Allow access
            }
        }

        // For admin-only routes, check if user is admin
        if (!payload.isAdmin) {
            return done(null, true); // Revoke token if not admin
        }

        return done(null, false); // Allow token for admin users
    } catch (error) {
        console.error('JWT Revocation Error:', error);
        return done(null, true); // Revoke token on error
    }
}

module.exports = authJwt;
