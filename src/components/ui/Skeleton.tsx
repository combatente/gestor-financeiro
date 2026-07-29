interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height: height ?? '1rem' }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton width="2.5rem" height="2.5rem" className="rounded-xl" />
        <Skeleton width="3rem" height="1rem" className="rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton width="60%" height="0.75rem" className="rounded-full" />
        <Skeleton width="80%" height="1.75rem" className="rounded-lg" />
        <Skeleton width="40%" height="0.75rem" className="rounded-full" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">
          <Skeleton width="8%" height="1rem" className="rounded" />
          <Skeleton width="30%" height="1rem" className="rounded" />
          <Skeleton width="20%" height="1rem" className="rounded" />
          <Skeleton width="15%" height="1rem" className="rounded" />
          <Skeleton width="12%" height="1rem" className="rounded" />
        </div>
      ))}
    </div>
  )
}
