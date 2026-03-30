import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { conf } from './config/index.js';
import logger from './config/logger.js';

let io;

export const initSocket = (server, corsOptions) => {
    io = new Server(server, { cors: corsOptions });
    const isProduction = conf.NODE_ENV === 'production';

    // Socket.io responses can bypass Express middleware headers.
    if (isProduction) {
        const hstsValue = 'max-age=300';
        io.engine.on('initial_headers', (headers) => {
            headers['strict-transport-security'] = hstsValue;
        });
        io.engine.on('headers', (headers) => {
            headers['strict-transport-security'] = hstsValue;
        });
    }

    // Authenticate every socket connection via JWT
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, conf.JWT_SECRET || conf.JWT_ACCESS_SECRET);
            socket.userId = decoded.id;
            socket.schoolId = decoded.schoolId;
            next();
        } catch (err) {
            return next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Authenticated client connected: ${socket.id} (user: ${socket.userId})`);

        socket.on('join-school', (schoolId) => {
            // Only allow joining the user's own school room
            if (schoolId && schoolId.toString() === socket.schoolId?.toString()) {
                logger.info(`Client ${socket.id} joined school room: ${schoolId}`);
                socket.join(`school-${schoolId}`);
            } else {
                logger.warn(`Client ${socket.id} attempted to join unauthorized school: ${schoolId}`);
                socket.emit('error', { message: 'Not authorized for this school' });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
