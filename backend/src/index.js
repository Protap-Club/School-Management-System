import express from 'express';

import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { initSocket } from './socket.js';

// Local Imports 
import { conf } from './config/index.js';
import { cspOptions } from './config/csp.js';
import { corsOptions, socketCorsOptions } from './config/cors.js';
import logger from './config/logger.js'; // Import our configured logger
import apiRoutes from './routes/index.route.js';
import errorHandler, { notFoundHandler } from './middlewares/error.middleware.js';
import { startResultExpiryJob } from './module/result/result.service.js';
import { startAssignmentExpiryJob } from './module/assignment/assignment.service.js';

// Constants & Setup    
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = conf.PORT;
const isProduction = conf.NODE_ENV === 'production';
const missingEnv = [
    !conf.PORT && 'PORT',
    !conf.MONGO_URI && 'MONGO_URI',
    !conf.DB_NAME && 'DB_NAME',
    !(conf.JWT_SECRET || conf.JWT_ACCESS_SECRET) && 'JWT_SECRET',
    !conf.JWT_REFRESH_SECRET && 'JWT_REFRESH_SECRET',
    conf.CORS_ORIGINS.length === 0 && 'CORS_ORIGINS',
].filter(Boolean);

if (missingEnv.length) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

// Use the native http server to hook Socket.io, then pass the app to it.
const server = createServer(app);

// WebSocket (Socket.io) Setup 
// Setting up real-time communication for things like live attendance updates.
const io = initSocket(server, socketCorsOptions);

// Store io instance on the app object to make it accessible in request handlers
app.set('io', io);


// Core Middleware 
app.use(helmet({
    hsts: isProduction
        ? {
            // Start conservatively in production; increase after HTTPS validation.
            maxAge: 300,
            includeSubDomains: false,
            preload: false
        }
        : false,
    xFrameOptions: { action: 'deny' }, // Legacy clickjacking protection for older browsers
    contentSecurityPolicy: cspOptions.enabled
        ? {
            useDefaults: false,
            directives: cspOptions.directives,
            reportOnly: cspOptions.reportOnly
        }
        : false
}));
if (cspOptions.enabled) {
    logger.info(`CSP is enabled in ${cspOptions.reportOnly ? 'report-only' : 'enforce'} mode.`);
} else {
    logger.warn('CSP is disabled via CSP_MODE=off.');
}
app.use(cors(corsOptions)); // Enable Cross-Origin Resource Sharing
app.options(/.*/, cors(corsOptions)); // Ensure all preflight requests use the same strict policy
app.use(cookieParser());     // Parse cookies (needed for refresh tokens)
app.use(express.json({ limit: conf.JSON_BODY_LIMIT })); // Parses incoming JSON payloads
app.use(express.text({ type: 'text/plain', limit: conf.TEXT_BODY_LIMIT })); // Let's receive plain text for certain NFC readers

// Static File Serving 
// 'resource' directory for static brand assets (protap.png)
// File uploads (logos, notices, avatars) are now served via Cloudinary CDN
app.use('/resource', express.static(path.join(__dirname, '../resource')));


// Response Logger
app.use((req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        const duration = Date.now() - start;
        logger.info({
            msg: "API Response",
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
        });
        return originalJson(body);
    };
    next();
});
  
// Rate Limiting — Protects API from flooding
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

const mutationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30, // 30 mutation requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

// Response compression
app.use(compression());

// Apply rate limits
app.use('/api/v1', apiLimiter);
app.use('/api/v1', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return mutationLimiter(req, res, next);
    }
    next();
});

// API Routes
app.use('/api/v1', apiRoutes);

// A simple health check endpoint.
app.get('/', (req, res) => {
    res.send('School Management System API is running...');
});


// Error Handling   
// This middleware catches any errors that bubble up from our controllers.
// It MUST be the last 'app.use()' call.
app.use(notFoundHandler);
app.use(errorHandler);


// Database & Server Initialization 
// We connect to MongoDB first, and only if successful, we start the server.
logger.info("Connecting to MongoDB...");
mongoose.connect(conf.MONGO_URI, { 
    dbName: conf.DB_NAME,
    maxPoolSize: 50,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => {
        logger.info("MongoDB connected successfully.");

        // Start the server now that we have a database connection.
        server.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info("Socket.io is ready and waiting for connections.");
            
            // Start background maintenance jobs
            startResultExpiryJob();
            startAssignmentExpiryJob();
        });
    })
    .catch((error) => {
        logger.error("MongoDB connection error:", error);
        process.exit(1); // Exit the process with a failure code.
    });

