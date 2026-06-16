import { useCallback, useState, useRef } from 'react';
import { Upload, ImagePlus, FileImage } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  compact?: boolean;
  disabled?: boolean;
}

export default function DropZone({
  onFilesSelected,
  multiple = false,
  label = '将图片拖拽到此处',
  sublabel = '或点击选择文件',
  compact = false,
  disabled = false,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'image/jpeg' || file.type === 'image/png'
    );

    if (droppedFiles.length > 0) {
      onFilesSelected(multiple ? droppedFiles : [droppedFiles[0]]);
    }
  }, [disabled, multiple, onFilesSelected]);

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300
          flex items-center justify-center gap-3 p-4
          ${isDragging
            ? 'dropzone-active'
            : 'border-surface-700 hover:border-accent-500/50 hover:bg-accent-500/5'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        <ImagePlus className={`w-5 h-5 ${isDragging ? 'text-accent-500' : 'text-surface-500'}`} />
        <span className={`text-sm font-medium ${isDragging ? 'text-accent-400' : 'text-surface-400'}`}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300
        flex flex-col items-center justify-center text-center
        ${compact ? 'p-6' : 'p-10'}
        ${isDragging
          ? 'dropzone-active'
          : 'border-surface-700 hover:border-accent-500/50 hover:bg-accent-500/5'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className={`
        w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300
        ${isDragging
          ? 'bg-accent-500/20 shadow-lg shadow-accent-500/20'
          : 'bg-surface-800'
        }
      `}>
        {isDragging ? (
          <Upload className="w-7 h-7 text-accent-400 animate-bounce" />
        ) : (
          <FileImage className="w-7 h-7 text-surface-400" />
        )}
      </div>

      <p className={`text-base font-semibold mb-1 transition-colors duration-300
        ${isDragging ? 'text-accent-400' : 'text-surface-200'}
      `}>
        {label}
      </p>
      <p className={`text-sm transition-colors duration-300
        ${isDragging ? 'text-accent-500/70' : 'text-surface-500'}
      `}>
        {sublabel}
      </p>
      <p className="text-xs text-surface-600 mt-2">
        支持 JPEG、PNG 格式
      </p>
    </div>
  );
}
