import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { getAccessToken, subscribeAccessToken } from '../lib/axios';

if (!SOCKET_URL) {
    throw new Error('Missing VITE_SOCKET_URL environment variable');
}

let socket = null;
let currentSchoolId = null;
let currentToken = getAccessToken() || null;

const applySocketToken = (token, { reconnect = false } = {}) => {
    currentToken = token || null;

    if (!socket) return;

    socket.auth = {
        ...(socket.auth || {}),
        token: currentToken,
    };

    if (!currentToken) {
        if (socket.connected || socket.active) {
            socket.disconnect();
        }
        return;
    }

    if (reconnect) {
        if (socket.connected || socket.active) {
            socket.disconnect();
        }
        socket.connect();
    }
};

subscribeAccessToken((token) => {
    const nextToken = token || null;
    if (nextToken === currentToken) return;
    applySocketToken(nextToken, { reconnect: true });
});

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

    const token = getAccessToken();

    // If already connected to the same school, return existing socket
    if (socket && socket.connected && currentSchoolId === schoolIdStr && currentToken === (token || null)) {
        return socket;
    }

    // Create socket if it doesn't exist
    if (!socket) {
        socket = io(SOCKET_URL, {
            auth: {
                token: token || null,
            },
            autoConnect: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,   // Cap at 30 seconds between retries
            randomizationFactor: 0.5,      // Jitter to prevent thundering herd
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

    applySocketToken(token);

    // Connect if not connected
    if (!socket.connected && token) {
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
