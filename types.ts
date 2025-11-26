// Domain entities

export interface User {
  id: string;
  username: string;
}

export interface Room {
  id: string;
  code: string;
  creatorId: string;
  name?: string; // Optional friendly name
  participantCount: number;
}

export interface EncryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string; // This would be AES-256 encrypted string in a real scenario
  iv: string; // Initialization Vector for AES
  timestamp: number;
  ttl: number; // Time to live in seconds
}

export type ViewState = 'AUTH' | 'DASHBOARD' | 'CHAT';

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM'
}

export interface ChatMessage extends EncryptedMessage {
  type: MessageType;
  isDecrypted?: boolean;
}