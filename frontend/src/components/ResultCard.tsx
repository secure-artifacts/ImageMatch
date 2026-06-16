import { getImageUrl, type SearchResult } from '../api';

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
  const score = result.similarity_score_percentage;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="image-card group relative rounded-2xl overflow-hidden bg-gradient-card border border-white/5 animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={getImageUrl(result.image_url)}
          alt={result.filename}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Score Badge (always visible) */}
        <div className="absolute top-3 right-3">
          <div className="relative w-16 h-16">
            {/* Circular progress ring */}
            <svg className="circular-progress w-16 h-16" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="rgba(0,0,0,0.6)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke={getScoreRingColor(score)}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            {/* Score text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {Math.round(score)}%
              </span>
            </div>
          </div>
        </div>

        {/* Rank badge */}
        <div className="absolute top-3 left-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white
            ${index < 3 ? 'bg-gradient-accent shadow-lg shadow-purple-500/30' : 'bg-black/50 backdrop-blur-sm'}
          `}>
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
          <span className={`
            inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold text-white
            ${getScoreClass(score)}
          `}>
            {score.toFixed(1)}% 匹配
          </span>
        </div>
      </div>
    </div>
  );
}
