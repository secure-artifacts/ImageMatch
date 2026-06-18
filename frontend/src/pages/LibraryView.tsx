import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageIcon, Trash2, Upload, RefreshCw, AlertCircle, FolderOpen, CheckCircle, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import DropZone, { type FolderEntry } from '../components/DropZone';
import { listLibrary, uploadToLibrary, deleteLibraryImage, getImageUrl, type LibraryImage } from '../api';

interface LibraryViewProps {
  onLibraryChange: () => void;
}

const PAGE_LIMIT = 20; // 每页加载数量
const BATCH_SIZE = 8;  // 每批上传数量

interface FolderQueueItem {
  id: string;
  name: string;
  files: File[];
  total: number;
  uploaded: number;
  failed: number;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  progress: number;
  expanded: boolean;
}

export default function LibraryView({ onLibraryChange }: LibraryViewProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [folderQueue, setFolderQueue] = useState<FolderQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // 无限滚动哨兵元素
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── 加载第一页 ─────────────────────────────────────────────
  const fetchFirstPage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listLibrary(1, PAGE_LIMIT);
      setImages(data.images);
      setTotalCount(data.total);
      setHasMore(data.has_more);
      setCurrentPage(1);
    } catch (err: any) {
      setError('加载图库失败：' + (err.message || '未知错误'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 加载下一页（追加到列表末尾） ───────────────────────────
  const fetchNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await listLibrary(nextPage, PAGE_LIMIT);
      setImages((prev) => [...prev, ...data.images]);
      setHasMore(data.has_more);
      setCurrentPage(nextPage);
    } catch (err: any) {
      setError('加载更多失败：' + (err.message || '未知错误'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore]);

  useEffect(() => { fetchFirstPage(); }, [fetchFirstPage]);

  // ── Intersection Observer 监听滚动 ─────────────────────────
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' } // 提前 200px 触发
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, fetchNextPage]);

  // ── 普通图片上传 ───────────────────────────────────────────
  const handleUpload = useCallback(async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setUploadResult(null);

    try {
      const response = await uploadToLibrary(files, (percent) => setUploadProgress(percent));
      setUploadResult(
        `成功上传 ${response.uploaded} 张图片` +
        (response.failed > 0 ? `（${response.failed} 张失败）` : '')
      );
      await fetchFirstPage();
      onLibraryChange();
      setTimeout(() => setUploadResult(null), 5000);
    } catch (err: any) {
      setError('上传失败：' + (err.message || '未知错误'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [fetchFirstPage, onLibraryChange]);

  // ── 文件夹队列上传 ─────────────────────────────────────────
  const handleFoldersSelected = useCallback((folders: FolderEntry[]) => {
    const newItems: FolderQueueItem[] = folders.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      files: f.files,
      total: f.files.length,
      uploaded: 0,
      failed: 0,
      status: 'waiting',
      progress: 0,
      expanded: true,
    }));
    setFolderQueue((prev) => [...prev, ...newItems]);
  }, []);

  const processQueue = useCallback(async (queue: FolderQueueItem[]) => {
    if (isProcessingQueue) return;
    setIsProcessingQueue(true);

    for (const item of queue) {
      if (item.status !== 'waiting') continue;

      setFolderQueue((prev) =>
        prev.map((q) => q.id === item.id ? { ...q, status: 'uploading' } : q)
      );

      let uploaded = 0;
      let failed = 0;
      const files = item.files;

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        try {
          const resp = await uploadToLibrary(batch, () => {});
          uploaded += resp.uploaded;
          failed += resp.failed;
        } catch {
          failed += batch.length;
        }

        const progress = Math.round(((i + batch.length) / files.length) * 100);
        setFolderQueue((prev) =>
          prev.map((q) => q.id === item.id ? { ...q, uploaded, failed, progress: Math.min(progress, 100) } : q)
        );
      }

      setFolderQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: failed === files.length ? 'error' : 'done', progress: 100 }
            : q
        )
      );

      await fetchFirstPage();
      onLibraryChange();
    }

    setIsProcessingQueue(false);
  }, [isProcessingQueue, fetchFirstPage, onLibraryChange]);

  useEffect(() => {
    const waitingItems = folderQueue.filter((q) => q.status === 'waiting');
    if (waitingItems.length > 0 && !isProcessingQueue) {
      processQueue(folderQueue);
    }
  }, [folderQueue, isProcessingQueue, processQueue]);

  const toggleExpand = (id: string) =>
    setFolderQueue((prev) => prev.map((q) => q.id === id ? { ...q, expanded: !q.expanded } : q));

  const clearDoneItems = () =>
    setFolderQueue((prev) => prev.filter((q) => q.status === 'waiting' || q.status === 'uploading'));

  const handleDelete = useCallback(async (imageId: string) => {
    setDeletingId(imageId);
    try {
      await deleteLibraryImage(imageId);
      setImages((prev) => prev.filter((img) => img.image_id !== imageId));
      setTotalCount((prev) => prev - 1);
      onLibraryChange();
    } catch (err: any) {
      setError('删除失败：' + (err.message || '未知错误'));
    } finally {
      setDeletingId(null);
    }
  }, [onLibraryChange]);

  const doneFolders = folderQueue.filter((q) => q.status === 'done' || q.status === 'error');

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
            管理你的图片集合 · 共 {totalCount} 张图片
            {images.length < totalCount && ` · 已加载 ${images.length} 张`}
          </p>
        </div>
        <button
          onClick={fetchFirstPage}
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
          onFoldersSelected={handleFoldersSelected}
          multiple={true}
          label="拖拽图片或文件夹到此处添加到图库"
          sublabel="支持拖入多个文件夹（自动排队上传）· 或点击下方按钮选择"
          disabled={isUploading}
        />

        {isUploading && (
          <div className="mt-3 glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-4 h-4 text-accent-400 animate-pulse" />
              <span className="text-sm text-surface-300 font-medium">正在上传并处理中...</span>
              <span className="text-sm text-accent-400 font-bold ml-auto">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div className="h-full upload-progress-bar rounded-full transition-all duration-300" style={{ width: `${Math.max(uploadProgress, 5)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* 文件夹队列 */}
      {folderQueue.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-surface-200">文件夹上传队列</span>
              {isProcessingQueue && (
                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />处理中
                </span>
              )}
            </div>
            {doneFolders.length > 0 && (
              <button onClick={clearDoneItems} className="text-xs text-surface-500 hover:text-surface-300 transition-colors">
                清除已完成
              </button>
            )}
          </div>
          <div className="space-y-2">
            {folderQueue.map((item) => (
              <div key={item.id} className={`glass rounded-xl border transition-all duration-300 ${
                item.status === 'uploading' ? 'border-purple-500/30 bg-purple-500/5' :
                item.status === 'done' ? 'border-green-500/20 bg-green-500/5' :
                item.status === 'error' ? 'border-red-500/20 bg-red-500/5' : 'border-surface-700/50'
              }`}>
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                  <div className="shrink-0">
                    {item.status === 'waiting' && <Clock className="w-4 h-4 text-surface-500" />}
                    {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                    {item.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <FolderOpen className={`w-4 h-4 shrink-0 ${
                    item.status === 'uploading' ? 'text-purple-400' :
                    item.status === 'done' ? 'text-green-400' :
                    item.status === 'error' ? 'text-red-400' : 'text-surface-500'}`} />
                  <span className="text-sm font-medium text-surface-200 flex-1 truncate">{item.name}</span>
                  <span className="text-xs text-surface-500 shrink-0">
                    {item.status === 'waiting' && `${item.total} 张待上传`}
                    {item.status === 'uploading' && `${item.uploaded}/${item.total} 张`}
                    {item.status === 'done' && <span className="text-green-400">{item.uploaded} 张完成{item.failed > 0 ? `，${item.failed} 张失败` : ''}</span>}
                    {item.status === 'error' && <span className="text-red-400">上传失败</span>}
                  </span>
                  {item.expanded ? <ChevronUp className="w-3.5 h-3.5 text-surface-600 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-surface-600 shrink-0" />}
                </div>
                {item.expanded && (
                  <div className="px-3 pb-3">
                    {(item.status === 'uploading' || item.status === 'done') && (
                      <div className="mt-1">
                        <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${item.status === 'done' ? 'bg-green-500' : 'upload-progress-bar'}`}
                            style={{ width: `${item.progress}%` }} />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-xs text-surface-600">{item.status === 'uploading' ? '使用 ResNet50 提取特征向量中...' : '✓ 全部处理完成'}</span>
                          <span className={`text-xs font-medium ${item.status === 'done' ? 'text-green-400' : 'text-purple-400'}`}>{item.progress}%</span>
                        </div>
                      </div>
                    )}
                    {item.status === 'waiting' && (
                      <div className="text-xs text-surface-600 mt-1">
                        包含: {item.files.slice(0, 5).map(f => f.name).join(', ')}
                        {item.files.length > 5 && ` 等 ${item.files.length} 个文件`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="mb-4 glass rounded-xl p-4 border border-red-500/20 bg-red-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-500/70 hover:text-red-400 mt-1">关闭</button>
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
            <div key={i} className="rounded-xl overflow-hidden bg-gradient-card border border-white/5">
              <div className="aspect-square bg-surface-800 skeleton-shimmer" />
              <div className="p-2"><div className="h-3 bg-surface-800 rounded w-3/4 skeleton-shimmer" /></div>
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
            将图片或文件夹拖拽到上方的上传区域，开始构建你的图片库吧。
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image, index) => (
              <div
                key={image.image_id}
                className="image-card group relative rounded-xl overflow-hidden bg-gradient-card border border-white/5 animate-scale-in"
                style={{ animationDelay: `${Math.min(index, 20) * 30}ms`, animationFillMode: 'both' }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={getImageUrl(image.image_url)}
                    alt={image.filename}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(image.image_id); }}
                      disabled={deletingId === image.image_id}
                      className="p-3 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-all backdrop-blur-sm border border-red-500/20 disabled:opacity-50"
                    >
                      {deletingId === image.image_id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs text-surface-400 truncate" title={image.filename}>{image.filename}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 无限滚动哨兵 + 加载指示器 */}
          <div ref={sentinelRef} className="mt-6 flex items-center justify-center py-4">
            {isLoadingMore && (
              <div className="flex items-center gap-3 text-surface-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">加载更多...</span>
              </div>
            )}
            {!hasMore && images.length > 0 && (
              <p className="text-xs text-surface-600">
                已显示全部 {totalCount} 张图片
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
