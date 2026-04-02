import express from 'express';

import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initSocket } from './socket.js';

// Local Imports 
import { conf } from './config/index.js';
import { cspOptions } from './config/csp.js';
import { corsOptions, socketCorsOptions } from './config/cors.js';
import logger from './config/logger.js'; // Import our configured logger
import apiRoutes from './routes/index.route.js';
import errorHandler, { notFoundHandler } from './middlewares/error.middleware.js';
import { sanitizeParams } from './middlewares/paramSanitizer.middleware.js';

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
            maxAge: 31536000,              // 1 year (OWASP recommendation)
            includeSubDomains: true,       // Protect all subdomains
            preload: false                 // Set true after verifying on hstspreload.org
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

// API Routes — prevent caching of sensitive API responses
app.use('/api/v1', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});
app.use('/api/v1', sanitizeParams, apiRoutes);

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
mongoose.connect(conf.MONGO_URI, { dbName: conf.DB_NAME })
    .then(() => {
        logger.info("MongoDB connected successfully.");

        // Start the server now that we have a database connection.
        server.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info("Socket.io is ready and waiting for connections.");
        });
    })
    .catch((error) => {
        logger.error("MongoDB connection error:", error);
        process.exit(1); // Exit the process with a failure code.
    });

