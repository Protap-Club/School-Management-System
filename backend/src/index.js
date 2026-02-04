/**
 * Main entry point for the Protap School Management System backend.
 * This file sets up the Express server, database connection, WebSockets, and all middleware.
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initSocket } from './socket.js';

// --- Local Imports ---
import { conf } from './config/index.js';
import logger from './config/logger.js'; // Import our configured logger
import apiRoutes from './routes/index.route.js';
import errorHandler from './middlewares/error.middleware.js';

// --- Constants & Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = conf.PORT || 5000;

// We need to use the native http server to hook Socket.io, then pass the app to it.
const server = createServer(app);

// --- CORS Configuration ---
// Only allowing our frontend to connect.
const corsOptions = {
    origin: ['http://localhost:5173'], // Add your frontend URL here
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// --- WebSocket (Socket.io) Setup ---
// Setting up real-time communication for things like live attendance updates.
// --- WebSocket (Socket.io) Setup ---
const io = initSocket(server, corsOptions);

// Store io instance on the app object
app.set('io', io);


// --- Core Middleware ---
app.use(cors(corsOptions)); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parses incoming JSON payloads
app.use(express.text({ type: 'text/plain' })); // Let's us receive plain text for certain NFC readers

// Store io instance on the app object to make it accessible in request handlers
app.set('io', io);


// --- Static File Serving ---
// Making the 'uploads' and 'resource' directories publicly accessible.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/resource', express.static(path.join(__dirname, '../resource')));


// --- API Routes ---
// This is where we define the main endpoints for our API.
// Mount all API routes via the central router
app.use('/api/v1', apiRoutes);

// A simple health check endpoint.
app.get('/', (req, res) => {
    res.send('School Management System API is running...');
});


// --- Error Handling ---
// This middleware catches any errors that bubble up from our controllers.
// It MUST be the last 'app.use()' call.
app.use(errorHandler);


// --- Database & Server Initialization ---
// We connect to MongoDB first, and only if successful, we start the server.
logger.info("Connecting to MongoDB...");
mongoose.connect(conf.MONGO_URI, { dbName: "Protap" })
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
