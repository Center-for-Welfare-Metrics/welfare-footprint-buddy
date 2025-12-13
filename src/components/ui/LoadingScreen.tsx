import { cn } from "@/lib/utils";
import { Skeleton, SkeletonButton } from "./skeleton";

interface LoadingScreenProps {
  variant?: "home" | "results" | "scanner" | "generic";
  className?: string;
}

const HomeLoadingSkeleton = () => (
  <div className="flex flex-col min-h-screen bg-gradient-radial-forest relative overflow-hidden">
    {/* Texture overlay */}
    <div className="texture-noise absolute inset-0" />
    
    {/* Ambient glow */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full blur-[120px] animate-float-slow"
        style={{ background: 'radial-gradient(circle, hsl(203 100% 40% / 0.12) 0%, transparent 70%)' }}
      />
    </div>
    
    {/* Header skeleton */}
    <header className="absolute top-0 left-0 right-0 z-20">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
    </header>
    
    {/* Main content skeleton */}
    <main className="flex-grow flex flex-col items-center justify-center px-4 pt-20 pb-8 relative z-10 max-w-4xl mx-auto w-full">
      <div className="mb-10 space-y-10 w-full flex flex-col items-center">
        {/* Logo skeleton */}
        <div className="relative animate-fade-in">
          <Skeleton className="w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full" />
        </div>
        
        {/* Text skeletons */}
        <div className="space-y-6 max-w-lg mx-auto w-full animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Skeleton className="h-6 w-4/5 mx-auto" />
          <Skeleton className="h-5 w-3/5 mx-auto" />
          <div className="divider-glow w-24 mx-auto" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
      </div>
      
      {/* Button skeletons */}
      <div className="w-full space-y-4 max-w-sm mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <SkeletonButton className="w-full" />
        <SkeletonButton className="w-full" />
      </div>
    </main>
    
    {/* Footer skeleton */}
    <footer className="w-full py-8 px-4 pb-32 space-y-4 relative z-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <Skeleton className="h-3 w-48 mx-auto" />
      <Skeleton className="h-8 w-32 mx-auto rounded-xl" />
    </footer>
  </div>
);

const ResultsLoadingSkeleton = () => (
  <div className="flex flex-col min-h-screen bg-gradient-radial-forest relative overflow-hidden">
    <div className="texture-noise absolute inset-0" />
    
    {/* Header skeleton */}
    <header className="relative z-20 px-4 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </header>
    
    {/* Main content */}
    <main className="flex-grow px-4 py-6 relative z-10 max-w-4xl mx-auto w-full space-y-6">
      {/* Product info skeleton */}
      <div className="glass-card rounded-2xl p-6 space-y-4 animate-fade-in">
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-20 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      
      {/* Score skeleton */}
      <div className="glass-card rounded-2xl p-6 space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      </div>
      
      {/* Details skeleton */}
      <div className="glass-card rounded-2xl p-6 space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

const ScannerLoadingSkeleton = () => (
  <div className="flex flex-col min-h-screen bg-gradient-radial-forest relative overflow-hidden items-center justify-center">
    <div className="texture-noise absolute inset-0" />
    
    <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
      {/* Camera viewfinder skeleton */}
      <div className="relative">
        <Skeleton className="w-72 h-72 sm:w-80 sm:h-80 rounded-3xl" />
        
        {/* Scanning animation overlay */}
        <div className="absolute inset-4 rounded-2xl border-2 border-primary/30 overflow-hidden">
          <div 
            className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{
              animation: 'scan-line 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>
      
      <div className="space-y-3 text-center">
        <Skeleton className="h-5 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
    
    <style>{`
      @keyframes scan-line {
        0%, 100% { top: 0; opacity: 0; }
        10% { opacity: 1; }
        50% { top: calc(100% - 2px); opacity: 1; }
        60% { opacity: 0; }
      }
    `}</style>
  </div>
);

const GenericLoadingSkeleton = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 animate-fade-in">
    {/* Animated loader */}
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-4 border-muted" />
      <div 
        className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary"
        style={{ animation: 'spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite' }}
      />
    </div>
    
    <div className="space-y-2 text-center">
      <Skeleton className="h-5 w-36 mx-auto" />
      <Skeleton className="h-4 w-24 mx-auto" />
    </div>
    
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const LoadingScreen = ({ variant = "generic", className }: LoadingScreenProps) => {
  const variants = {
    home: HomeLoadingSkeleton,
    results: ResultsLoadingSkeleton,
    scanner: ScannerLoadingSkeleton,
    generic: GenericLoadingSkeleton,
  };
  
  const Component = variants[variant];
  
  return (
    <div className={cn("animate-fade-in", className)}>
      <Component />
    </div>
  );
};

export { LoadingScreen };