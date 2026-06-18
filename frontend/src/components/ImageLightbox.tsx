import { useEffect, useCallback } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string;
  filename: string;
  score?: number;
  onClose: () => void;
}

export default function ImageLightbox({ imageUrl, filename, score, onClose }: ImageLightboxProps) {
  // 按 Esc 关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // 阻止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // 降级方案：直接跳转
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      link.click();
    }
  }, [imageUrl, filename]);

  return (
    /* 遮罩层 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* 弹窗容器，点击内部不关闭 */}
      <div
        className="relative flex flex-col max-w-5xl max-h-[90vh] w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl"
          style={{ background: 'rgba(15,15,20,0.9)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{filename}</p>
            {score !== undefined && (
              <p className="text-xs text-surface-400 mt-0.5">
                相似度：<span className={`font-bold ${score >= 90 ? 'text-green-400' : score >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {score.toFixed(1)}%
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            {/* 在新标签页打开 */}
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white text-xs transition-all border border-surface-700"
              title="在新标签页打开"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              新窗口
            </a>

            {/* 下载按钮 */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500/20 hover:bg-accent-500/30 text-accent-400 hover:text-accent-300 text-xs transition-all border border-accent-500/30"
              title="下载图片"
            >
              <Download className="w-3.5 h-3.5" />
              下载
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-surface-800 hover:bg-red-500/20 text-surface-400 hover:text-red-400 transition-all border border-surface-700"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 图片区域 */}
        <div
          className="flex items-center justify-center rounded-b-2xl overflow-hidden"
          style={{ background: 'rgba(10,10,15,0.95)', maxHeight: 'calc(90vh - 70px)' }}
        >
          <img
            src={imageUrl}
            alt={filename}
            className="max-w-full max-h-full object-contain"
            style={{ maxHeight: 'calc(90vh - 70px)' }}
          />
        </div>
      </div>
    </div>
  );
}
