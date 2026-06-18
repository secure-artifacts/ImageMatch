import { useCallback, useState, useRef } from 'react';
import { Upload, ImagePlus, FileImage, FolderOpen } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onFoldersSelected?: (folders: FolderEntry[]) => void;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  compact?: boolean;
  disabled?: boolean;
}

export interface FolderEntry {
  name: string;
  files: File[];
}

/** 递归读取 FileSystemDirectoryEntry 中的所有图片文件 */
async function readFolderEntry(entry: FileSystemDirectoryEntry): Promise<File[]> {
  return new Promise((resolve) => {
    const reader = entry.createReader();
    const allFiles: File[] = [];

    const readBatch = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(allFiles);
          return;
        }
        for (const e of entries) {
          if (e.isFile) {
            const fileEntry = e as FileSystemFileEntry;
            await new Promise<void>((res) => {
              fileEntry.file((file) => {
                if (file.type === 'image/jpeg' || file.type === 'image/png') {
                  allFiles.push(file);
                }
                res();
              });
            });
          } else if (e.isDirectory) {
            // 递归处理子文件夹
            const subFiles = await readFolderEntry(e as FileSystemDirectoryEntry);
            allFiles.push(...subFiles);
          }
        }
        readBatch(); // 继续读取（readEntries 每次最多返回100条）
      });
    };
    readBatch();
  });
}

export default function DropZone({
  onFilesSelected,
  onFoldersSelected,
  multiple = false,
  label = '将图片拖拽到此处',
  sublabel = '或点击选择文件',
  compact = false,
  disabled = false,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingFolder, setIsDraggingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
      // 检测是否拖拽的是文件夹
      const items = Array.from(e.dataTransfer.items);
      const hasFolder = items.some((item) => {
        const entry = item.webkitGetAsEntry?.();
        return entry?.isDirectory;
      });
      setIsDraggingFolder(hasFolder);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsDraggingFolder(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsDraggingFolder(false);

    if (disabled) return;

    const items = Array.from(e.dataTransfer.items);
    const folders: FolderEntry[] = [];
    const looseFiles: File[] = [];

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory && onFoldersSelected) {
        // 是文件夹
        const files = await readFolderEntry(entry as FileSystemDirectoryEntry);
        if (files.length > 0) {
          folders.push({ name: entry.name, files });
        }
      } else if (entry?.isFile) {
        // 是单个文件
        const file = item.getAsFile();
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
          looseFiles.push(file);
        }
      }
    }

    if (folders.length > 0 && onFoldersSelected) {
      onFoldersSelected(folders);
    }
    if (looseFiles.length > 0) {
      onFilesSelected(multiple ? looseFiles : [looseFiles[0]]);
    }
  }, [disabled, multiple, onFilesSelected, onFoldersSelected]);

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const handleFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) folderInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
    e.target.value = '';
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onFoldersSelected) return;
    const allFiles = Array.from(e.target.files || []);
    if (allFiles.length === 0) return;

    // 按文件夹分组（webkitRelativePath = "folderName/filename.jpg"）
    const folderMap = new Map<string, File[]>();
    for (const file of allFiles) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') continue;
      const parts = file.webkitRelativePath.split('/');
      const folderName = parts[0];
      if (!folderMap.has(folderName)) folderMap.set(folderName, []);
      folderMap.get(folderName)!.push(file);
    }

    const folders: FolderEntry[] = Array.from(folderMap.entries()).map(([name, files]) => ({ name, files }));
    if (folders.length > 0) onFoldersSelected(folders);
    e.target.value = '';
  };

  const draggingClass = isDragging
    ? isDraggingFolder
      ? 'border-purple-400/80 bg-purple-500/10 shadow-lg shadow-purple-500/10'
      : 'dropzone-active'
    : 'border-surface-700 hover:border-accent-500/50 hover:bg-accent-500/5';

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
          ${draggingClass}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple={multiple} onChange={handleFileChange} className="hidden" />
        <ImagePlus className={`w-5 h-5 ${isDragging ? 'text-accent-500' : 'text-surface-500'}`} />
        <span className={`text-sm font-medium ${isDragging ? 'text-accent-400' : 'text-surface-400'}`}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        rounded-2xl border-2 border-dashed transition-all duration-300
        flex flex-col items-center justify-center text-center p-10
        ${draggingClass}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple={multiple} onChange={handleFileChange} className="hidden" />
      {/* 文件夹选择器：支持多个文件夹 */}
      <input ref={folderInputRef} type="file" onChange={handleFolderChange} className="hidden"
        {...{ webkitdirectory: '', mozdirectory: '', directory: '' } as any} />

      <div className={`
        w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300
        ${isDragging
          ? isDraggingFolder
            ? 'bg-purple-500/20 shadow-lg shadow-purple-500/20'
            : 'bg-accent-500/20 shadow-lg shadow-accent-500/20'
          : 'bg-surface-800'
        }
      `}>
        {isDragging ? (
          isDraggingFolder
            ? <FolderOpen className="w-7 h-7 text-purple-400 animate-bounce" />
            : <Upload className="w-7 h-7 text-accent-400 animate-bounce" />
        ) : (
          <FileImage className="w-7 h-7 text-surface-400" />
        )}
      </div>

      <p className={`text-base font-semibold mb-1 transition-colors duration-300
        ${isDragging ? (isDraggingFolder ? 'text-purple-400' : 'text-accent-400') : 'text-surface-200'}
      `}>
        {isDragging && isDraggingFolder ? '松开以上传文件夹' : label}
      </p>
      <p className={`text-sm transition-colors duration-300
        ${isDragging ? 'text-accent-500/70' : 'text-surface-500'}
      `}>
        {sublabel}
      </p>
      <p className="text-xs text-surface-600 mt-2">支持 JPEG、PNG 格式</p>

      {/* 操作按钮 */}
      {!disabled && (
        <div className="flex gap-3 mt-5">
          <button
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white text-sm transition-all border border-surface-700 hover:border-surface-600"
          >
            <ImagePlus className="w-4 h-4" />
            选择图片
          </button>
          {onFoldersSelected && (
            <button
              onClick={handleFolderClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 text-sm transition-all border border-purple-500/20 hover:border-purple-500/40"
            >
              <FolderOpen className="w-4 h-4" />
              选择文件夹
            </button>
          )}
        </div>
      )}
    </div>
  );
}
