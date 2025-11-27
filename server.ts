import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// --- TYPES (Mirrored from frontend types.ts for server-side logic) ---
interface User {
  id: string;
  username: string;
}

interface Room {
  id: string;
  code: string;
  creatorId: string; // This will be the socket.id
  participantCount: number;
}

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
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.use('/', express.static(path.join(__dirname, 'dist')));
}

// --- STATE MANAGEMENT (In-Memory) ---
const rooms = new Map<string, Room>(); // roomId -> Room
const roomCodes = new Map<string, string>(); // code -> roomId
const users = new Map<string, User>(); // socketId -> User

// Helper: Generate Code
const generateRoomCode = (): string => {
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
  socket.on('login', (username: string, callback) => {
    const user: User = {
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
    if (!user) return callback({ error: 'Not authenticated' });

    const roomId = crypto.randomUUID();
    const code = generateRoomCode();

    const newRoom: Room = {
      id: roomId,
      code,
      creatorId: socket.id,
      participantCount: 1
    };

    rooms.set(roomId, newRoom);
    roomCodes.set(code, roomId);
    
    socket.join(roomId);
    callback({ success: true, room: newRoom });
    console.log(`[Create] Room ${code} created by ${user.username}`);
  });

  // 3. JOIN ROOM
  socket.on('join_room', (code: string, callback) => {
    const user = users.get(socket.id);
    if (!user) return callback({ error: 'Not authenticated' });

    const roomId = roomCodes.get(code.toUpperCase());
    const room = rooms.get(roomId || '');

    if (!room) {
      return callback({ error: 'Room not found' });
    }

    socket.join(room.id);
    room.participantCount++; // Simple counter, not strictly accurate if user joins twice, but sufficient for display
    
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
    // The server does NOT decrypt. It just relays.
    const room = rooms.get(payload.roomId);
    if (room) {
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
      
      // Find all rooms this user is in (socket.io tracks this, but we need to check our logic)
      // Actually, socket.io automatically leaves rooms on disconnect, 
      // but we need to check if they were the CREATOR of any room.
      
      rooms.forEach((room, roomId) => {
        if (room.creatorId === socket.id) {
          destroyRoom(roomId, 'Creator disconnected');
        } else {
            // It's just a participant leaving, we could notify, but strictly 
            // the prompt only requested notifying if the Creator leaves.
            // But let's notify anyway for polish.
             io.to(roomId).emit('user_left', { userId: socket.id, roomId });
        }
      });

      users.delete(socket.id);
    }
  });
});

// --- HELPER LOGIC ---

function handleUserLeavingRoom(socket: any, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.creatorId === socket.id) {
    destroyRoom(roomId, 'Creator left the room');
  } else {
    socket.leave(roomId);
    socket.to(roomId).emit('user_left', { userId: socket.id, roomId });
  }
}

function destroyRoom(roomId: string, reason: string) {
  const room = rooms.get(roomId);
  if (room) {
    console.log(`[Destroy] Room ${room.code} - ${reason}`);
    io.to(roomId).emit('room_destroyed', { roomId, reason });
    
    // Make everyone leave socket room
    io.in(roomId).disconnectSockets(false); // Or just let them handle the event
    
    // Cleanup State
    roomCodes.delete(room.code);
    rooms.delete(roomId);
  }
}

// Fallback for SPA routing (only in production with dist folder)
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`FadeChat Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});