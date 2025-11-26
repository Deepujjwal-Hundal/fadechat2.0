import { io, Socket } from 'socket.io-client';
import { User, Room, ChatMessage } from '../types';

// Robust Dev Detection:
// If running on Vite's default port 5173, assume backend is on 3000.
// Otherwise (production/served), use relative path (undefined).
const isDev = window.location.port === '5173';
const SOCKET_URL = isDev ? 'http://localhost:3000' : undefined;

class SocketService {
  private socket: Socket | null = null;
  private messageHandler: ((event: any) => void) | null = null;

  connect(username: string): Promise<User> {
    return new Promise((resolve, reject) => {
      // Force websocket transport to avoid xhr poll errors (CORS/Proxy issues)
      this.socket = io(SOCKET_URL || '/', {
        transports: ['websocket'],
        reconnectionAttempts: 5
      });

      console.log(`[Socket] Connecting to ${SOCKET_URL || 'relative path'}...`);

      this.socket.on('connect', () => {
        console.log('[Socket] Connected. Authenticating...');
        // Authenticate immediately upon connection
        this.socket?.emit('login', username, (response: any) => {
          if (response.success) {
            console.log('[Socket] Login successful');
            resolve(response.user);
          } else {
            console.error('[Socket] Login failed:', response.error);
            reject(response.error);
          }
        });
      });

      this.socket.on('connect_error', (err) => {
        console.error('[Socket] Connection Error:', err.message);
        reject(new Error(`Connection failed: ${err.message}`));
      });

      // Global event listener setup
      this.setupListeners();
    });
  }

  // Bind the react component's handler to socket events
  setMessageHandler(handler: (event: any) => void) {
    this.messageHandler = handler;
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('new_message', (payload) => {
      this.messageHandler?.({ type: 'NEW_MESSAGE', payload });
    });

    this.socket.on('user_joined', (payload) => {
      this.messageHandler?.({ type: 'USER_JOINED', payload });
    });
    
    this.socket.on('user_left', (payload) => {
        this.messageHandler?.({ type: 'USER_LEFT', payload });
    });

    this.socket.on('room_destroyed', (payload) => {
      this.messageHandler?.({ type: 'ROOM_DESTROYED', payload });
    });
  }

  createRoom(): Promise<Room> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject('No connection');
      this.socket.emit('create_room', {}, (response: any) => {
        if (response.success) {
          resolve(response.room);
        } else {
          reject(response.error);
        }
      });
    });
  }

  joinRoom(code: string): Promise<Room> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject('No connection');
      this.socket.emit('join_room', code, (response: any) => {
        if (response.success) {
          resolve(response.room);
        } else {
          reject(response.error);
        }
      });
    });
  }

  leaveRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('leave_room', roomId);
    }
  }

  sendMessage(message: ChatMessage) {
    if (this.socket) {
      this.socket.emit('send_message', message);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();