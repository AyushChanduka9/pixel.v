import { useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface InteractiveCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export default function InteractiveCard({ icon: Icon, title, description, delay = 0 }: InteractiveCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20"
          animate={{
            opacity: isHovered ? 1 : 0,
            scale: isHovered ? 1.02 : 1,
          }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: isHovered ? [-20, 20] : [0],
                opacity: isHovered ? [0, 1, 0] : 0,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          {/* Icon */}
          <motion.div
            className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center mb-6"
            animate={{
              rotate: isHovered ? [0, 360] : 0,
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.6 }}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>

          {/* Content */}
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{description}</p>

          {/* Glow effect */}
          <motion.div
            className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl blur opacity-0"
            animate={{
              opacity: isHovered ? 0.3 : 0,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
