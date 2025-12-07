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
      className={cn("drop-shadow-[0_0_24px_var(--glow-color)] filter", className)}
      style={{ "--glow-color": glowColor } as React.CSSProperties}
    >
      {/* Outer atmospheric glow ring */}
      <circle
        cx="32"
        cy="32"
        r="31"
        stroke="url(#atmosphericGlow)"
        strokeWidth="0.5"
        opacity="0.5"
      />
      
      {/* Main outer ring with thick gradient stroke */}
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="url(#compassGradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      
      {/* Secondary decorative ring */}
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />
      
      {/* Inner dashed ring */}
      <circle
        cx="32"
        cy="32"
        r="20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 6"
        opacity="0.5"
      />
      
      {/* Innermost solid ring */}
      <circle
        cx="32"
        cy="32"
        r="15"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />
      
      {/* Cardinal direction markers - N (prominent) */}
      <line x1="32" y1="4" x2="32" y2="14" stroke="url(#northGradient)" strokeWidth="4" strokeLinecap="round" />
      {/* Cardinal direction markers - S */}
      <line x1="32" y1="50" x2="32" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* Cardinal direction markers - W */}
      <line x1="4" y1="32" x2="14" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* Cardinal direction markers - E */}
      <line x1="50" y1="32" x2="60" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      
      {/* Intercardinal markers (diagonal) - thicker */}
      <line x1="10" y1="10" x2="16" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="54" y1="10" x2="48" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="10" y1="54" x2="16" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="54" y1="54" x2="48" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      
      {/* Compass needle - North (main direction) - bold and prominent */}
      <polygon
        points="32,10 40,32 32,24 24,32"
        fill="url(#needleGradientNorth)"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      
      {/* Compass needle - South */}
      <polygon
        points="32,54 40,32 32,40 24,32"
        fill="url(#needleGradientSouth)"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinejoin="round"
        opacity="0.5"
      />
      
      {/* Compass needle - East */}
      <polygon
        points="54,32 32,40 40,32 32,24"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      
      {/* Compass needle - West */}
      <polygon
        points="10,32 32,40 24,32 32,24"
        fill="currentColor"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      
      {/* Center pivot outer ring - larger */}
      <circle
        cx="32"
        cy="32"
        r="7"
        fill="url(#centerGradient)"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Center pivot inner dot */}
      <circle
        cx="32"
        cy="32"
        r="4"
        fill="currentColor"
        opacity="0.95"
      />
      
      {/* Center highlight */}
      <circle
        cx="30.5"
        cy="30.5"
        r="2"
        fill="currentColor"
        opacity="0.5"
      />
      
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="atmosphericGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
        </linearGradient>
        
        <linearGradient id="compassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="30%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="70%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        
        <linearGradient id="northGradient" x1="32" y1="4" x2="32" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>
        
        <linearGradient id="needleGradientNorth" x1="32" y1="10" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
        
        <linearGradient id="needleGradientSouth" x1="32" y1="54" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.25" />
        </linearGradient>
        
        <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
        </radialGradient>
      </defs>
    </svg>
  );
};