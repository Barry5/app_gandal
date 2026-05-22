'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  X,
  Video,
  FileText,
  Image,
  File,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  FileCheck,
  Mic,
} from 'lucide-react';

interface UploadZoneProps {
  type: 'video' | 'image' | 'pdf' | 'audio';
  value?: string;
  onChange: (url: string, metadata?: any) => void;
  label?: string;
}

const typeConfig = {
  video: {
    icon: Video,
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-600',
    borderColor: 'border-indigo-300',
    hoverColor: 'hover:border-indigo-500',
    accept: 'video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi',
    maxSize: 500 * 1024 * 1024,
    label: 'Vidéo',
    formats: 'MP4, WebM, MOV, AVI (max 500MB)',
  },
  image: {
    icon: Image,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-300',
    hoverColor: 'hover:border-purple-500',
    accept: 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp',
    maxSize: 5 * 1024 * 1024,
    label: 'Image',
    formats: 'JPG, PNG, GIF, WebP (max 5MB)',
  },
  pdf: {
    icon: FileText,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-300',
    hoverColor: 'hover:border-orange-500',
    accept: 'application/pdf,.pdf',
    maxSize: 50 * 1024 * 1024,
    label: 'Document PDF',
    formats: 'PDF (max 50MB)',
  },
  audio: {
    icon: Mic,
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-300',
    hoverColor: 'hover:border-emerald-500',
    accept: 'audio/mpeg,audio/wav,audio/ogg,audio/mp3,.mp3,.wav,.ogg',
    maxSize: 100 * 1024 * 1024,
    label: 'Audio',
    formats: 'MP3, WAV, OGG (max 100MB)',
  },
};

export default function UploadZone({ type, value, onChange, label }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = typeConfig[type];
  const IconComponent = config.icon;

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    if (file.size > config.maxSize) {
      const errorMsg = `Le fichier dépasse la taille maximale de ${(config.maxSize / 1024 / 1024).toFixed(0)}MB`;
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate upload with progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      clearInterval(progressInterval);
      setProgress(100);

      // Create local URL for the uploaded file
      const url = URL.createObjectURL(file);
      
      // Small delay to show 100%
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setIsUploading(false);
      onChange(url, { 
        name: file.name, 
        size: file.size, 
        type: file.type 
      });
      toast.success(`${config.label} uploadé avec succès`);
      
    } catch (err) {
      setIsUploading(false);
      setError('Erreur lors de l\'upload');
      toast.error('Erreur lors de l\'upload');
    }
  }, [config, onChange, config.label]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleRemove = useCallback(() => {
    if (value) {
      // Don't revoke if it's a blob URL we created, only external URLs
      if (!value.startsWith('blob:')) {
        // It's an external URL, just clear
      }
    }
    onChange('', undefined);
    setProgress(0);
    setError(null);
  }, [value, onChange]);

  // Show file preview if uploaded
  const hasFile = value && value.startsWith('blob:');

  if (hasFile) {
    return (
      <div className="relative p-4 border-2 border-emerald-500 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
            {type === 'video' && <Video className={`w-6 h-6 ${config.textColor}`} />}
            {type === 'image' && <Image className={`w-6 h-6 ${config.textColor}`} />}
            {type === 'pdf' && <FileText className={`w-6 h-6 ${config.textColor}`} />}
            {type === 'audio' && <Mic className={`w-6 h-6 ${config.textColor}`} />}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">{config.label}</p>
            <p className="text-sm text-emerald-600">Fichier uploadé avec succès</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* Preview for images and videos */}
        {(type === 'image' || type === 'video') && value && (
          <div className="mt-3">
            {type === 'image' ? (
              <img src={value} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
            ) : (
              <video src={value} className="w-full h-32 object-cover rounded-lg" controls />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? `${config.borderColor} bg-indigo-50 dark:bg-indigo-900/20`
            : error
              ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
              : `border-gray-300 dark:border-gray-600 ${config.hoverColor} hover:bg-gray-50 dark:hover:bg-gray-800/50`
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className={`w-10 h-10 ${config.textColor} mx-auto animate-spin`} />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload en cours... {Math.round(progress)}%
            </p>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full ${config.textColor.replace('text-', 'bg-')}`}
              />
            </div>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <p className="text-xs text-gray-500">Cliquez pour réessayer</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center mx-auto`}>
              <IconComponent className={`w-6 h-6 ${config.textColor}`} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Glissez et déposez ou cliquez pour uploader
            </p>
            <p className="text-xs text-gray-500">{config.formats}</p>
          </div>
        )}
      </div>
    </div>
  );
}