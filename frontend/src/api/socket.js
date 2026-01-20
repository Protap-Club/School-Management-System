import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;
let currentSchoolId = null;

/**
 * Connect to Socket.io server and join school room
 * Handles React Strict Mode double-mounting gracefully
 */
export const connectSocket = (schoolId) => {
    // Handle schoolId being either a string or a populated object {_id, name, code}
    let schoolIdStr = null;
    if (schoolId) {
        // If schoolId is an object (populated), extract the _id
        if (typeof schoolId === 'object' && schoolId._id) {
            schoolIdStr = String(schoolId._id);
        } else {
            schoolIdStr = String(schoolId);
        }
    }

    console.log('🔌 [SOCKET] connectSocket called:');
    console.log('   └── Raw schoolId:', schoolId);
    console.log('   └── Extracted schoolId:', schoolIdStr);
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
        
        // Only emit join-school if socket is already connected
        // Otherwise, the connect handler will emit it
        if (socket.connected) {
            console.log('📤 [SOCKET] Emitting join-school (connected):', schoolIdStr);
            socket.emit('join-school', schoolIdStr);
        } else {
            console.log('📤 [SOCKET] Will emit join-school after connect:', schoolIdStr);
            // The connect handler above will emit join-school when connected
        }
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
