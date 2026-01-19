import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;
let currentSchoolId = null;

/**
 * Connect to Socket.io server and join school room
 * Handles React Strict Mode double-mounting gracefully
 */
export const connectSocket = (schoolId) => {
    // If already connected to the same school, just return existing socket
    if (socket && socket.connected && currentSchoolId === schoolId) {
        return socket;
    }

    // Create socket if it doesn't exist
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('Socket.io connected:', socket.id);
            // Re-join school room on reconnect
            if (currentSchoolId) {
                socket.emit('join-school', currentSchoolId);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Socket.io connection error:', error);
        });
    }

    // Connect if not connected
    if (!socket.connected) {
        socket.connect();
    }

    // Join school room if schoolId provided
    if (schoolId && schoolId !== currentSchoolId) {
        currentSchoolId = schoolId;
        socket.emit('join-school', schoolId);
        console.log('Joined school room:', schoolId);
    }

    return socket;
};

/**
 * Disconnect from Socket.io server
 * Note: In React Strict Mode, this may be called during development
 */
export const disconnectSocket = () => {
    // Don't actually disconnect - React Strict Mode will reconnect anyway
    // This prevents connection issues during development
    console.log('disconnectSocket called (socket preserved for stability)');
};

/**
 * Force disconnect - use only when truly leaving the app
 */
export const forceDisconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        currentSchoolId = null;
    }
};

/**
 * Get current socket instance
 */
export const getSocket = () => socket;

export default { connectSocket, disconnectSocket, forceDisconnectSocket, getSocket };
