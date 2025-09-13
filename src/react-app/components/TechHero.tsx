import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface TechHeroProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function TechHero({ title, subtitle, className = '' }: TechHeroProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={heroRef} className={`relative overflow-hidden ${className}`}>
      {/* Dynamic background effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, 
            rgba(139, 92, 246, 0.3) 0%, 
            rgba(59, 130, 246, 0.2) 25%, 
            rgba(236, 72, 153, 0.1) 50%, 
            transparent 70%)`
        }}
      />
      
      {/* Grid overlay */}
      <div className="absolute inset-0">
        <div 
          className="w-full h-full grid opacity-20"
          style={{
            gridTemplateColumns: 'repeat(20, 1fr)',
            gridTemplateRows: 'repeat(10, 1fr)'
          }}
        >
          {Array.from({ length: 200 }).map((_, i) => (
            <motion.div
              key={i}
              className="border border-white/10"
              animate={{
                borderColor: Math.random() > 0.98 ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)',
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center"
        >
          {/* Animated title with typewriter effect */}
          <motion.h1 
            className="text-8xl md:text-9xl font-black text-white mb-8 font-mono tracking-tighter relative"
            style={{
              textShadow: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)'
            }}
          >
            {title.split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.1,
                  delay: i * 0.05,
                  ease: "easeOut"
                }}
                className="inline-block"
              >
                {char}
              </motion.span>
            ))}
            
            {/* Blinking cursor */}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-purple-400 ml-2"
            >
              |
            </motion.span>
          </motion.h1>
          
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-2xl md:text-3xl text-gray-300 max-w-4xl mx-auto font-mono tracking-wide"
            >
              {subtitle}
            </motion.p>
          )}
          
          {/* Decorative elements */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '200px' }}
            transition={{ duration: 1, delay: 1 }}
            className="h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto mt-8"
          />
        </motion.div>
        
        {/* Floating geometric shapes */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 border-2 border-purple-400/30"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
      
      {/* Bottom border with animated segments */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 opacity-50">
        <motion.div
          className="h-full bg-white/50"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{ width: '20%' }}
        />
      </div>
    </div>
  );
}
