import { io, Socket } from 'socket.io-client';
import { User, Room, ChatMessage } from '../types';

// In Dev: Vite proxy forwards requests from relative path to localhost:3000
// In Prod: Express serves frontend and backend on same port, so relative path works.
const SOCKET_URL = undefined; 

class SocketService {
  private socket: Socket | null = null;
  private messageHandler: ((event: any) => void) | null = null;

  connect(username: string): Promise<User> {
    return new Promise((resolve, reject) => {
      // Use relative path '/' (implied by undefined url)
      this.socket = io({
        path: '/socket.io', // Standard path
        transports: ['websocket', 'polling'], // Allow polling fallbacks for robustness through proxies
        reconnectionAttempts: 5,
        timeout: 10000
      });

      console.log(`[Socket] Connecting to relative path...`);

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
        // Don't reject immediately on transient errors, let reconnectionAttempts handle it
        // unless it's a critical auth failure, but for initial connect we reject to show UI error
      });
      
      // We set a timeout for the initial promise resolution
      const timeout = setTimeout(() => {
          if(this.socket?.connected === false) {
              reject(new Error("Connection timed out."));
          }
      }, 5000);

      this.socket.on('connect', () => clearTimeout(timeout));

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