import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
      reset();
    }
  };

  const reset = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const handleCancel = () => {
    reset();
    onCancel();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex items-center gap-3 bg-surface_elevated border border-border rounded-xl p-3"
      data-testid="voice-recorder"
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}
      
      <AnimatePresence mode="wait">
        {!isRecording && !audioBlob && (
          <motion.button
            key="start"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={startRecording}
            disabled={disabled}
            className="p-3 bg-danger rounded-full hover:bg-danger/80 transition-colors disabled:opacity-50"
            data-testid="start-recording-btn"
          >
            <Mic className="w-5 h-5 text-white" />
          </motion.button>
        )}

        {isRecording && (
          <motion.button
            key="stop"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={stopRecording}
            className="p-3 bg-danger rounded-full animate-pulse"
            data-testid="stop-recording-btn"
          >
            <Square className="w-5 h-5 text-white" />
          </motion.button>
        )}

        {audioBlob && !isRecording && (
          <motion.button
            key="play"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={togglePlayback}
            className="p-3 bg-primary rounded-full hover:bg-primary/80 transition-colors"
            data-testid="play-recording-btn"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-background" />
            ) : (
              <Play className="w-5 h-5 text-background" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex-1">
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-danger rounded-full animate-pulse" />
            <span className="text-danger font-mono text-sm">{formatTime(recordingTime)}</span>
            <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-danger"
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 60, ease: 'linear' }}
              />
            </div>
          </div>
        )}
        
        {audioBlob && !isRecording && (
          <div className="flex items-center gap-2">
            <span className="text-primary font-mono text-sm">{formatTime(recordingTime)}</span>
            <div className="flex-1 h-8 bg-surface rounded-lg flex items-center px-2">
              {/* Waveform visualization placeholder */}
              <div className="flex items-center gap-0.5 h-full">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary/60 rounded-full"
                    style={{ height: `${Math.random() * 80 + 20}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {!isRecording && !audioBlob && (
          <span className="text-text_muted text-sm">Tap to record voice message</span>
        )}
      </div>

      {audioBlob && (
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="p-2 text-text_muted hover:text-danger transition-colors"
            data-testid="cancel-recording-btn"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleSend}
            className="p-2 bg-primary rounded-lg hover:bg-primary/80 transition-colors"
            data-testid="send-voice-btn"
          >
            <Send className="w-5 h-5 text-background" />
          </button>
        </div>
      )}

      {isRecording && (
        <button
          onClick={handleCancel}
          className="p-2 text-text_muted hover:text-danger transition-colors"
          data-testid="cancel-during-recording-btn"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </motion.div>
  );
};

interface VoicePlayerProps {
  audioData: string;
  duration: number;
  isOwnMessage?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioData, duration, isOwnMessage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(`data:audio/webm;base64,${audioData}`);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.ontimeupdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    return () => {
      audio.pause();
    };
  }, [audioData]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`flex items-center gap-3 min-w-[200px] ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      data-testid="voice-player"
    >
      <button
        onClick={togglePlay}
        className={`p-2 rounded-full ${isOwnMessage ? 'bg-background/20' : 'bg-primary/20'}`}
        data-testid="voice-play-btn"
      >
        {isPlaying ? (
          <Pause className={`w-4 h-4 ${isOwnMessage ? 'text-background' : 'text-primary'}`} />
        ) : (
          <Play className={`w-4 h-4 ${isOwnMessage ? 'text-background' : 'text-primary'}`} />
        )}
      </button>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 bg-surface/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${isOwnMessage ? 'bg-background/50' : 'bg-primary/50'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono ${isOwnMessage ? 'text-background/70' : 'text-text_muted'}`}>
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default VoiceRecorder;
