import { Link } from 'react-router';
import { Camera, Upload, Search, Palette, Sparkles, Users, ArrowRight, Play, Code, Database, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/react-app/components/Header';
import Scene3D from '@/react-app/components/Scene3D';
import GeometricCard from '@/react-app/components/GeometricCard';
import TechHero from '@/react-app/components/TechHero';
import GridBackground from '@/react-app/components/GridBackground';
import ScrollingText from '@/react-app/components/ScrollingText';

export default function Home() {

  const features = [
    {
      icon: Camera,
      title: 'Modern Gallery',
      description: 'Advanced image management with AI-powered organization and smart filtering.',
      color: 'purple' as const,
    },
    {
      icon: Upload,
      title: 'Batch Processing',
      description: 'High-performance bulk upload with automated metadata extraction.',
      color: 'blue' as const,
    },
    {
      icon: Search,
      title: 'Vector Search',
      description: 'Semantic image search powered by advanced machine learning algorithms.',
      color: 'pink' as const,
    },
    {
      icon: Palette,
      title: 'Dynamic Themes',
      description: 'Real-time theme customization with accessibility compliance checking.',
      color: 'green' as const,
    },
    {
      icon: Sparkles,
      title: 'AI Generation',
      description: 'State-of-the-art image synthesis with prompt-based control systems.',
      color: 'purple' as const,
    },
    {
      icon: Users,
      title: 'Access Control',
      description: 'Enterprise-grade permission management with role-based authentication.',
      color: 'blue' as const,
    },
  ];

  const stats = [
    { label: 'Images Processed', value: '1M+', color: 'purple' },
    { label: 'AI Models', value: '15+', color: 'blue' },
    { label: 'Performance', value: '99.9%', color: 'pink' },
    { label: 'Users', value: '10K+', color: 'green' },
  ];

  const techStack = [
    { icon: Code, label: 'React 18', description: 'Modern UI framework' },
    { icon: Database, label: 'D1 Database', description: 'Edge SQL database' },
    { icon: Zap, label: 'Cloudflare', description: 'Global edge network' },
    { icon: Shield, label: 'Enterprise Auth', description: 'Secure authentication' },
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background elements */}
      <GridBackground columns={50} rows={30} />
      <Scene3D />
      
      <div className="relative z-20">
        <Header />
        
        {/* Hero Section */}
        <section className="relative">
          <TechHero 
            title="PIXELVAULT"
            subtitle="Next-generation image management platform powered by AI and edge computing"
            className="min-h-screen"
          />
          
          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex flex-col sm:flex-row gap-6"
          >
            <Link
              to="/gallery"
              className="group relative inline-flex items-center px-12 py-4 bg-white text-black text-lg font-bold font-mono tracking-wider uppercase transition-all duration-300 hover:bg-purple-500 hover:text-white overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0"
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <Play className="w-5 h-5 mr-3 relative z-10" />
              <span className="relative z-10">Launch System</span>
              <ArrowRight className="w-5 h-5 ml-3 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            
          </motion.div>
        </section>

        {/* Scrolling text */}
        <div className="bg-purple-600 py-4">
          <ScrollingText 
            text="ADVANCED IMAGE PROCESSING • AI-POWERED SEARCH • REAL-TIME COLLABORATION • ENTERPRISE SECURITY"
            className="text-white font-bold text-xl font-mono tracking-widest"
            speed={30}
          />
        </div>

        {/* Stats Section */}
        <section className="py-20 bg-black relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map(({ label, value, color }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center relative group"
                >
                  <div className={`absolute inset-0 bg-${color}-500/5 blur-xl group-hover:bg-${color}-500/10 transition-all duration-300`} />
                  <div className="relative">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                      viewport={{ once: true }}
                      className={`text-6xl md:text-8xl font-black font-mono text-${color}-400 mb-2`}
                    >
                      {value}
                    </motion.div>
                    <div className="text-gray-400 text-lg font-mono uppercase tracking-widest">
                      {label}
                    </div>
                    <div className={`h-1 bg-gradient-to-r from-${color}-500 to-transparent mt-4 mx-auto w-20`} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-32 bg-black relative">
          <div className="absolute inset-0 opacity-20">
            <GridBackground columns={30} rows={20} />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-1">
                <motion.h2
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="text-6xl font-black font-mono text-white mb-8 tracking-tighter"
                >
                  SYSTEM
                  <br />
                  OVERVIEW
                </motion.h2>
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 mb-8 origin-left"
                />
              </div>
              
              <div className="lg:col-span-2 space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="bg-white/5 border border-white/10 p-8 backdrop-blur-sm"
                >
                  <h3 className="text-2xl font-bold text-purple-400 mb-4 font-mono">
                    ADVANCED ARCHITECTURE
                  </h3>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    Built on Cloudflare's edge computing platform with distributed processing capabilities. 
                    Handles massive-scale image operations with sub-second response times globally.
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="bg-white/5 border border-white/10 p-8 backdrop-blur-sm"
                >
                  <h3 className="text-2xl font-bold text-blue-400 mb-4 font-mono">
                    INTELLIGENT PROCESSING
                  </h3>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    Leverages multiple AI models for content analysis, automatic tagging, 
                    and semantic search. Real-time image enhancement and optimization.
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  viewport={{ once: true }}
                  className="bg-white/5 border border-white/10 p-8 backdrop-blur-sm"
                >
                  <h3 className="text-2xl font-bold text-pink-400 mb-4 font-mono">
                    ENTERPRISE SECURITY
                  </h3>
                  <p className="text-gray-300 text-lg leading-relaxed">
                    Zero-trust security model with end-to-end encryption. 
                    Comprehensive audit logging and compliance with industry standards.
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-black relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-7xl font-black font-mono text-white mb-8 tracking-tighter">
                CORE MODULES
              </h2>
              <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 w-64 mx-auto mb-8" />
              <p className="text-2xl text-gray-300 max-w-4xl mx-auto font-mono">
                Modular architecture designed for scalability and performance
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <GeometricCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  color={feature.color}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-32 bg-gradient-to-b from-black to-purple-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-7xl font-black font-mono text-white mb-8 tracking-tighter">
                TECH STACK
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {techStack.map(({ icon: Icon, label, description }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  <div className="bg-white/5 border-2 border-white/10 p-8 h-full backdrop-blur-sm group-hover:border-purple-500/50 transition-all duration-300">
                    <Icon className="w-16 h-16 text-purple-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-4 font-mono">{label}</h3>
                    <p className="text-gray-400">{description}</p>
                    
                    {/* Corner decorations */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-black relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20" />
          
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center border-2 border-white/20 p-16 backdrop-blur-sm bg-white/5"
            >
              <h2 className="text-6xl font-black font-mono text-white mb-8 tracking-tighter">
                INITIALIZE SYSTEM
              </h2>
              
              <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 w-48 mx-auto mb-12" />
              
              <p className="text-2xl text-gray-300 mb-16 max-w-3xl mx-auto font-mono">
                Deploy enterprise-grade image management infrastructure in minutes
              </p>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row gap-8 justify-center"
              >
                <Link
                  to="/gallery"
                  className="group relative inline-flex items-center px-16 py-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-bold font-mono tracking-wider uppercase transition-all duration-300 hover:from-purple-700 hover:to-blue-700 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10">ACCESS SYSTEM</span>
                  <ArrowRight className="w-6 h-6 ml-4 relative z-10 group-hover:translate-x-2 transition-transform" />
                </Link>
              </motion.div>
              
              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500" />
            </motion.div>
          </div>
        </section>

        {/* Bottom scrolling text */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-4">
          <ScrollingText 
            text="PIXELVAULT • NEXT-GEN IMAGE PLATFORM • AI-POWERED • EDGE COMPUTING • ENTERPRISE READY"
            className="text-white font-bold text-lg font-mono tracking-widest"
            direction="right"
            speed={25}
          />
        </div>
      </div>
    </div>
  );
}
