import { Room, User, ChatMessage, MessageType } from '../types';

// --- MOCK SERVER STATE ---
// In a real app, this would be in Node.js memory or Redis
const users = new Map<string, User>();
const rooms = new Map<string, Room>();
const activeConnections = new Map<string, (event: any) => void>(); // Simulates WebSocket connections

// Helper to generate random 6-char room code
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 to avoid confusion
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// --- PUBLIC SIMULATED API ---

export const MockServer = {
  // Simulate WebSocket Connection
  connect: (userId: string, onMessage: (event: any) => void) => {
    console.log(`[Server] User ${userId} connected.`);
    activeConnections.set(userId, onMessage);

    // Clean up function (what happens when user disconnects)
    return () => {
      console.log(`[Server] User ${userId} disconnected.`);
      activeConnections.delete(userId);
      handleUserDisconnect(userId);
    };
  },

  // Auth (Mock Bcrypt check)
  login: async (username: string, password: string): Promise<User> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, verify bcrypt hash here.
    // For demo, we just return a user object.
    return {
      id: username.toLowerCase().replace(/\s/g, '_'),
      username: username
    };
  },

  // Room Logic
  createRoom: (creator: User): Room => {
    const roomId = crypto.randomUUID();
    const code = generateRoomCode();
    
    const newRoom: Room = {
      id: roomId,
      code,
      creatorId: creator.id,
      participantCount: 1
    };
    
    rooms.set(roomId, newRoom);
    rooms.set(code, newRoom); // Index by code for fast lookup
    console.log(`[Server] Room created: ${code} by ${creator.username}`);
    return newRoom;
  },

  joinRoom: (code: string, user: User): Room => {
    const room = rooms.get(code.toUpperCase());
    if (!room) {
      throw new Error("Room not found or expired.");
    }
    
    // Notify others in room
    broadcastToRoom(room.id, {
      type: 'USER_JOINED',
      payload: { username: user.username, roomId: room.id }
    });
    
    return room;
  },

  sendMessage: (roomId: string, message: ChatMessage) => {
    // In real app: Store message in memory with TTL
    // Broadcast to all active connections "in" that room (simplified here to all)
    broadcastToRoom(roomId, {
      type: 'NEW_MESSAGE',
      payload: message
    });
  },

  leaveRoom: (roomId: string, userId: string) => {
    handleUserLeavingRoom(roomId, userId);
  }
};

// --- INTERNAL SERVER LOGIC ---

function broadcastToRoom(roomId: string, event: any) {
  // In a real WS server, we'd filter activeConnections by roomId subscription.
  // Here we just blast to everyone for simplicity of the mock.
  activeConnections.forEach((callback) => {
    callback(event);
  });
}

function handleUserDisconnect(userId: string) {
  // Find all rooms this user created
  const roomsToDelete: string[] = [];
  
  rooms.forEach((room) => {
    if (room.creatorId === userId) {
      roomsToDelete.push(room.id);
    }
  });

  roomsToDelete.forEach(roomId => {
    console.log(`[Server] Creator ${userId} disconnected. Destroying Room ${roomId}.`);
    
    // Notify everyone the room is dead
    broadcastToRoom(roomId, {
      type: 'ROOM_DESTROYED',
      payload: { roomId, reason: 'Creator disconnected' }
    });

    // WIPE DATA
    // Remove from maps
    const room = rooms.get(roomId);
    if(room) {
        rooms.delete(room.code);
        rooms.delete(roomId);
    }
  });
}

function handleUserLeavingRoom(roomId: string, userId: string) {
    const room = rooms.get(roomId);
    if(!room) return;

    if (room.creatorId === userId) {
        // Creator left explicitly -> Destroy Room
        handleUserDisconnect(userId); 
    } else {
        // Normal user left
        broadcastToRoom(roomId, {
            type: 'USER_LEFT',
            payload: { roomId, userId }
        });
    }
}