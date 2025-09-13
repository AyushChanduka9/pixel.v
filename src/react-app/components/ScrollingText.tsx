import { motion } from 'framer-motion';

interface ScrollingTextProps {
  text: string;
  className?: string;
  direction?: 'left' | 'right';
  speed?: number;
}

export default function ScrollingText({ 
  text, 
  className = '', 
  direction = 'left',
  speed = 50
}: ScrollingTextProps) {
  const duplicatedText = Array(20).fill(text).join(' • ');
  
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div
        className="inline-block"
        animate={{
          x: direction === 'left' ? [0, -1000] : [-1000, 0],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <span className="text-inherit font-inherit">
          {duplicatedText}
        </span>
      </motion.div>
    </div>
  );
}
