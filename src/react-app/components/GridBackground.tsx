import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface GridBackgroundProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export default function GridBackground({ columns = 40, rows = 20, className = '' }: GridBackgroundProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const totalCells = columns * rows;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const x = (col / columns) * 100;
    const y = (row / rows) * 100;
    
    // Calculate distance from mouse
    const distance = Math.sqrt(Math.pow(x - mousePos.x, 2) + Math.pow(y - mousePos.y, 2));
    const maxDistance = 20; // Distance threshold for highlighting
    const opacity = Math.max(0.1, Math.min(1, (maxDistance - distance) / maxDistance));
    const scale = Math.max(0.8, Math.min(1.2, 1 + (maxDistance - distance) / maxDistance * 0.3));
    
    // Random animation delay for some cells
    const shouldAnimate = Math.random() > 0.95;
    const animationDelay = Math.random() * 5;

    return {
      id: i,
      x,
      y,
      opacity: distance < maxDistance ? opacity : 0.1,
      scale: distance < maxDistance ? scale : 1,
      shouldAnimate,
      animationDelay
    };
  });

  return (
    <div 
      ref={gridRef}
      className={`absolute inset-0 ${className}`}
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)'
      }}
    >
      <div 
        className="grid w-full h-full relative"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {cells.map((cell) => (
          <motion.div
            key={cell.id}
            className="border-[0.5px] border-white/5 relative overflow-hidden"
            animate={{
              borderColor: `rgba(139, 92, 246, ${cell.opacity})`,
              scale: cell.scale,
            }}
            transition={{
              duration: 0.3,
              ease: "easeOut"
            }}
          >
            {/* Animated background for some cells */}
            {cell.shouldAnimate && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10"
                animate={{
                  opacity: [0, 0.5, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  delay: cell.animationDelay,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              />
            )}
            
            {/* Corner highlights */}
            <div className="absolute top-0 left-0 w-1 h-1 bg-purple-400/30" />
            <div className="absolute top-0 right-0 w-1 h-1 bg-blue-400/30" />
            <div className="absolute bottom-0 left-0 w-1 h-1 bg-blue-400/30" />
            <div className="absolute bottom-0 right-0 w-1 h-1 bg-purple-400/30" />
          </motion.div>
        ))}
      </div>
      
      {/* Overlay patterns */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-purple-500 to-transparent" />
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
      </div>
    </div>
  );
}
