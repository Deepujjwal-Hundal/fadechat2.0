import { io, Socket } from 'socket.io-client';
import { User, Room, ChatMessage } from '../types';

// In development (Vite), point to the backend port 3000.
// In production, undefined means "same host/port" as the served page.
const SOCKET_URL = (import.meta as any).env?.DEV ? 'http://localhost:3000' : undefined;

class SocketService {
  private socket: Socket | null = null;
  private messageHandler: ((event: any) => void) | null = null;

  connect(username: string): Promise<User> {
    return new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL);

      this.socket.on('connect', () => {
        // Authenticate immediately upon connection
        this.socket?.emit('login', username, (response: any) => {
          if (response.success) {
            resolve(response.user);
          } else {
            reject(response.error);
          }
        });
      });

      this.socket.on('connect_error', (err) => {
        reject(err);
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