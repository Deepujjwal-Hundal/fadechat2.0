import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const CLEANUP_INTERVAL = 30 * 1000; // Check every 30 seconds
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max file size

// --- SERVER SETUP ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: MAX_FILE_SIZE
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;
const isProduction = process.env.NODE_ENV === 'production';

// Always serve static files from dist folder
const distPath = path.join(projectRoot, 'dist');
console.log(`[Server] Serving static files from: ${distPath}`);
app.use('/', express.static(distPath));

// --- STATE MANAGEMENT (In-Memory) ---
const rooms = new Map(); // roomId -> Room
const roomCodes = new Map(); // code -> roomId
const users = new Map(); // socketId -> User
const messageTimers = new Map(); // messageId -> timer (for auto-destruct)

// Helper: Generate Code
const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Helper: Generate masked IP display
const maskIP = (ip) => {
    if (!ip) return '***.***.***';
    const parts = ip.split('.');
    if (parts.length === 4) {
        return `${parts[0]}.***.***`;
    }
    return '***.***.***';
};

// --- SOCKET LOGIC ---
io.on('connection', (socket) => {
    const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    console.log(`[Connect] Socket ${socket.id} connected from ${maskIP(clientIP)}`);

    // 1. REGISTER USER
    socket.on('login', (data, callback) => {
        const { username, avatar } = data;
        const user = {
            id: socket.id,
            username: username,
            avatar: avatar || null,
            maskedIP: maskIP(clientIP),
            connectedAt: Date.now()
        };
        users.set(socket.id, user);
        callback({ 
            success: true, 
            user,
            security: {
                e2eEncrypted: true,
                ipMasked: true,
                screenshotProtection: true
            }
        });
        console.log(`[Login] ${username} (${socket.id}) - IP Masked: ${user.maskedIP}`);
    });

    // 2. CREATE ROOM
    socket.on('create_room', (settings, callback) => {
        const user = users.get(socket.id);
        if (!user) return callback({ error: 'Not authenticated' });

        const roomId = crypto.randomUUID();
        const code = generateRoomCode();

        const defaultSettings = {
            autoDestructTime: 60,
            allowFileSharing: true,
            allowVoiceMessages: true,
            maxParticipants: 10
        };

        const defaultTheme = {
            primaryColor: 'cyan',
            name: 'Cyber Frost'
        };

        const newRoom = {
            id: roomId,
            code,
            creatorId: socket.id,
            participantCount: 1,
            lastActive: Date.now(),
            settings: { ...defaultSettings, ...settings?.settings },
            theme: settings?.theme || defaultTheme,
            participants: [socket.id]
        };

        rooms.set(roomId, newRoom);
        roomCodes.set(code, roomId);

        socket.join(roomId);
        callback({ 
            success: true, 
            room: newRoom,
            security: {
                e2eEncrypted: true,
                ipMasked: true,
                messageAutoDestruct: newRoom.settings.autoDestructTime > 0,
                autoDestructTime: newRoom.settings.autoDestructTime
            }
        });
        console.log(`[Create] Room ${code} created by ${user.username} (Auto-destruct: ${newRoom.settings.autoDestructTime}s)`);
    });

    // 3. JOIN ROOM
    socket.on('join_room', (code, callback) => {
        const user = users.get(socket.id);
        if (!user) return callback({ error: 'Not authenticated' });

        const roomId = roomCodes.get(code.toUpperCase());
        const room = rooms.get(roomId || '');

        if (!room) {
            return callback({ error: 'Room not found or expired' });
        }

        if (room.participants.length >= room.settings.maxParticipants) {
            return callback({ error: 'Room is full' });
        }

        socket.join(room.id);
        room.participantCount++;
        room.participants.push(socket.id);
        room.lastActive = Date.now();

        // Notify others
        socket.to(room.id).emit('user_joined', {
            username: user.username,
            avatar: user.avatar,
            roomId: room.id,
            participantCount: room.participantCount
        });

        callback({ 
            success: true, 
            room,
            security: {
                e2eEncrypted: true,
                ipMasked: true,
                messageAutoDestruct: room.settings.autoDestructTime > 0,
                autoDestructTime: room.settings.autoDestructTime
            }
        });
        console.log(`[Join] ${user.username} joined room ${code}`);
    });

    // 4. SEND MESSAGE (with auto-destruct support)
    socket.on('send_message', (payload) => {
        const room = rooms.get(payload.roomId);
        if (!room) return;

        room.lastActive = Date.now();
        
        // Calculate expiration time
        const ttl = room.settings.autoDestructTime;
        const messageWithExpiry = {
            ...payload,
            ttl,
            expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : null
        };

        // Broadcast to room
        io.to(room.id).emit('new_message', messageWithExpiry);

        // Set auto-destruct timer if enabled
        if (ttl > 0) {
            const timer = setTimeout(() => {
                io.to(room.id).emit('message_expired', { messageId: payload.id });
                messageTimers.delete(payload.id);
            }, ttl * 1000);
            messageTimers.set(payload.id, timer);
        }
    });

    // 5. SEND VOICE MESSAGE
    socket.on('send_voice', (payload) => {
        const room = rooms.get(payload.roomId);
        if (!room || !room.settings.allowVoiceMessages) return;

        room.lastActive = Date.now();
        
        const ttl = room.settings.autoDestructTime;
        const messageWithExpiry = {
            ...payload,
            ttl,
            expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : null
        };

        io.to(room.id).emit('new_message', messageWithExpiry);

        if (ttl > 0) {
            const timer = setTimeout(() => {
                io.to(room.id).emit('message_expired', { messageId: payload.id });
                messageTimers.delete(payload.id);
            }, ttl * 1000);
            messageTimers.set(payload.id, timer);
        }
    });

    // 6. SEND FILE
    socket.on('send_file', (payload) => {
        const room = rooms.get(payload.roomId);
        if (!room || !room.settings.allowFileSharing) return;

        room.lastActive = Date.now();
        
        const ttl = room.settings.autoDestructTime;
        const messageWithExpiry = {
            ...payload,
            ttl,
            expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : null
        };

        io.to(room.id).emit('new_message', messageWithExpiry);

        if (ttl > 0) {
            const timer = setTimeout(() => {
                io.to(room.id).emit('message_expired', { messageId: payload.id });
                messageTimers.delete(payload.id);
            }, ttl * 1000);
            messageTimers.set(payload.id, timer);
        }
    });

    // 7. UPDATE ROOM SETTINGS
    socket.on('update_room_settings', ({ roomId, settings, theme }) => {
        const room = rooms.get(roomId);
        if (!room || room.creatorId !== socket.id) return;

        if (settings) room.settings = { ...room.settings, ...settings };
        if (theme) room.theme = theme;
        room.lastActive = Date.now();

        io.to(roomId).emit('room_updated', { 
            roomId, 
            settings: room.settings, 
            theme: room.theme 
        });
    });

    // 8. TYPING INDICATOR
    socket.on('typing_start', (roomId) => {
        const user = users.get(socket.id);
        if (!user) return;
        socket.to(roomId).emit('user_typing', { 
            userId: socket.id, 
            username: user.username 
        });
    });

    socket.on('typing_stop', (roomId) => {
        socket.to(roomId).emit('user_stopped_typing', { userId: socket.id });
    });

    // 9. LEAVE ROOM
    socket.on('leave_room', (roomId) => {
        handleUserLeavingRoom(socket, roomId);
    });

    // 10. DISCONNECT
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            console.log(`[Disconnect] ${user.username}`);

            rooms.forEach((room, roomId) => {
                if (room.creatorId === socket.id) {
                    destroyRoom(roomId, 'Host disconnected - Room terminated');
                } else if (room.participants.includes(socket.id)) {
                    room.participants = room.participants.filter(id => id !== socket.id);
                    room.participantCount = Math.max(0, room.participantCount - 1);
                    room.lastActive = Date.now();
                    io.to(roomId).emit('user_left', { 
                        userId: socket.id, 
                        username: user.username,
                        roomId,
                        participantCount: room.participantCount
                    });
                }
            });

            users.delete(socket.id);
        }
    });
});

// --- HELPER LOGIC ---

function handleUserLeavingRoom(socket, roomId) {
    const room = rooms.get(roomId);
    const user = users.get(socket.id);
    if (!room || !user) return;

    if (room.creatorId === socket.id) {
        destroyRoom(roomId, 'Host left - Room terminated');
    } else {
        room.participants = room.participants.filter(id => id !== socket.id);
        room.participantCount = Math.max(0, room.participantCount - 1);
        room.lastActive = Date.now();
        socket.leave(roomId);
        socket.to(roomId).emit('user_left', { 
            userId: socket.id,
            username: user.username,
            roomId,
            participantCount: room.participantCount
        });
    }
}

function destroyRoom(roomId, reason) {
    const room = rooms.get(roomId);
    if (room) {
        console.log(`[Destroy] Room ${room.code} - ${reason}`);
        
        // Clear all message timers for this room
        messageTimers.forEach((timer, messageId) => {
            clearTimeout(timer);
        });

        io.to(roomId).emit('room_destroyed', { roomId, reason });
        io.in(roomId).disconnectSockets(false);

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'operational',
        rooms: rooms.size,
        users: users.size,
        uptime: process.uptime()
    });
});

// Fallback for SPA routing - always serve index.html for client routes
app.get('*', (req, res) => {
    res.sendFile(path.join(projectRoot, 'dist', 'index.html'));
});

httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          FadeChat Server v2.0 - Supercharged             ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║  Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}                             ║
║  Features:                                               ║
║    ✓ E2E Encryption Ready                                ║
║    ✓ IP Masking                                          ║
║    ✓ Message Auto-Destruct                               ║
║    ✓ Voice Messages                                      ║
║    ✓ File Sharing                                        ║
║    ✓ Custom Room Themes                                  ║
╚══════════════════════════════════════════════════════════╝
    `);
});
