import { motion } from 'framer-motion';
import { Camera, Image, Palette, Sparkles, Upload, Search } from 'lucide-react';

const floatingElements = [
  { icon: Camera, position: { top: '10%', left: '10%' }, delay: 0 },
  { icon: Image, position: { top: '20%', right: '15%' }, delay: 0.5 },
  { icon: Palette, position: { bottom: '30%', left: '5%' }, delay: 1 },
  { icon: Sparkles, position: { bottom: '20%', right: '10%' }, delay: 1.5 },
  { icon: Upload, position: { top: '60%', left: '20%' }, delay: 2 },
  { icon: Search, position: { top: '40%', right: '25%' }, delay: 2.5 },
];

export default function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {floatingElements.map(({ icon: Icon, position, delay }, index) => (
        <motion.div
          key={index}
          className="absolute"
          style={position}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.6, 0.3, 0.6],
            scale: [0, 1.2, 0.8, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 4,
            delay,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
            <Icon className="w-6 h-6 text-purple-600" />
          </div>
        </motion.div>
      ))}
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-purple-400/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-20, -100],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}
