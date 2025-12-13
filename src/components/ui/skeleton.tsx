import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "rounded-md bg-muted/50 relative overflow-hidden",
        "after:absolute after:inset-0",
        "after:bg-gradient-to-r after:from-transparent after:via-foreground/5 after:to-transparent",
        "after:animate-shimmer",
        className
      )} 
      {...props} 
    />
  );
}

function SkeletonText({ 
  lines = 1, 
  className,
  lastLineWidth = "60%"
}: { 
  lines?: number; 
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4 rounded-md"
          style={{ 
            width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%',
            animationDelay: `${i * 100}ms`
          }}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-2xl p-6 space-y-4",
      "bg-card/50 backdrop-blur-sm border border-border/30",
      "animate-fade-in",
      className
    )}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

function SkeletonButton({ className }: { className?: string }) {
  return (
    <Skeleton 
      className={cn(
        "h-12 sm:h-14 rounded-xl",
        className
      )} 
    />
  );
}

function SkeletonImage({ 
  className,
  aspectRatio = "square"
}: { 
  className?: string;
  aspectRatio?: "square" | "video" | "wide";
}) {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[21/9]"
  };
  
  return (
    <Skeleton 
      className={cn(
        "w-full rounded-xl",
        aspectClasses[aspectRatio],
        className
      )} 
    />
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonButton, SkeletonImage };