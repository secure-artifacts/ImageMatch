import { useState, useCallback } from 'react';
import { Download, ZoomIn } from 'lucide-react';
import { getImageUrl, type SearchResult } from '../api';
import ImageLightbox from './ImageLightbox';

interface ResultCardProps {
  result: SearchResult;
  index: number;
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'score-high';
  if (score >= 70) return 'score-medium';
  return 'score-low';
}

function getScoreRingColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#eab308';
  return '#ef4444';
}

export default function ResultCard({ result, index }: ResultCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const score = result.similarity_score_percentage;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;
  const imageUrl = getImageUrl(result.image_url);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = result.filename;
      link.target = '_blank';
      link.click();
    }
  }, [imageUrl, result.filename]);

  return (
    <>
      <div
        className="image-card group relative rounded-2xl overflow-hidden bg-gradient-card border border-white/5 animate-slide-up cursor-pointer"
        style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
        onClick={() => setLightboxOpen(true)}
        title="点击查看大图"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={imageUrl}
            alt={result.filename}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* 悬停时显示的操作按钮 */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* 放大图标 */}
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 transition-colors">
              <ZoomIn className="w-5 h-5" />
            </div>
            {/* 下载按钮 */}
            <button
              onClick={handleDownload}
              className="p-2.5 rounded-xl bg-accent-500/30 backdrop-blur-sm border border-accent-500/40 text-accent-300 hover:bg-accent-500/50 transition-colors"
              title="下载图片"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {/* Score Badge */}
          <div className="absolute top-3 right-3">
            <div className="relative w-14 h-14">
              <svg className="circular-progress w-14 h-14" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke={getScoreRingColor(score)}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{Math.round(score)}%</span>
              </div>
            </div>
          </div>

          {/* Rank badge */}
          <div className="absolute top-3 left-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white
              ${index < 3 ? 'bg-gradient-accent shadow-lg shadow-purple-500/30' : 'bg-black/50 backdrop-blur-sm'}`}>
              #{index + 1}
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="p-3">
          <p className="text-sm font-medium text-surface-200 truncate" title={result.filename}>
            {result.filename}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold text-white ${getScoreClass(score)}`}>
              {score.toFixed(1)}% 匹配
            </span>
            <span className="text-[11px] text-surface-500">点击查看</span>
          </div>
        </div>
      </div>

      {/* Lightbox 弹窗 */}
      {lightboxOpen && (
        <ImageLightbox
          imageUrl={imageUrl}
          filename={result.filename}
          score={score}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
