import { cn } from "@/lib/utils";

interface StylizedCompassProps {
  className?: string;
  glowColor?: string;
}

/**
 * A stylized compass icon that matches the app's design language
 * with bold stroke weight, glow effects, and gradient styling
 */
export const StylizedCompass = ({ className, glowColor = "rgba(255,255,255,0.6)" }: StylizedCompassProps) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-[0_0_20px_var(--glow-color)] filter", className)}
      style={{ "--glow-color": glowColor } as React.CSSProperties}
    >
      {/* Outer glow ring */}
      <circle
        cx="32"
        cy="32"
        r="30"
        stroke="url(#outerGlow)"
        strokeWidth="1"
        opacity="0.4"
      />
      
      {/* Main outer ring with gradient stroke */}
      <circle
        cx="32"
        cy="32"
        r="27"
        stroke="url(#compassGradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Secondary decorative ring */}
      <circle
        cx="32"
        cy="32"
        r="23"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />
      
      {/* Inner decorative ring with dashes */}
      <circle
        cx="32"
        cy="32"
        r="19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 5"
        opacity="0.5"
      />
      
      {/* Cardinal direction markers - N */}
      <line x1="32" y1="5" x2="32" y2="13" stroke="url(#cardinalGradient)" strokeWidth="3" strokeLinecap="round" />
      {/* Cardinal direction markers - S */}
      <line x1="32" y1="51" x2="32" y2="59" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* Cardinal direction markers - W */}
      <line x1="5" y1="32" x2="13" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* Cardinal direction markers - E */}
      <line x1="51" y1="32" x2="59" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      
      {/* Intercardinal markers (diagonal) */}
      <line x1="11" y1="11" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="53" y1="11" x2="48" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="11" y1="53" x2="16" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="53" y1="53" x2="48" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      
      {/* Compass needle - North (main direction) - more prominent */}
      <polygon
        points="32,12 39,32 32,26 25,32"
        fill="url(#needleGradientNorth)"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      
      {/* Compass needle - South */}
      <polygon
        points="32,52 39,32 32,38 25,32"
        fill="url(#needleGradientSouth)"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
        opacity="0.5"
      />
      
      {/* Compass needle - East */}
      <polygon
        points="52,32 32,39 38,32 32,25"
        fill="currentColor"
        opacity="0.25"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      
      {/* Compass needle - West */}
      <polygon
        points="12,32 32,39 26,32 32,25"
        fill="currentColor"
        opacity="0.25"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      
      {/* Center pivot outer ring */}
      <circle
        cx="32"
        cy="32"
        r="6"
        fill="url(#centerGradient)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Center pivot inner dot */}
      <circle
        cx="32"
        cy="32"
        r="3"
        fill="currentColor"
        opacity="0.95"
      />
      
      {/* Center highlight */}
      <circle
        cx="31"
        cy="31"
        r="1.5"
        fill="currentColor"
        opacity="0.4"
      />
      
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="outerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
        </linearGradient>
        
        <linearGradient id="compassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="40%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        
        <linearGradient id="cardinalGradient" x1="32" y1="5" x2="32" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
        </linearGradient>
        
        <linearGradient id="needleGradientNorth" x1="32" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
        
        <linearGradient id="needleGradientSouth" x1="32" y1="52" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
        
        <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="70%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
        </radialGradient>
      </defs>
    </svg>
  );
};
