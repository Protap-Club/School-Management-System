import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

if (!SOCKET_URL) {
    throw new Error('Missing VITE_SOCKET_URL environment variable');
}

let socket = null;
let currentSchoolId = null;

/**
 * Connect to Socket.io server and join school room
 */
export const connectSocket = (schoolId) => {
    // Handle schoolId being either a string or a populated object {_id, name, code}
    let schoolIdStr = null;
    if (schoolId) {
        if (typeof schoolId === 'object' && schoolId._id) {
            schoolIdStr = String(schoolId._id);
        } else {
            schoolIdStr = String(schoolId);
        }
    }

    // If already connected to the same school, return existing socket
    if (socket && socket.connected && currentSchoolId === schoolIdStr) {
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
            // Re-join school room on reconnect
            if (currentSchoolId) {
                socket.emit('join-school', currentSchoolId);
            }
        });

        socket.on('connect_error', () => {
            // Connection error - socket will retry automatically
        });
    }

    // Connect if not connected
    if (!socket.connected) {
        socket.connect();
    }

    // Join school room if schoolId provided
    if (schoolIdStr && schoolIdStr !== currentSchoolId) {
        currentSchoolId = schoolIdStr;
        if (socket.connected) {
            socket.emit('join-school', schoolIdStr);
        }
    }

    return socket;
};

/**
 * Disconnect from Socket.io server
 */
export const disconnectSocket = () => {
    // Don't actually disconnect - React Strict Mode will reconnect anyway
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
