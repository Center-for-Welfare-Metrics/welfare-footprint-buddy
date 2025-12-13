import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const LoadingSpinner = ({ size = "md", className, label }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-[3px]",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        {/* Background ring */}
        <div className={cn(
          "rounded-full border-muted/30",
          sizeClasses[size]
        )} />
        {/* Spinning ring */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full border-transparent border-t-primary border-r-primary/30",
            sizeClasses[size]
          )}
          style={{ animation: 'spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite' }}
        />
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-40"
          style={{ background: 'hsl(203 100% 50% / 0.3)' }}
        />
      </div>
      {label && (
        <span className="text-sm text-muted-foreground font-medium animate-pulse">
          {label}
        </span>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

interface LoadingDotsProps {
  className?: string;
}

const LoadingDots = ({ className }: LoadingDotsProps) => {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          style={{
            animation: 'bounce-dot 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { 
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  label?: string;
  className?: string;
}

const LoadingOverlay = ({ isLoading, label, className }: LoadingOverlayProps) => {
  if (!isLoading) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-background/80 backdrop-blur-md",
        "animate-fade-in",
        className
      )}
    >
      <div className="flex flex-col items-center gap-6 p-8">
        <LoadingSpinner size="lg" />
        {label && (
          <p className="text-foreground/80 font-medium text-lg animate-pulse">
            {label}
          </p>
        )}
      </div>
    </div>
  );
};

export { LoadingSpinner, LoadingDots, LoadingOverlay };