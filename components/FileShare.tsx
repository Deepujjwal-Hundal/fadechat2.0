import React, { useRef, useState } from 'react';
import { FileText, Image, Download, X, Upload, File, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileAttachment } from '../types';

interface FileUploadProps {
  onUpload: (file: File) => void;
  onCancel: () => void;
  disabled?: boolean;
  maxSize?: number; // in bytes
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onUpload, 
  onCancel, 
  disabled,
  maxSize = 10 * 1024 * 1024 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    
    if (file.size > maxSize) {
      setError(`File too large. Max size: ${(maxSize / (1024 * 1024)).toFixed(0)}MB`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
      setSelectedFile(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    return FileText;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-surface_elevated border border-border rounded-xl p-4"
      data-testid="file-upload"
    >
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              ${isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50 hover:bg-surface'
              }
            `}
          >
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-text_muted'}`} />
            <p className="text-text_secondary text-sm mb-1">
              {isDragging ? 'Drop file here' : 'Click or drag file to upload'}
            </p>
            <p className="text-text_muted text-xs">
              Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
            </p>
            {error && (
              <p className="text-danger text-xs mt-2">{error}</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 bg-surface rounded-lg p-3">
              {selectedFile.type.startsWith('image/') ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface_elevated">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-surface_elevated flex items-center justify-center">
                  <File className="w-6 h-6 text-primary" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text_primary truncate">{selectedFile.name}</p>
                <p className="text-xs text-text_muted">{formatSize(selectedFile.size)}</p>
              </div>

              <button
                onClick={() => setSelectedFile(null)}
                className="p-1 hover:text-danger transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-primary">
              <Lock className="w-3 h-3" />
              <span>File will be encrypted before sending</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 rounded-lg border border-border text-text_secondary hover:bg-surface transition-colors"
                data-testid="cancel-upload-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={disabled}
                className="flex-1 py-2 px-4 rounded-lg bg-primary text-background font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
                data-testid="confirm-upload-btn"
              >
                Send Encrypted
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface FilePreviewProps {
  file: FileAttachment;
  isOwnMessage?: boolean;
  onDownload: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, isOwnMessage, onDownload }) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = file.type.startsWith('image/');

  return (
    <div 
      className={`rounded-lg overflow-hidden ${isOwnMessage ? 'bg-background/10' : 'bg-surface'}`}
      data-testid="file-preview"
    >
      {isImage ? (
        <div className="max-w-[250px]">
          <img
            src={`data:${file.type};base64,${file.data}`}
            alt={file.name}
            className="w-full rounded-lg"
          />
          <div className="p-2 flex items-center justify-between">
            <span className="text-xs truncate max-w-[150px]">{file.name}</span>
            <button
              onClick={onDownload}
              className="p-1 hover:text-primary transition-colors"
              data-testid="download-file-btn"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 min-w-[200px]">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwnMessage ? 'bg-background/20' : 'bg-primary/20'}`}>
            <FileText className={`w-5 h-5 ${isOwnMessage ? 'text-background' : 'text-primary'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm truncate ${isOwnMessage ? 'text-background' : 'text-text_primary'}`}>
              {file.name}
            </p>
            <p className={`text-xs ${isOwnMessage ? 'text-background/70' : 'text-text_muted'}`}>
              {formatSize(file.size)}
            </p>
          </div>
          <button
            onClick={onDownload}
            className={`p-2 rounded-lg transition-colors ${
              isOwnMessage 
                ? 'hover:bg-background/20 text-background' 
                : 'hover:bg-primary/20 text-primary'
            }`}
            data-testid="download-file-btn"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
