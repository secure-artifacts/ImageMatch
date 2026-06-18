import { useState, useCallback } from 'react';
import { Search, Sparkles, ArrowRight, ImageOff } from 'lucide-react';
import DropZone from '../components/DropZone';
import ResultCard from '../components/ResultCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { searchSimilar, type SearchResult } from '../api';

interface SearchViewProps {
  libraryCount: number;
}

export default function SearchView({ libraryCount }: SearchViewProps) {
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [targetPreview, setTargetPreview] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setTargetFile(file);
    setError(null);
    setResults([]);
    setHasSearched(false);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setTargetPreview(previewUrl);

    // Auto-search
    setIsSearching(true);
    try {
      const response = await searchSimilar(file, 30);
      setResults(response.results);
      setHasSearched(true);
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || '搜索失败';
      setError(message);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchAgain = useCallback(async () => {
    if (!targetFile) return;
    setIsSearching(true);
    setError(null);
    try {
      const response = await searchSimilar(targetFile, 30);
      setResults(response.results);
      setHasSearched(true);
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || '搜索失败';
      setError(message);
    } finally {
      setIsSearching(false);
    }
  }, [targetFile]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-accent">
            <Search className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">相似度搜索</h2>
        </div>
        <p className="text-surface-400 text-sm ml-[52px]">
          上传一张目标图片，从图库中查找最相似的图片
        </p>
      </div>

      {libraryCount === 0 ? (
        /* Empty library notice */
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
            <ImageOff className="w-10 h-10 text-surface-500" />
          </div>
          <h3 className="text-lg font-semibold text-surface-200 mb-2">图库为空</h3>
          <p className="text-surface-400 text-sm max-w-md mx-auto">
            你需要先上传一些图片到图库中，然后才能进行相似度搜索。
            请切换到「图片库」视图开始添加图片。
          </p>
        </div>
      ) : (
        /* Main search layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column: Upload target */}
          <div className="lg:col-span-4">
            <div className="glass rounded-2xl p-5 sticky top-6">
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
                目标图片
              </h3>

              {!targetPreview ? (
                <DropZone
                  onFilesSelected={handleFileSelected}
                  label="拖拽目标图片到此处"
                  sublabel="或点击选择图片"
                  disabled={isSearching}
                />
              ) : (
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={targetPreview}
                      alt="目标图片"
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-sm font-medium text-white truncate">
                        {targetFile?.name}
                      </p>
                      <p className="text-xs text-surface-300">
                        {targetFile && (targetFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTargetFile(null);
                        setTargetPreview(null);
                        setResults([]);
                        setHasSearched(false);
                        setError(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-surface-300 bg-surface-800 hover:bg-surface-700 transition-colors"
                    >
                      清除
                    </button>
                    <button
                      onClick={handleSearchAgain}
                      disabled={isSearching}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-accent hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      重新搜索
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Results */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                {isSearching
                  ? '搜索中...'
                  : hasSearched
                    ? `找到 ${results.length} 个匹配结果`
                    : '搜索结果将显示在这里'
                }
              </h3>
              {hasSearched && results.length > 0 && (
                <span className="text-xs text-surface-500">
                  按相似度排序
                </span>
              )}
            </div>

            {error && (
              <div className="glass rounded-xl p-4 mb-4 border border-red-500/20 bg-red-500/5">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {isSearching ? (
              <SkeletonLoader count={6} />
            ) : hasSearched && results.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-surface-400">未找到匹配的图片。</p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {results.map((result, index) => (
                  <ResultCard key={result.image_id} result={result} index={index} />
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="w-8 h-8 text-surface-500" />
                </div>
                <p className="text-surface-300 font-medium mb-1">请上传一张目标图片</p>
                <p className="text-surface-500 text-sm">
                  在左侧拖入一张图片，即可从图库中搜索相似图片
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
