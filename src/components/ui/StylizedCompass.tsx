import { cn } from "@/lib/utils";

interface StylizedCompassProps {
  className?: string;
  glowColor?: string;
}

/**
 * A stylized compass icon that matches the app's design language
 * with bold stroke weight, glow effects, and gradient styling
 */
export const StylizedCompass = ({ className, glowColor = "rgba(255,255,255,0.5)" }: StylizedCompassProps) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-[0_0_12px_var(--glow-color)]", className)}
      style={{ "--glow-color": glowColor } as React.CSSProperties}
    >
      {/* Outer ring with gradient stroke */}
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="url(#compassGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      
      {/* Inner decorative ring */}
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 6"
        opacity="0.4"
      />
      
      {/* Cardinal direction markers */}
      <line x1="32" y1="6" x2="32" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="52" x2="32" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="6" y1="32" x2="12" y2="32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="52" y1="32" x2="58" y2="32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Intercardinal markers (smaller) */}
      <line x1="12.5" y1="12.5" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="51.5" y1="12.5" x2="48" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="12.5" y1="51.5" x2="16" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="51.5" y1="51.5" x2="48" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      
      {/* Compass needle - North (main direction) */}
      <polygon
        points="32,14 37,32 32,28 27,32"
        fill="url(#needleGradientNorth)"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      
      {/* Compass needle - South */}
      <polygon
        points="32,50 37,32 32,36 27,32"
        fill="currentColor"
        opacity="0.35"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      
      {/* Center pivot with glow */}
      <circle
        cx="32"
        cy="32"
        r="4"
        fill="url(#centerGradient)"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle
        cx="32"
        cy="32"
        r="2"
        fill="currentColor"
        opacity="0.9"
      />
      
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="compassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        
        <linearGradient id="needleGradientNorth" x1="32" y1="14" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
        
        <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
        </radialGradient>
      </defs>
    </svg>
  );
};
