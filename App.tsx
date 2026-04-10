import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Room, ViewState, ChatMessage, MessageType, 
  SecurityStatus, RoomTheme, ROOM_THEMES, DEFAULT_ROOM_SETTINGS,
  AVATARS, FileAttachment, VoiceAttachment
} from './types';
import { socketService } from './services/socketService';
import { CryptoService } from './services/cryptoService';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Background3D } from './components/Background3D';
import { ScreenshotProtector } from './components/ScreenshotProtector';
import { SecurityIndicator, SecurityBadge } from './components/SecurityIndicator';
import { RoomThemeSelector, ThemeBadge, getThemeColor } from './components/RoomTheme';
import { AutoDestructTimer, DestructBadge } from './components/AutoDestructTimer';
import { VoiceRecorder, VoicePlayer } from './components/VoiceMessage';
import { FileUpload, FilePreview } from './components/FileShare';
import { 
  Lock, LogOut, Send, Users, Activity, Hash, ArrowLeft, 
  Trash2, Loader2, Shield, Eye, Mic, Paperclip, Settings,
  X, Clock, Zap, Copy, Check
} from 'lucide-react';

const App = () => {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('AUTH');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [security, setSecurity] = useState<SecurityStatus>({
    e2eEncrypted: true,
    ipMasked: true,
    screenshotProtection: true,
    messageAutoDestruct: true,
    autoDestructTime: 60
  });
  
  // Auth Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dashboard State
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [roomTheme, setRoomTheme] = useState<RoomTheme>(ROOM_THEMES[0]);
  const [autoDestructTime, setAutoDestructTime] = useState(60);
  const [codeCopied, setCodeCopied] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- WEBSOCKET HANDLER ---
  const handleServerMessage = useCallback((event: any) => {
    switch (event.type) {
      case 'NEW_MESSAGE':
        if (currentRoom && event.payload.roomId === currentRoom.id) {
          const roomCode = currentRoom.code;
          
          // Decrypt message
          CryptoService.decrypt(event.payload.content, roomCode, event.payload.iv).then(decrypted => {
            const msg = { ...event.payload, content: decrypted, isDecrypted: true };
            setMessages(prev => [...prev, msg]);
          });
        }
        break;

      case 'MESSAGE_EXPIRED':
        setMessages(prev => prev.filter(m => m.id !== event.payload.messageId));
        break;
      
      case 'ROOM_DESTROYED':
        if (currentRoom && event.payload.roomId === currentRoom.id) {
          setCurrentRoom(null);
          setMessages([]);
          setView('DASHBOARD');
          setError(event.payload.reason || 'Room was closed');
        }
        break;

      case 'USER_JOINED':
        if (currentRoom && event.payload.roomId === currentRoom.id) {
          const sysMsg: ChatMessage = {
            id: Date.now().toString(),
            roomId: currentRoom.id,
            senderId: 'SYSTEM',
            senderName: 'SYSTEM',
            content: `${event.payload.username} joined the secure channel`,
            iv: '',
            timestamp: Date.now(),
            ttl: 0,
            type: MessageType.SYSTEM
          };
          setMessages(prev => [...prev, sysMsg]);
          
          if (currentRoom) {
            setCurrentRoom({
              ...currentRoom,
              participantCount: event.payload.participantCount
            });
          }
        }
        break;
        
      case 'USER_LEFT':
        if (currentRoom && event.payload.roomId === currentRoom.id) {
          const sysMsg: ChatMessage = {
            id: Date.now().toString(),
            roomId: currentRoom.id,
            senderId: 'SYSTEM',
            senderName: 'SYSTEM',
            content: `${event.payload.username} left the channel`,
            iv: '',
            timestamp: Date.now(),
            ttl: 0,
            type: MessageType.SYSTEM
          };
          setMessages(prev => [...prev, sysMsg]);
          
          if (currentRoom) {
            setCurrentRoom({
              ...currentRoom,
              participantCount: event.payload.participantCount
            });
          }
        }
        break;

      case 'USER_TYPING':
        if (!typingUsers.includes(event.payload.username)) {
          setTypingUsers(prev => [...prev, event.payload.username]);
        }
        break;

      case 'USER_STOPPED_TYPING':
        setTypingUsers(prev => prev.filter(u => u !== event.payload.username));
        break;

      case 'ROOM_UPDATED':
        if (currentRoom && event.payload.roomId === currentRoom.id) {
          setCurrentRoom(prev => prev ? {
            ...prev,
            settings: event.payload.settings || prev.settings,
            theme: event.payload.theme || prev.theme
          } : null);
          
          if (event.payload.settings?.autoDestructTime !== undefined) {
            setSecurity(prev => ({
              ...prev,
              autoDestructTime: event.payload.settings.autoDestructTime,
              messageAutoDestruct: event.payload.settings.autoDestructTime > 0
            }));
          }
        }
        break;
    }
  }, [currentRoom, typingUsers]);

  // --- EFFECTS ---
  useEffect(() => {
    socketService.setMessageHandler(handleServerMessage);
  }, [handleServerMessage]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // --- ACTIONS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError('');
    setIsLoading(true);
    
    try {
      const { user: u, security: sec } = await socketService.connect(username, selectedAvatar);
      setUser(u);
      setSecurity(prev => ({ ...prev, ...sec }));
      setView('DASHBOARD');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setError('');
    setIsLoading(true);
    
    try {
      const { room, security: sec } = await socketService.createRoom({
        settings: { ...DEFAULT_ROOM_SETTINGS, autoDestructTime },
        theme: roomTheme
      });
      setCurrentRoom(room);
      setSecurity(prev => ({ ...prev, ...sec }));
      setMessages([]);
      setView('CHAT');
    } catch (err) {
      console.error(err);
      setError('Failed to initialize secure channel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user || !joinCode) return;
    setError('');
    setIsLoading(true);
    
    try {
      const { room, security: sec } = await socketService.joinRoom(joinCode);
      setCurrentRoom(room);
      setSecurity(prev => ({ ...prev, ...sec }));
      setMessages([]);
      setView('CHAT');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to channel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      socketService.leaveRoom(currentRoom.id);
      setCurrentRoom(null);
      setMessages([]);
      setView('DASHBOARD');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !currentRoom) return;

    const roomCode = currentRoom.code;
    const { content, iv } = await CryptoService.encrypt(newMessage, roomCode);
    
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      roomId: currentRoom.id,
      senderId: user.id,
      senderName: user.username,
      senderAvatar: user.avatar,
      content,
      iv,
      timestamp: Date.now(),
      ttl: currentRoom.settings?.autoDestructTime || 60,
      type: MessageType.TEXT
    };

    socketService.sendMessage(msg);
    socketService.stopTyping(currentRoom.id);
    setNewMessage('');
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!user || !currentRoom) return;

    const arrayBuffer = await blob.arrayBuffer();
    const roomCode = currentRoom.code;
    const { data, iv } = await CryptoService.encryptFile(arrayBuffer, roomCode);

    const voice: VoiceAttachment = {
      id: crypto.randomUUID(),
      duration,
      data,
      iv
    };

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      roomId: currentRoom.id,
      senderId: user.id,
      senderName: user.username,
      senderAvatar: user.avatar,
      content: 'Voice message',
      iv: '',
      timestamp: Date.now(),
      ttl: currentRoom.settings?.autoDestructTime || 60,
      type: MessageType.VOICE,
      voice
    };

    socketService.sendVoiceMessage(msg);
    setShowVoiceRecorder(false);
  };

  const handleSendFile = async (file: File) => {
    if (!user || !currentRoom) return;

    const arrayBuffer = await file.arrayBuffer();
    const roomCode = currentRoom.code;
    const { data, iv } = await CryptoService.encryptFile(arrayBuffer, roomCode);

    const fileAttachment: FileAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      data,
      iv
    };

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      roomId: currentRoom.id,
      senderId: user.id,
      senderName: user.username,
      senderAvatar: user.avatar,
      content: `Sent file: ${file.name}`,
      iv: '',
      timestamp: Date.now(),
      ttl: currentRoom.settings?.autoDestructTime || 60,
      type: file.type.startsWith('image/') ? MessageType.IMAGE : MessageType.FILE,
      file: fileAttachment
    };

    socketService.sendFileMessage(msg);
    setShowFileUpload(false);
  };

  const handleTyping = () => {
    if (!currentRoom) return;
    
    socketService.startTyping(currentRoom.id);
    
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    typingTimeout.current = setTimeout(() => {
      socketService.stopTyping(currentRoom.id);
    }, 2000);
  };

  const copyRoomCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const themeColor = currentRoom?.theme?.primaryColor || roomTheme.primaryColor;
  const colors = getThemeColor(themeColor);

  // --- AUTH VIEW ---
  if (view === 'AUTH') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-background">
        <Background3D variant="particles" primaryColor={colors.primary} />
        
        {/* Background image overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/40ed10e7-4341-44f1-a335-d3799264c5f6/images/6ff563a26f246ca4d3a6a54313ae33277db0b198b7989b634667efa7b894b970.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-surface/80 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-2xl" data-testid="auth-container">
            {/* Logo */}
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <div className={`p-4 rounded-2xl border ${colors.border} ${colors.bg} ${colors.glow}`}>
                <Lock className={`w-10 h-10 ${colors.text}`} />
              </div>
            </motion.div>

            <h1 className="text-4xl font-heading font-black text-center mb-2 tracking-tighter">
              FadeChat
            </h1>
            <p className="text-center text-text_muted mb-8 text-sm font-mono">
              Secure • Ephemeral • Encrypted
            </p>

            {/* Avatar Selection */}
            <div className="flex justify-center gap-3 mb-6">
              {AVATARS.map((avatar, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`
                    w-14 h-14 rounded-xl overflow-hidden border-2 transition-all
                    ${selectedAvatar === avatar 
                      ? `${colors.border} ${colors.glow}` 
                      : 'border-border hover:border-white/30'
                    }
                  `}
                  data-testid={`avatar-${i}`}
                >
                  <img src={avatar} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                </motion.button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input 
                label="Identity" 
                placeholder="Enter codename" 
                value={username} 
                onChange={e => {
                  setUsername(e.target.value);
                  setError('');
                }}
                data-testid="username-input"
              />
              <Input 
                label="Passphrase" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                data-testid="password-input"
              />
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-danger text-sm text-center bg-danger/10 p-3 rounded-xl border border-danger/30"
                >
                  {error}
                </motion.div>
              )}

              <Button 
                fullWidth 
                type="submit" 
                disabled={!username || !password}
                loading={isLoading}
                data-testid="login-btn"
              >
                {isLoading ? 'Establishing Connection...' : 'Initialize Secure Session'}
              </Button>
            </form>

            {/* Security badges */}
            <div className="flex justify-center gap-2 mt-6">
              <SecurityBadge type="encrypted" />
              <SecurityBadge type="masked" />
              <SecurityBadge type="protected" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  if (view === 'DASHBOARD') {
    return (
      <ScreenshotProtector>
        <div className="min-h-[100dvh] bg-background text-text_primary p-4 md:p-8 relative overflow-hidden">
          <Background3D variant="minimal" primaryColor={colors.primary} />

          <div className="relative z-10 max-w-5xl mx-auto">
            {/* Header */}
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row justify-between items-center mb-8 bg-surface/50 backdrop-blur-xl border border-border rounded-2xl p-4 gap-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${colors.bg} border ${colors.border}`}>
                  <Zap className={`w-5 h-5 ${colors.text}`} />
                </div>
                <span className="font-heading font-bold text-xl">FadeChat Protocol</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-border">
                  {user?.avatar && (
                    <img src={user.avatar} alt="" className="w-6 h-6 rounded-lg" />
                  )}
                  <span className={`text-sm ${colors.text}`}>{user?.username}</span>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="p-2 hover:bg-surface rounded-xl transition-colors group"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-5 h-5 text-text_muted group-hover:text-danger" />
                </button>
              </div>
            </motion.header>

            {/* Security Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 bg-surface/50 backdrop-blur border border-border rounded-2xl p-6"
            >
              <SecurityIndicator status={security} />
            </motion.div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Room Card */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface/80 backdrop-blur border border-border p-6 rounded-2xl hover:border-primary/50 transition-all group"
                data-testid="create-room-card"
              >
                <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border ${colors.border}`}>
                  <Users className={`w-7 h-7 ${colors.text}`} />
                </div>
                
                <h2 className="text-2xl font-heading font-bold mb-2">Create Uplink</h2>
                <p className="text-text_muted text-sm mb-6">
                  Initialize a new encrypted channel. Configure security settings before launch.
                </p>

                {/* Room Settings Preview */}
                <div className="mb-6 space-y-3">
                  <RoomThemeSelector 
                    currentTheme={roomTheme} 
                    onSelect={setRoomTheme}
                  />
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-warning" />
                    <span className="text-sm text-text_secondary">Auto-destruct:</span>
                    <select
                      value={autoDestructTime}
                      onChange={(e) => setAutoDestructTime(Number(e.target.value))}
                      className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm focus:border-primary outline-none"
                      data-testid="destruct-time-select"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={0}>Disabled</option>
                    </select>
                  </div>
                </div>

                <Button 
                  fullWidth 
                  onClick={handleCreateRoom}
                  loading={isLoading}
                  data-testid="create-room-btn"
                >
                  Initialize Secure Room
                </Button>
              </motion.div>

              {/* Join Room Card */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface/80 backdrop-blur border border-border p-6 rounded-2xl hover:border-secondary/50 transition-all group"
                data-testid="join-room-card"
              >
                <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-secondary/30">
                  <Hash className="w-7 h-7 text-secondary" />
                </div>
                
                <h2 className="text-2xl font-heading font-bold mb-2">Connect Uplink</h2>
                <p className="text-text_muted text-sm mb-6">
                  Enter a 6-character secure code to join an existing encrypted channel.
                </p>

                <div className="space-y-4">
                  <Input 
                    placeholder="ENTER CODE" 
                    className="text-center tracking-[0.5em] font-mono uppercase text-xl"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      if (error) setError('');
                    }}
                    data-testid="join-code-input"
                  />
                  
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-danger text-xs text-center bg-danger/10 p-2 rounded-lg"
                    >
                      {error}
                    </motion.p>
                  )}
                  
                  <Button 
                    fullWidth 
                    variant="secondary"
                    onClick={handleJoinRoom}
                    disabled={joinCode.length < 6}
                    loading={isLoading}
                    data-testid="join-room-btn"
                  >
                    Establish Connection
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </ScreenshotProtector>
    );
  }

  // --- CHAT VIEW ---
  return (
    <ScreenshotProtector>
      <div className="h-[100dvh] bg-background text-text_primary flex flex-col overflow-hidden">
        {/* Chat Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-surface/80 backdrop-blur-xl border-b border-border p-3 md:p-4 flex justify-between items-center z-10 shrink-0"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={handleLeaveRoom} 
              className="p-2 hover:bg-surface_elevated rounded-xl transition-colors"
              data-testid="leave-room-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold">Secure Channel</span>
                <span className="bg-accent/20 text-accent text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                  LIVE
                </span>
                {currentRoom && <ThemeBadge theme={currentRoom.theme} />}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-text_muted font-mono">
                <button 
                  onClick={copyRoomCode}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                  data-testid="copy-code-btn"
                >
                  <span>CODE:</span>
                  <span className={`${colors.text} font-bold`}>{currentRoom?.code}</span>
                  {codeCopied ? (
                    <Check className="w-3 h-3 text-accent" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {currentRoom?.participantCount}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <SecurityIndicator status={security} compact />
            
            {user?.id === currentRoom?.creatorId && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-surface_elevated rounded-xl transition-colors"
                data-testid="room-settings-btn"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.header>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && user?.id === currentRoom?.creatorId && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-surface border-b border-border overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <RoomThemeSelector
                  currentTheme={currentRoom?.theme || ROOM_THEMES[0]}
                  onSelect={(theme) => {
                    if (currentRoom) {
                      socketService.updateRoomSettings(currentRoom.id, undefined, theme);
                    }
                  }}
                />
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-text_muted hover:text-text_primary"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Host Warning */}
        {user?.id === currentRoom?.creatorId && (
          <div className="bg-danger/10 border-b border-danger/20 px-4 py-2 flex items-center justify-center gap-2 text-xs text-danger">
            <Activity className="w-3 h-3" />
            <span>You are the host. Leaving will terminate this channel for all participants.</span>
          </div>
        )}

        {/* Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          data-testid="chat-messages"
        >
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-text_muted"
            >
              <div className={`p-6 rounded-2xl ${colors.bg} border ${colors.border} mb-6`}>
                <Lock className={`w-12 h-12 ${colors.text}`} />
              </div>
              <p className="text-center font-mono text-sm">
                End-to-End Encrypted Channel
              </p>
              <p className="text-text_muted text-xs mt-2">
                Messages auto-destruct after {security.autoDestructTime}s
              </p>
              
              {/* Encryption fingerprint */}
              <div className="mt-6 bg-surface p-3 rounded-xl border border-border">
                <p className="text-[10px] text-text_muted mb-1">ENCRYPTION KEY FINGERPRINT</p>
                <p className="font-mono text-xs text-primary tracking-widest">
                  {currentRoom ? CryptoService.generateFingerprint(currentRoom.code) : '--------'}
                </p>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg, index) => {
              if (msg.type === MessageType.SYSTEM) {
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex justify-center my-2"
                  >
                    <span className="text-[10px] text-text_muted bg-surface px-4 py-1.5 rounded-full border border-border">
                      {msg.content}
                    </span>
                  </motion.div>
                );
              }
              
              const isMe = msg.senderId === user?.id;
              const showAvatar = index === 0 || messages[index - 1]?.senderId !== msg.senderId;
              
              return (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] md:max-w-[60%] flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    {showAvatar && msg.senderAvatar && (
                      <img 
                        src={msg.senderAvatar} 
                        alt="" 
                        className="w-8 h-8 rounded-lg shrink-0 mt-auto"
                      />
                    )}
                    {showAvatar && !msg.senderAvatar && (
                      <div className="w-8 h-8 rounded-lg bg-surface_elevated shrink-0 mt-auto" />
                    )}
                    {!showAvatar && <div className="w-8" />}
                    
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showAvatar && (
                        <span className="text-[10px] text-text_muted mb-1 px-1 font-mono">
                          {msg.senderName}
                        </span>
                      )}
                      
                      <div 
                        className={`
                          relative p-3 rounded-2xl text-sm group
                          ${isMe 
                            ? `bg-gradient-to-br ${colors.gradient} ${colors.border} border text-text_primary rounded-tr-sm` 
                            : 'bg-surface border border-border text-text_primary rounded-tl-sm'
                          }
                        `}
                      >
                        {/* Voice Message */}
                        {msg.type === MessageType.VOICE && msg.voice && (
                          <VoicePlayer 
                            audioData={msg.voice.data} 
                            duration={msg.voice.duration}
                            isOwnMessage={isMe}
                          />
                        )}
                        
                        {/* File/Image */}
                        {(msg.type === MessageType.FILE || msg.type === MessageType.IMAGE) && msg.file && (
                          <FilePreview
                            file={msg.file}
                            isOwnMessage={isMe}
                            onDownload={() => {
                              // Download logic
                              const link = document.createElement('a');
                              link.href = `data:${msg.file!.type};base64,${msg.file!.data}`;
                              link.download = msg.file!.name;
                              link.click();
                            }}
                          />
                        )}
                        
                        {/* Text Message */}
                        {msg.type === MessageType.TEXT && (
                          <span className="break-words">{msg.content}</span>
                        )}
                        
                        {/* Auto-destruct timer */}
                        {msg.expiresAt && msg.ttl > 0 && (
                          <div className="absolute -bottom-5 right-0 flex items-center gap-1">
                            <AutoDestructTimer 
                              expiresAt={msg.expiresAt} 
                              ttl={msg.ttl}
                              size="sm"
                              showWarning={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-text_muted"
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>{typingUsers.join(', ')} typing...</span>
            </motion.div>
          )}
        </div>

        {/* Voice Recorder */}
        <AnimatePresence>
          {showVoiceRecorder && (
            <div className="px-4 pb-2">
              <VoiceRecorder
                onSend={handleSendVoice}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* File Upload */}
        <AnimatePresence>
          {showFileUpload && (
            <div className="px-4 pb-2">
              <FileUpload
                onUpload={handleSendFile}
                onCancel={() => setShowFileUpload(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="bg-surface/80 backdrop-blur-xl border-t border-border p-3 md:p-4 shrink-0 safe-area-bottom">
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto items-end">
            {/* Attachment Buttons */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowVoiceRecorder(!showVoiceRecorder);
                  setShowFileUpload(false);
                }}
                className={`p-3 rounded-xl transition-all ${
                  showVoiceRecorder 
                    ? 'bg-danger text-white' 
                    : 'bg-surface_elevated hover:bg-primary/20 text-text_muted hover:text-primary'
                }`}
                disabled={!currentRoom?.settings?.allowVoiceMessages}
                data-testid="voice-btn"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFileUpload(!showFileUpload);
                  setShowVoiceRecorder(false);
                }}
                className={`p-3 rounded-xl transition-all ${
                  showFileUpload 
                    ? 'bg-primary text-background' 
                    : 'bg-surface_elevated hover:bg-primary/20 text-text_muted hover:text-primary'
                }`}
                disabled={!currentRoom?.settings?.allowFileSharing}
                data-testid="file-btn"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              className="flex-1 bg-surface_elevated border border-border rounded-xl px-4 py-3 text-text_primary text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Type encrypted message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              data-testid="message-input"
            />
            
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className={`
                p-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed
                ${colors.bg} border ${colors.border} ${colors.text}
                hover:shadow-lg
              `}
              style={{ boxShadow: newMessage.trim() ? `0 0 20px ${colors.primary}40` : 'none' }}
              data-testid="send-message-btn"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </ScreenshotProtector>
  );
};

export default App;
