import React from 'react';

interface CompassIconProps {
  className?: string;
  size?: number;
}

const CompassIcon: React.FC<CompassIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Gradient for the compass ring */}
        <linearGradient id="compassRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="50%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        
        {/* Gradient for the needle */}
        <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#99f6e4" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id="compassGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Outer compass ring */}
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="url(#compassRingGradient)"
        strokeWidth="2.5"
        fill="none"
        filter="url(#compassGlow)"
      />
      
      {/* Inner subtle ring */}
      <circle
        cx="24"
        cy="24"
        r="14"
        stroke="url(#compassRingGradient)"
        strokeWidth="0.75"
        fill="none"
        opacity="0.4"
      />
      
      {/* North needle (pointing up-right) */}
      <path
        d="M24 24 L32 10 L28 24 Z"
        fill="url(#needleGradient)"
        filter="url(#compassGlow)"
      />
      
      {/* South needle (pointing down-left) */}
      <path
        d="M24 24 L16 38 L20 24 Z"
        fill="url(#compassRingGradient)"
        opacity="0.7"
      />
      
      {/* East-West indicator lines */}
      <line
        x1="8"
        y1="24"
        x2="12"
        y2="24"
        stroke="url(#compassRingGradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="36"
        y1="24"
        x2="40"
        y2="24"
        stroke="url(#compassRingGradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Center pivot */}
      <circle
        cx="24"
        cy="24"
        r="2.5"
        fill="url(#needleGradient)"
        filter="url(#compassGlow)"
      />
    </svg>
  );
};

export default CompassIcon;
