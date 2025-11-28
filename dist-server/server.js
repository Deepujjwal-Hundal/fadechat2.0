import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const CLEANUP_INTERVAL = 60 * 1000; // Check every 1 minute
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour (Room expires if idle for this long)
// --- SERVER SETUP ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow dev server connection
        methods: ["GET", "POST"]
    }
});
// Serve static files from the build directory (for production only)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
    // Cast express.static result to any to avoid TypeScript definition mismatch between express and serve-static
    app.use('/', express.static(path.join(projectRoot, 'dist')));
}
// --- STATE MANAGEMENT (In-Memory) ---
const rooms = new Map(); // roomId -> Room
const roomCodes = new Map(); // code -> roomId
const users = new Map(); // socketId -> User
// Helper: Generate Code
const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
// --- SOCKET LOGIC ---
io.on('connection', (socket) => {
    console.log(`[Connect] Socket ${socket.id} connected`);
    // 1. REGISTER USER
    socket.on('login', (username, callback) => {
        const user = {
            id: socket.id, // In this ephemeral app, socket.id is the user.id
            username: username
        };
        users.set(socket.id, user);
        callback({ success: true, user });
        console.log(`[Login] ${username} (${socket.id})`);
    });
    // 2. CREATE ROOM
    socket.on('create_room', (_, callback) => {
        const user = users.get(socket.id);
        if (!user)
            return callback({ error: 'Not authenticated' });
        const roomId = crypto.randomUUID();
        const code = generateRoomCode();
        const newRoom = {
            id: roomId,
            code,
            creatorId: socket.id,
            participantCount: 1,
            lastActive: Date.now()
        };
        rooms.set(roomId, newRoom);
        roomCodes.set(code, roomId);
        socket.join(roomId);
        callback({ success: true, room: newRoom });
        console.log(`[Create] Room ${code} created by ${user.username}`);
    });
    // 3. JOIN ROOM
    socket.on('join_room', (code, callback) => {
        const user = users.get(socket.id);
        if (!user)
            return callback({ error: 'Not authenticated' });
        const roomId = roomCodes.get(code.toUpperCase());
        const room = rooms.get(roomId || '');
        if (!room) {
            return callback({ error: 'Room not found' });
        }
        socket.join(room.id);
        room.participantCount++; // Simple counter
        room.lastActive = Date.now(); // Update activity
        // Notify others
        socket.to(room.id).emit('user_joined', {
            username: user.username,
            roomId: room.id
        });
        callback({ success: true, room });
        console.log(`[Join] ${user.username} joined room ${code}`);
    });
    // 4. SEND MESSAGE (Relay encrypted payload)
    socket.on('send_message', (payload) => {
        // payload should contain roomId, content, iv, senderId, etc.
        const room = rooms.get(payload.roomId);
        if (room) {
            room.lastActive = Date.now(); // Update activity
            io.to(room.id).emit('new_message', payload);
        }
    });
    // 5. LEAVE ROOM (Explicit)
    socket.on('leave_room', (roomId) => {
        handleUserLeavingRoom(socket, roomId);
    });
    // 6. DISCONNECT (Implicit Leave)
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            console.log(`[Disconnect] ${user.username}`);
            rooms.forEach((room, roomId) => {
                if (room.creatorId === socket.id) {
                    destroyRoom(roomId, 'Creator disconnected');
                }
                else {
                    // If a normal participant leaves, update activity
                    room.lastActive = Date.now();
                    io.to(roomId).emit('user_left', { userId: socket.id, roomId });
                }
            });
            users.delete(socket.id);
        }
    });
});
// --- HELPER LOGIC ---
function handleUserLeavingRoom(socket, roomId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    if (room.creatorId === socket.id) {
        destroyRoom(roomId, 'Creator left the room');
    }
    else {
        room.lastActive = Date.now();
        socket.leave(roomId);
        socket.to(roomId).emit('user_left', { userId: socket.id, roomId });
    }
}
function destroyRoom(roomId, reason) {
    const room = rooms.get(roomId);
    if (room) {
        console.log(`[Destroy] Room ${room.code} - ${reason}`);
        io.to(roomId).emit('room_destroyed', { roomId, reason });
        // Make everyone leave socket room
        io.in(roomId).disconnectSockets(false);
        // Cleanup State
        roomCodes.delete(room.code);
        rooms.delete(roomId);
    }
}
// --- BACKGROUND CLEANUP TASK ---
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    rooms.forEach((room, roomId) => {
        if (now - room.lastActive > INACTIVITY_TIMEOUT) {
            destroyRoom(roomId, 'Room expired due to inactivity');
            cleanedCount++;
        }
    });
    if (cleanedCount > 0) {
        console.log(`[Cleanup] Removed ${cleanedCount} inactive rooms.`);
    }
}, CLEANUP_INTERVAL);
// Fallback for SPA routing (only in production with dist folder)
if (isProduction) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(projectRoot, 'dist', 'index.html'));
    });
}
httpServer.listen(PORT, () => {
    console.log(`FadeChat Server running on port ${PORT}`);
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});
