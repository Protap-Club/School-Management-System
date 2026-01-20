import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { conf } from './config/index.js';
import authRoutes from './routes/auth.route.js';
import userRouter from './routes/user.route.js';
import schoolRouter from './routes/school.route.js';
import nfcRouter from './routes/nfc.route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = conf.PORT || 5000;

// Create HTTP server for Socket.io
const server = createServer(app);

// CORS Configuration
const corsOptions = {
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Socket.io Configuration
const io = new Server(server, {
    cors: corsOptions
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join school-specific room for data isolation
    socket.on('join-school', (schoolId) => {
        if (schoolId) {
            const roomName = `school-${schoolId}`;
            socket.join(roomName);
            console.log(`\n🔌 [SOCKET] Client joined room:`);
            console.log(`   └── Socket ID: ${socket.id}`);
            console.log(`   └── School ID: ${schoolId}`);
            console.log(`   └── Room Name: ${roomName}`);
        } else {
            console.log(`\n⚠️ [SOCKET] Client tried to join without schoolId - Socket ID: ${socket.id}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Export getIO function for use in controllers
export const getIO = () => io;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.text({ type: 'text/plain' })); // For HTTP Shortcuts that send text/plain

// Store io instance on app for access in routes/controllers
app.set('io', io);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve resource files (default logo, etc.)
app.use('/resource', express.static(path.join(__dirname, '../resource')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/school", schoolRouter);
app.use("/api/v1/nfc", nfcRouter);

app.get('/', (req, res) => {
    res.send('School Management System API is running...');
});

// MongoDB Connection
mongoose.connect(conf.MONGO_URI, { dbName: "Protap" })
    .then(() => {
        console.log('Connected to MongoDB');
        // Use server.listen instead of app.listen for Socket.io
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('Socket.io is ready for connections');
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });
