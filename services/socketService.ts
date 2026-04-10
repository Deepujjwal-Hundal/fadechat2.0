import { io, Socket } from 'socket.io-client';
import { User, Room, ChatMessage, RoomSettings, RoomTheme } from '../types';

const SOCKET_URL = undefined;

class SocketService {
  private socket: Socket | null = null;
  private messageHandler: ((event: any) => void) | null = null;

  connect(username: string, avatar?: string): Promise<{ user: User; security: any }> {
    return new Promise((resolve, reject) => {
      this.socket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 10000
      });

      console.log(`[Socket] Connecting...`);

      this.socket.on('connect', () => {
        console.log('[Socket] Connected. Authenticating...');
        this.socket?.emit('login', { username, avatar }, (response: any) => {
          if (response.success) {
            console.log('[Socket] Login successful');
            resolve({ user: response.user, security: response.security });
          } else {
            console.error('[Socket] Login failed:', response.error);
            reject(response.error);
          }
        });
      });

      this.socket.on('connect_error', (err) => {
        console.error('[Socket] Connection Error:', err.message);
      });

      const timeout = setTimeout(() => {
        if (this.socket?.connected === false) {
          reject(new Error("Connection timed out."));
        }
      }, 5000);

      this.socket.on('connect', () => clearTimeout(timeout));
      this.setupListeners();
    });
  }

  setMessageHandler(handler: (event: any) => void) {
    this.messageHandler = handler;
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('new_message', (payload) => {
      this.messageHandler?.({ type: 'NEW_MESSAGE', payload });
    });

    this.socket.on('message_expired', (payload) => {
      this.messageHandler?.({ type: 'MESSAGE_EXPIRED', payload });
    });

    this.socket.on('user_joined', (payload) => {
      this.messageHandler?.({ type: 'USER_JOINED', payload });
    });

    this.socket.on('user_left', (payload) => {
      this.messageHandler?.({ type: 'USER_LEFT', payload });
    });

    this.socket.on('user_typing', (payload) => {
      this.messageHandler?.({ type: 'USER_TYPING', payload });
    });

    this.socket.on('user_stopped_typing', (payload) => {
      this.messageHandler?.({ type: 'USER_STOPPED_TYPING', payload });
    });

    this.socket.on('room_destroyed', (payload) => {
      this.messageHandler?.({ type: 'ROOM_DESTROYED', payload });
    });

    this.socket.on('room_updated', (payload) => {
      this.messageHandler?.({ type: 'ROOM_UPDATED', payload });
    });
  }

  createRoom(settings?: { settings?: Partial<RoomSettings>; theme?: RoomTheme }): Promise<{ room: Room; security: any }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject('No connection');
      this.socket.emit('create_room', settings || {}, (response: any) => {
        if (response.success) {
          resolve({ room: response.room, security: response.security });
        } else {
          reject(response.error);
        }
      });
    });
  }

  joinRoom(code: string): Promise<{ room: Room; security: any }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject('No connection');
      this.socket.emit('join_room', code, (response: any) => {
        if (response.success) {
          resolve({ room: response.room, security: response.security });
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

  sendVoiceMessage(message: ChatMessage) {
    if (this.socket) {
      this.socket.emit('send_voice', message);
    }
  }

  sendFileMessage(message: ChatMessage) {
    if (this.socket) {
      this.socket.emit('send_file', message);
    }
  }

  updateRoomSettings(roomId: string, settings?: Partial<RoomSettings>, theme?: RoomTheme) {
    if (this.socket) {
      this.socket.emit('update_room_settings', { roomId, settings, theme });
    }
  }

  startTyping(roomId: string) {
    if (this.socket) {
      this.socket.emit('typing_start', roomId);
    }
  }

  stopTyping(roomId: string) {
    if (this.socket) {
      this.socket.emit('typing_stop', roomId);
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
