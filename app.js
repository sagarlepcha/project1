const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv/config');

// ============================================
// PHASE 1: ENVIRONMENT VARIABLE VALIDATION
// ============================================
const requiredEnvVars = ['API_URL', 'CONNECTION_STRING', 'secret'];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missingVars.forEach((v) => console.error(`   - ${v}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
}

// ============================================
// PHASE 1: LOGGER WITH TIMESTAMPS
// ============================================
const logger = {
    info: (msg, ...args) => console.log(`[${new Date().toISOString()}] ℹ️  INFO: ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[${new Date().toISOString()}] ⚠️  WARN: ${msg}`, ...args),
    error: (msg, ...args) =>
        console.error(`[${new Date().toISOString()}] ❌ ERROR: ${msg}`, ...args),
    success: (msg, ...args) =>
        console.log(`[${new Date().toISOString()}] ✅ SUCCESS: ${msg}`, ...args),
    debug: (msg, ...args) => {
        if (process.env.DEBUG === 'true') {
            console.log(`[${new Date().toISOString()}] 🔍 DEBUG: ${msg}`, ...args);
        }
    }
};

// Make logger globally available
global.logger = logger;

logger.info('Starting server initialization...');

const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');

// ============================================
// PHASE 1: UNHANDLED REJECTION HANDLERS
// ============================================
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down gracefully...');
    logger.error(err.name, err.message);
    logger.error(err.stack);
    // Give time to log before exit
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION! Promise:', promise);
    logger.error('Reason:', reason);
    // Don't crash on unhandled rejection, just log it
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close(false, () => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    mongoose.connection.close(false, () => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
    });
});

app.use(cors());
app.options('*', cors());

//middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev')); // More detailed logging
app.use(authJwt());
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

//Routes
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const usersRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');
const settingsRoutes = require('./routes/settings');

const api = process.env.API_URL;

logger.info(`Mounting routes at ${api}/...`);

app.use(`${api}/categories`, categoriesRoutes);
app.use(`${api}/products`, productsRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/orders`, ordersRoutes);
app.use(`${api}/settings`, settingsRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
            `${api}/categories`,
            `${api}/products`,
            `${api}/users`,
            `${api}/orders`,
            `${api}/settings`
        ]
    });
});

// Global error handler (MUST be last middleware)
app.use(errorHandler);

// ============================================
// PHASE 1: DATABASE CONNECTION WITH AUTO-RECONNECT
// ============================================
const mongooseOptions = {
    dbName: 'eshop-database',
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    retryWrites: true,
    w: 'majority'
};

// Connection event handlers
mongoose.connection.on('connected', () => {
    logger.success('MongoDB connected successfully!');
});

mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    logger.success('MongoDB reconnected!');
});

// Connect with retry logic
const connectWithRetry = async (retries = 5, delay = 5000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            logger.info(`MongoDB connection attempt ${attempt}/${retries}...`);
            await mongoose.connect(process.env.CONNECTION_STRING, mongooseOptions);
            return true;
        } catch (err) {
            logger.error(`Connection attempt ${attempt} failed:`, err.message);
            if (attempt < retries) {
                logger.info(`Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    return false;
};

// Start server function
const startServer = async () => {
    // Connect to database
    const connected = await connectWithRetry();

    if (!connected) {
        logger.error('Failed to connect to MongoDB after multiple attempts.');
        logger.warn('Server will start anyway, but database features will be unavailable.');
    }

    // Server
    const PORT = process.env.PORT || 3000;
    const HOST = '0.0.0.0';

    const server = app.listen(PORT, HOST, () => {
        logger.success(`Server is running on http://${HOST}:${PORT}`);
        logger.info(`Local access: http://localhost:${PORT}`);
        logger.info(`Network access: http://172.23.52.108:${PORT}`);
        logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            logger.error(`Port ${PORT} is already in use!`);
            logger.info('Please close the other application or use a different port.');
        } else {
            logger.error('Server error:', err.message);
        }
        process.exit(1);
    });

    return server;
};

// Start the application
startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});
