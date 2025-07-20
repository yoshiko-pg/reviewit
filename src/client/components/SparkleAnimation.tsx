import React from 'react';

interface SparkleAnimationProps {
  isActive: boolean;
}

const sparkleStyles: React.CSSProperties = {
  position: 'absolute',
  fontSize: '16px',
  pointerEvents: 'none',
  zIndex: 100,
  transform: 'translateY(20px) scale(0.5)',
  opacity: 0,
};

export const SparkleAnimation: React.FC<SparkleAnimationProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <>
      <div
        className="animate-sparkle-rise"
        style={{
          ...sparkleStyles,
          left: '-12px',
          animationDelay: '0s',
        }}
      >
        ✨
      </div>
      <div
        className="animate-sparkle-rise"
        style={{
          ...sparkleStyles,
          right: '-12px',
          animationDelay: '0.3s',
        }}
      >
        ✨
      </div>
    </>
  );
};
