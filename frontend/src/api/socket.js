import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

/**
 * Connect to Socket.io server and join school room
 */
export const connectSocket = (schoolId) => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ['websocket', 'polling']
        });
    }

    if (!socket.connected) {
        socket.connect();
    }

    if (schoolId) {
        socket.emit('join-school', schoolId);
    }

    return socket;
};

/**
 * Disconnect from Socket.io server
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

/**
 * Get current socket instance
 */
export const getSocket = () => socket;

export default { connectSocket, disconnectSocket, getSocket };
