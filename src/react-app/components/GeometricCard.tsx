import { useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface GeometricCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
  color?: 'purple' | 'blue' | 'pink' | 'green';
}

const colorVariants = {
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-400/30',
    hover: 'hover:border-purple-400/60',
    icon: 'text-purple-400',
    accent: 'bg-purple-400'
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-400/30',
    hover: 'hover:border-blue-400/60',
    icon: 'text-blue-400',
    accent: 'bg-blue-400'
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-400/30',
    hover: 'hover:border-pink-400/60',
    icon: 'text-pink-400',
    accent: 'bg-pink-400'
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-400/30',
    hover: 'hover:border-green-400/60',
    icon: 'text-green-400',
    accent: 'bg-green-400'
  }
};

export default function GeometricCard({ 
  icon: Icon, 
  title, 
  description, 
  delay = 0, 
  color = 'purple' 
}: GeometricCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = colorVariants[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative p-8 border-2 ${colors.border} ${colors.hover} ${colors.bg} backdrop-blur-lg transition-all duration-300 overflow-hidden`}>
        {/* Corner decorations */}
        <div className={`absolute top-0 left-0 w-3 h-3 ${colors.accent} transform -translate-x-1/2 -translate-y-1/2`} />
        <div className={`absolute top-0 right-0 w-3 h-3 ${colors.accent} transform translate-x-1/2 -translate-y-1/2`} />
        <div className={`absolute bottom-0 left-0 w-3 h-3 ${colors.accent} transform -translate-x-1/2 translate-y-1/2`} />
        <div className={`absolute bottom-0 right-0 w-3 h-3 ${colors.accent} transform translate-x-1/2 translate-y-1/2`} />
        
        {/* Animated background pattern */}
        <motion.div
          className="absolute inset-0 opacity-0"
          animate={{
            opacity: isHovered ? 0.1 : 0,
          }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.1) 10px,
              rgba(255,255,255,0.1) 20px
            )`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          <motion.div
            className={`w-16 h-16 ${colors.bg} border-2 ${colors.border} flex items-center justify-center mb-6`}
            animate={{
              rotateY: isHovered ? 180 : 0,
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.6 }}
          >
            <Icon className={`w-8 h-8 ${colors.icon}`} />
          </motion.div>
          
          <motion.h3 
            className="text-xl font-bold text-white mb-4 font-mono tracking-wider"
            animate={{
              x: isHovered ? 10 : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            {title.toUpperCase()}
          </motion.h3>
          
          <motion.p 
            className="text-gray-300 leading-relaxed"
            animate={{
              x: isHovered ? 10 : 0,
            }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {description}
          </motion.p>
          
          {/* Animated line */}
          <motion.div
            className={`mt-6 h-px ${colors.accent} origin-left`}
            animate={{
              scaleX: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
        
        {/* Scan line effect */}
        <motion.div
          className={`absolute top-0 left-0 w-full h-px ${colors.accent} opacity-0`}
          animate={{
            y: isHovered ? [0, 200, 0] : 0,
            opacity: isHovered ? [0, 1, 0] : 0,
          }}
          transition={{
            duration: 1.5,
            repeat: isHovered ? Infinity : 0,
            ease: 'linear'
          }}
        />
      </div>
    </motion.div>
  );
}
