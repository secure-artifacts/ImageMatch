interface SkeletonLoaderProps {
  count?: number;
}

export default function SkeletonLoader({ count = 6 }: SkeletonLoaderProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden bg-gradient-card border border-white/5 animate-fade-in"
          style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
        >
          {/* Image placeholder */}
          <div className="aspect-square bg-surface-800 skeleton-shimmer relative">
            {/* Score placeholder */}
            <div className="absolute top-3 right-3 w-16 h-16 rounded-full bg-surface-700/50" />
            {/* Rank placeholder */}
            <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-surface-700/50" />
          </div>

          {/* Info placeholder */}
          <div className="p-3 space-y-2">
            <div className="h-4 bg-surface-800 rounded-lg w-3/4 skeleton-shimmer" />
            <div className="h-5 bg-surface-800 rounded-full w-1/2 skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
