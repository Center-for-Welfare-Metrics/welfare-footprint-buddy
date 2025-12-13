import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const PageTransition = ({ children, className, delay = 0 }: PageTransitionProps) => {
  return (
    <div 
      className={cn(
        "animate-fade-in-scale",
        className
      )}
      style={{ 
        animationDelay: `${delay}ms`,
        animationFillMode: 'backwards'
      }}
    >
      {children}
    </div>
  );
};

interface StaggeredChildrenProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

const StaggeredChildren = ({ 
  children, 
  className,
  staggerDelay = 80,
  initialDelay = 0
}: StaggeredChildrenProps) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-slide-up"
          style={{ 
            animationDelay: `${initialDelay + (index * staggerDelay)}ms`,
            animationFillMode: 'backwards'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export { PageTransition, StaggeredChildren };