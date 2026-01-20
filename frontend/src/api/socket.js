import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;
let currentSchoolId = null;

/**
 * Connect to Socket.io server and join school room
 * Handles React Strict Mode double-mounting gracefully
 */
export const connectSocket = (schoolId) => {
    // Ensure schoolId is a string for consistent room naming
    const schoolIdStr = schoolId ? String(schoolId) : null;

    console.log('🔌 [SOCKET] connectSocket called:');
    console.log('   └── Raw schoolId:', schoolId);
    console.log('   └── String schoolId:', schoolIdStr);
    console.log('   └── Current socket:', socket ? (socket.connected ? 'connected' : 'disconnected') : 'null');
    console.log('   └── Current schoolId:', currentSchoolId);

    // If already connected to the same school, just return existing socket
    if (socket && socket.connected && currentSchoolId === schoolIdStr) {
        console.log('   └── Already connected to same school, reusing socket');
        return socket;
    }

    // Create socket if it doesn't exist
    if (!socket) {
        console.log('   └── Creating new socket connection...');
        socket = io(SOCKET_URL, {
            autoConnect: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('✅ [SOCKET] Connected:', socket.id);
            // Re-join school room on reconnect
            if (currentSchoolId) {
                console.log('🔄 [SOCKET] Re-joining school room:', currentSchoolId);
                socket.emit('join-school', currentSchoolId);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('❌ [SOCKET] Connection error:', error);
        });
    }

    // Connect if not connected
    if (!socket.connected) {
        console.log('   └── Socket not connected, connecting...');
        socket.connect();
    }

    // Join school room if schoolId provided
    if (schoolIdStr && schoolIdStr !== currentSchoolId) {
        currentSchoolId = schoolIdStr;
        console.log('📤 [SOCKET] Emitting join-school:', schoolIdStr);
        socket.emit('join-school', schoolIdStr);
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
