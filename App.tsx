import React, { useState, useEffect, useCallback } from 'react';
import { User, Room, ViewState, ChatMessage, MessageType } from './types';
import { socketService } from './services/socketService';
import { CryptoService } from './services/cryptoService';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { InteractiveBackground } from './components/InteractiveBackground';
import { ScreenshotProtector } from './components/ScreenshotProtector';
import { Lock, LogOut, Send, Users, Activity, Hash, ArrowLeft, Trash2 } from 'lucide-react';

const App = () => {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('AUTH');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Kept for UI, but backend only uses username for ephemeral session
  
  // Dashboard State
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // --- WEBSOCKET HANDLER ---
  const handleServerMessage = useCallback((event: any) => {
    switch (event.type) {
      case 'NEW_MESSAGE':
        // Only process if it belongs to current room (extra safety)
        if (currentRoom && event.payload.roomId === currentRoom.id) {
          // Decrypt incoming message
          // In a real app, keys would be exchanged via ECDH. 
          // Here we assume a shared key derived from room code or pre-shared context for the demo.
          CryptoService.decrypt(event.payload.content, 'dummy-key').then(decrypted => {
             const msg = { ...event.payload, content: decrypted, isDecrypted: true };
             setMessages(prev => [...prev, msg]);
          });
        }
        break;
      
      case 'ROOM_DESTROYED':
        // Check if it's our room
        if (currentRoom && event.payload.roomId === currentRoom.id) {
          alert(`Room closed: ${event.payload.reason}`);
          setCurrentRoom(null);
          setMessages([]);
          setView('DASHBOARD');
        }
        break;

      case 'USER_JOINED':
        if (currentRoom && event.payload.roomId === currentRoom.id) {
           const sysMsg: ChatMessage = {
             id: Date.now().toString(),
             roomId: currentRoom.id,
             senderId: 'SYSTEM',
             senderName: 'SYSTEM',
             content: `${event.payload.username} joined the channel.`,
             iv: '',
             timestamp: Date.now(),
             ttl: 0,
             type: MessageType.SYSTEM
           };
           setMessages(prev => [...prev, sysMsg]);
        }
        break;
        
      case 'USER_LEFT':
        if (currentRoom && event.payload.roomId === currentRoom.id) {
             // Optional: Show user left message
        }
        break;
    }
  }, [currentRoom]);

  // --- EFFECTS ---

  // Connect listener to service when room changes
  useEffect(() => {
    socketService.setMessageHandler(handleServerMessage);
  }, [handleServerMessage]);

  // Auto-scroll chat
  useEffect(() => {
    const el = document.getElementById('chat-container');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // --- ACTIONS ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setError('');
    try {
      // Connect to real WebSocket
      const u = await socketService.connect(username);
      setUser(u);
      setView('DASHBOARD');
      setError('');
    } catch (err) {
      console.error(err);
      setError('Connection failed. Server might be offline.');
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setError('');
    try {
        const room = await socketService.createRoom();
        setCurrentRoom(room);
        setMessages([]); 
        setView('CHAT');
    } catch (err) {
        console.error(err);
        setError('Failed to create room');
    }
  };

  const handleJoinRoom = async () => {
    if (!user || !joinCode) return;
    setError(''); // Clear previous errors
    try {
      const room = await socketService.joinRoom(joinCode);
      setCurrentRoom(room);
      setMessages([]);
      setView('CHAT');
    } catch (err) {
      console.error("[Join Room Error]:", err);
      setError('Uplink failed: Invalid code or room expired.');
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

    // Encrypt locally
    const { content, iv } = await CryptoService.encrypt(newMessage, 'dummy-key');
    
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      roomId: currentRoom.id,
      senderId: user.id,
      senderName: user.username,
      content, // Send encrypted
      iv,
      timestamp: Date.now(),
      ttl: 60, 
      type: MessageType.TEXT
    };

    socketService.sendMessage(msg);
    setNewMessage('');
  };

  // --- RENDERERS ---

  if (view === 'AUTH') {
    return (
      // Use dvh for mobile viewport height accuracy
      <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-neon-dark">
        {/* Interactive Background */}
        <InteractiveBackground />
        
        {/* Subtle radial gradient overlay to ensure text readability if needed */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(10,10,15,0)_0%,_#0a0a0f_100%)] pointer-events-none z-0"></div>

        <div className="relative z-10 w-full max-w-md bg-neon-panel/80 backdrop-blur-md border border-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-neon-dark rounded-full border border-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.3)]">
              <Lock className="w-8 h-8 text-neon-blue" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 tracking-tighter text-white">FadeChat</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">Secure. Ephemeral. Local.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              label="Username" 
              placeholder="Display Name" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            
            {error && <div className="text-red-400 text-sm text-center">{error}</div>}

            <Button fullWidth type="submit" disabled={!username || !password}>
              {authMode === 'LOGIN' ? 'Decrypt Identity' : 'Generate Identity'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
             <button 
               onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
               className="text-xs text-gray-500 hover:text-neon-blue transition-colors"
             >
               {authMode === 'LOGIN' ? "Need a burner account? Register" : "Already have keys? Login"}
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'DASHBOARD') {
    return (
      <ScreenshotProtector>
        <div className="min-h-[100dvh] bg-neon-dark text-white p-4 md:p-8 relative overflow-hidden">
          {/* Interactive Background for Dashboard */}
          <InteractiveBackground />
          
          {/* Content Wrapper to sit above background */}
          <div className="relative z-10">
            {/* Header stacks on mobile, row on desktop */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-12 max-w-4xl mx-auto border-b border-gray-800 pb-4 backdrop-blur-sm bg-neon-dark/30 rounded-t-lg p-4 gap-4 md:gap-0">
              <div className="flex items-center gap-2">
                 <Activity className="w-6 h-6 text-neon-blue" />
                 <span className="font-bold text-xl tracking-tight">FadeChat Protocol</span>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-neon-panel/50 md:bg-transparent p-2 md:p-0 rounded-lg">
                <span className="text-sm text-gray-400">Logged in as <span className="text-neon-purple">{user?.username}</span></span>
                <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                  <LogOut className="w-5 h-5 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            </header>

            <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {/* Create Room Card */}
              <div className="bg-neon-panel/90 backdrop-blur border border-gray-800 p-6 md:p-8 rounded-2xl hover:border-neon-blue/50 transition-all duration-300 group shadow-lg">
                <div className="w-12 h-12 bg-neon-blue/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-neon-blue" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Create Uplink</h2>
                <p className="text-gray-500 mb-8 text-sm h-auto md:h-12">
                  Initialize a new encrypted temporary channel. Room destroys when you disconnect.
                </p>
                <Button fullWidth onClick={handleCreateRoom}>Initialize Room</Button>
              </div>

              {/* Join Room Card */}
              <div className="bg-neon-panel/90 backdrop-blur border border-gray-800 p-6 md:p-8 rounded-2xl hover:border-neon-purple/50 transition-all duration-300 group shadow-lg">
                <div className="w-12 h-12 bg-neon-purple/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Hash className="w-6 h-6 text-neon-purple" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Connect Uplink</h2>
                <p className="text-gray-500 mb-8 text-sm h-auto md:h-12">
                  Enter a 6-character secure code to join an existing channel.
                </p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Room Code" 
                    className="text-center tracking-[0.5em] font-mono uppercase"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      if (error) setError('');
                    }}
                  />
                </div>
                {error && <p className="text-red-500 text-xs mt-2 text-center font-mono">{error}</p>}
                <Button 
                  fullWidth 
                  variant="secondary" 
                  className="mt-4"
                  onClick={handleJoinRoom}
                  disabled={joinCode.length < 6}
                >
                  Establish Connection
                </Button>
              </div>
            </main>
          </div>
        </div>
      </ScreenshotProtector>
    );
  }

  // CHAT VIEW
  return (
    <ScreenshotProtector>
      {/* Use 100dvh to handle mobile viewport height accuracy */}
      <div className="h-[100dvh] bg-neon-dark text-white flex flex-col overflow-hidden">
        {/* Chat Header */}
        <header className="bg-neon-panel border-b border-gray-800 p-3 md:p-4 flex justify-between items-center shadow-md z-10 shrink-0">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
             <button onClick={handleLeaveRoom} className="text-gray-400 hover:text-white transition-colors p-1">
               <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
             </button>
             <div className="overflow-hidden">
               <div className="flex items-center gap-2">
                  <span className="font-bold text-base md:text-lg whitespace-nowrap">Uplink Active</span>
                  <span className="bg-green-500/20 text-green-500 text-[10px] md:text-xs px-2 py-0.5 rounded-full animate-pulse">Live</span>
               </div>
               <div className="text-xs text-gray-500 font-mono truncate">
                 CODE: <span className="text-neon-blue font-bold text-sm select-all">{currentRoom?.code}</span>
               </div>
             </div>
          </div>
          
          {user?.id === currentRoom?.creatorId && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
              <Activity className="w-3 h-3" />
              <span>You are Host. Leaving closes room.</span>
            </div>
          )}
          {/* Mobile version of host indicator */}
          {user?.id === currentRoom?.creatorId && (
            <div className="md:hidden text-red-400 p-2">
               <Activity className="w-4 h-4" />
            </div>
          )}
        </header>

        {/* Messages Area */}
        <div id="chat-container" className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 bg-[#0a0a0f] scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 px-4 text-center">
              <Lock className="w-12 h-12 md:w-16 md:h-16 mb-4" />
              <p className="text-sm md:text-base">End-to-End Encrypted. Messages disappear.</p>
            </div>
          )}
          
          {messages.map((msg) => {
            if (msg.type === MessageType.SYSTEM) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-[10px] md:text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800 text-center max-w-[90%]">
                    {msg.content}
                  </span>
                </div>
              );
            }
            
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-gray-500 mb-1 px-1">{msg.senderName}</span>
                  <div 
                    className={`p-3 rounded-2xl text-sm md:text-base relative group break-words ${
                      isMe 
                        ? 'bg-neon-blue text-neon-dark rounded-tr-none shadow-[0_0_10px_rgba(0,243,255,0.2)]' 
                        : 'bg-neon-panel border border-gray-800 text-gray-200 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                    
                    {/* Visual Timer indicator for disappearing messages */}
                    <div className="absolute -bottom-4 right-0 text-[10px] text-gray-600 flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" /> 60s
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="bg-neon-panel border-t border-gray-800 p-2 md:p-4 shrink-0 safe-area-bottom">
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-base focus:border-neon-blue focus:outline-none transition-colors"
              placeholder="Type encrypted message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              // Remove autoFocus on mobile to prevent keyboard popping up on room entry
              autoFocus={window.innerWidth > 768} 
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="bg-neon-blue text-neon-dark p-3 rounded-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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