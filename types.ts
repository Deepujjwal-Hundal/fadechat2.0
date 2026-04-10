// Domain entities

export interface User {
  id: string;
  username: string;
  avatar?: string;
}

export interface Room {
  id: string;
  code: string;
  creatorId: string;
  name?: string;
  participantCount: number;
  theme: RoomTheme;
  settings: RoomSettings;
}

export interface RoomSettings {
  autoDestructTime: number; // seconds (0 = disabled)
  allowFileSharing: boolean;
  allowVoiceMessages: boolean;
  maxParticipants: number;
}

export interface RoomTheme {
  primaryColor: 'cyan' | 'magenta' | 'green';
  name: string;
}

export const ROOM_THEMES: RoomTheme[] = [
  { primaryColor: 'cyan', name: 'Cyber Frost' },
  { primaryColor: 'magenta', name: 'Neon Pulse' },
  { primaryColor: 'green', name: 'Matrix' },
];

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  autoDestructTime: 60,
  allowFileSharing: true,
  allowVoiceMessages: true,
  maxParticipants: 10,
};

export interface EncryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  iv: string;
  timestamp: number;
  ttl: number;
  expiresAt?: number;
}

export type ViewState = 'AUTH' | 'DASHBOARD' | 'CHAT';

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  VOICE = 'VOICE',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64 encrypted data
  iv: string;
}

export interface VoiceAttachment {
  id: string;
  duration: number;
  data: string; // base64 encrypted audio data
  iv: string;
}

export interface ChatMessage extends EncryptedMessage {
  type: MessageType;
  isDecrypted?: boolean;
  file?: FileAttachment;
  voice?: VoiceAttachment;
}

export interface SecurityStatus {
  e2eEncrypted: boolean;
  ipMasked: boolean;
  screenshotProtection: boolean;
  messageAutoDestruct: boolean;
  autoDestructTime: number;
}

export const AVATARS = [
  'https://static.prod-images.emergentagent.com/jobs/40ed10e7-4341-44f1-a335-d3799264c5f6/images/0b4bbd5166b060c5ee660bb9b5de42ee0cef85aa28430c69e4256ad22f1814bd.png',
  'https://static.prod-images.emergentagent.com/jobs/40ed10e7-4341-44f1-a335-d3799264c5f6/images/19fde32bdb01ed208fd708efac6596334784fcccbfa03c2d11750e3b93ba5909.png',
  'https://static.prod-images.emergentagent.com/jobs/40ed10e7-4341-44f1-a335-d3799264c5f6/images/55fb45448d8a9af4390ffe401f0ef7544535147bd64ec3fa44bfc4814139cd97.png',
];
