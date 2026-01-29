import { Server } from 'socket.io';
import logger from './config/logger.js';

let io;

export const initSocket = (server, corsOptions) => {
    io = new Server(server, { cors: corsOptions });

    io.on('connection', (socket) => {
        logger.info(`New client connected: ${socket.id}`);

        socket.on('join-school', (schoolId) => {
            if (schoolId) {
                logger.info(`Client ${socket.id} joined school room: ${schoolId}`);
                socket.join(`school-${schoolId}`);
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
