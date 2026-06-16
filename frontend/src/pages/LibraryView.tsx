import { useState, useEffect, useCallback } from 'react';
import { ImageIcon, Trash2, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import DropZone from '../components/DropZone';
import { listLibrary, uploadToLibrary, deleteLibraryImage, getImageUrl, type LibraryImage } from '../api';

interface LibraryViewProps {
  onLibraryChange: () => void;
}

export default function LibraryView({ onLibraryChange }: LibraryViewProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listLibrary();
      setImages(data.images);
    } catch (err: any) {
      setError('加载图库失败：' + (err.message || '未知错误'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = useCallback(async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setUploadResult(null);

    try {
      const response = await uploadToLibrary(files, (percent) => {
        setUploadProgress(percent);
      });

      setUploadResult(
        `成功上传 ${response.uploaded} 张图片` +
        (response.failed > 0 ? `（${response.failed} 张失败）` : '')
      );

      // Refresh the library
      await fetchImages();
      onLibraryChange();

      // Clear success message after 5s
      setTimeout(() => setUploadResult(null), 5000);
    } catch (err: any) {
      setError('上传失败：' + (err.message || '未知错误'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [fetchImages, onLibraryChange]);

  const handleDelete = useCallback(async (imageId: string) => {
    setDeletingId(imageId);
    try {
      await deleteLibraryImage(imageId);
      setImages((prev) => prev.filter((img) => img.image_id !== imageId));
      onLibraryChange();
    } catch (err: any) {
      setError('删除失败：' + (err.message || '未知错误'));
    } finally {
      setDeletingId(null);
    }
  }, [onLibraryChange]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">图片库</h2>
          </div>
          <p className="text-surface-400 text-sm ml-[52px]">
            管理你的图片集合 · 共 {images.length} 张图片
          </p>
        </div>
        <button
          onClick={fetchImages}
          disabled={isLoading}
          className="p-2.5 rounded-xl text-surface-400 hover:text-white bg-surface-800/50 hover:bg-surface-700/50 transition-all disabled:opacity-50"
          title="刷新"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Upload zone */}
      <div className="mb-6">
        <DropZone
          onFilesSelected={handleUpload}
          multiple={true}
          label="拖拽图片到此处添加到图库"
          sublabel="或点击选择文件 · 支持批量上传"
          disabled={isUploading}
        />

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-3 glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-4 h-4 text-accent-400 animate-pulse" />
              <span className="text-sm text-surface-300 font-medium">
                正在上传并处理中...
              </span>
              <span className="text-sm text-accent-400 font-bold ml-auto">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div
                className="h-full upload-progress-bar rounded-full transition-all duration-300"
                style={{ width: `${Math.max(uploadProgress, 5)}%` }}
              />
            </div>
            <p className="text-xs text-surface-500 mt-2">
              正在使用 ResNet50 提取图像特征向量...
            </p>
          </div>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 glass rounded-xl p-4 border border-red-500/20 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-500/70 hover:text-red-400 mt-1"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {uploadResult && (
        <div className="mb-4 glass rounded-xl p-4 border border-green-500/20 bg-green-500/5">
          <p className="text-sm text-green-400 font-medium">{uploadResult}</p>
        </div>
      )}

      {/* Image Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden bg-gradient-card border border-white/5"
            >
              <div className="aspect-square bg-surface-800 skeleton-shimmer" />
              <div className="p-2">
                <div className="h-3 bg-surface-800 rounded w-3/4 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="w-24 h-24 rounded-3xl bg-surface-800/50 flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="w-12 h-12 text-surface-600" />
          </div>
          <h3 className="text-xl font-semibold text-surface-200 mb-2">还没有图片</h3>
          <p className="text-surface-400 text-sm max-w-md mx-auto">
            将图片拖拽到上方的上传区域，或者点击上传区域选择文件，
            开始构建你的图片库吧。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div
              key={image.image_id}
              className="image-card group relative rounded-xl overflow-hidden bg-gradient-card border border-white/5 animate-scale-in"
              style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={getImageUrl(image.image_url)}
                  alt={image.filename}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />

                {/* Hover overlay with delete */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.image_id);
                    }}
                    disabled={deletingId === image.image_id}
                    className="p-3 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-all backdrop-blur-sm border border-red-500/20 disabled:opacity-50"
                  >
                    {deletingId === image.image_id ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Filename */}
              <div className="p-2">
                <p className="text-xs text-surface-400 truncate" title={image.filename}>
                  {image.filename}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
