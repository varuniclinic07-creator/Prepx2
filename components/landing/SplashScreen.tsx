'use client';

import { motion } from 'motion/react';
import { useEffect } from 'react';

const PARTICLES = [
  { scale: 0.8, yEnd: -150, opacityPeak: 0.5, xEnd: 15, duration: 8, delay: 0, left: '25%', bottom: '15%', size: 4 },
  { scale: 0.6, yEnd: -120, opacityPeak: 0.4, xEnd: -10, duration: 6, delay: 0.8, left: '60%', bottom: '20%', size: 3 },
  { scale: 0.9, yEnd: -180, opacityPeak: 0.6, xEnd: -20, duration: 7, delay: 1.6, left: '40%', bottom: '10%', size: 5 },
  { scale: 0.7, yEnd: -140, opacityPeak: 0.3, xEnd: 25, duration: 9, delay: 2.4, left: '75%', bottom: '25%', size: 3.5 },
  { scale: 0.5, yEnd: -100, opacityPeak: 0.4, xEnd: 5, duration: 5, delay: 3.2, left: '15%', bottom: '30%', size: 2.5 },
  { scale: 0.85, yEnd: -160, opacityPeak: 0.5, xEnd: -15, duration: 8.5, delay: 4.0, left: '85%', bottom: '12%', size: 4.5 },
];

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // 6 seconds total duration before navigating away
    const timer = setTimeout(onComplete, 6000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
      exit={{ opacity: 0, filter: "blur(20px)", transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] } }}
    >
      {/* Cinematic Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#050505] z-0" />
        
        {/* Parallax Silhouettes of Freedom Fighters */}
        <motion.div 
          initial={{ x: '-10%', opacity: 0, scale: 1.1 }}
          animate={{ x: '5%', opacity: 0.15, scale: 1 }}
          transition={{ duration: 6, ease: "easeOut" }}
          className="absolute bottom-0 w-[150%] h-[50vh] md:h-[60vh] left-[-20%] z-0"
          style={{
            maskImage: 'linear-gradient(to top, black 20%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 80%)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" className="w-full h-full fill-white blur-[4px] md:blur-[6px]">
            <g>
              {/* Leader */}
              <circle cx="715" cy="85" r="10" />
              <path d="M705,200 L712,120 Q715,105 718,120 L725,200 Z" />
              <path d="M710,110 L680,140 L685,145 L713,120" /> 
              <path d="M718,110 L735,140 L730,145" />

              {/* Followers */}
              <circle cx="650" cy="95" r="9" />
              <path d="M642,200 L647,130 Q650,115 653,130 L658,200 Z" />
              <path d="M647,125 L630,150 L635,155 L650,135" />

              <circle cx="580" cy="100" r="9" />
              <path d="M572,200 L577,135 Q580,120 583,135 L588,200 Z" />
              
              <circle cx="500" cy="105" r="8" />
              <path d="M493,200 L497,140 Q500,125 503,140 L507,200 Z" />
              
              <circle cx="430" cy="110" r="8" />
              <path d="M424,200 L428,145 Q430,130 432,145 L436,200 Z" />

              <g transform="translate(-90, 10) scale(0.95)">
                 <circle cx="430" cy="110" r="8" />
                 <path d="M424,200 L428,145 Q430,130 432,145 L436,200 Z" />
              </g>
              <g transform="translate(-170, 20) scale(0.9)">
                 <circle cx="430" cy="110" r="8" />
                 <path d="M424,200 L428,145 Q430,130 432,145 L436,200 Z" />
              </g>
              <g transform="translate(-240, 28) scale(0.85)">
                 <circle cx="430" cy="110" r="8" />
                 <path d="M424,200 L428,145 Q430,130 432,145 L436,200 Z" />
              </g>
              <g transform="translate(-300, 35) scale(0.8)">
                 <circle cx="430" cy="110" r="8" />
                 <path d="M424,200 L428,145 Q430,130 432,145 L436,200 Z" />
              </g>
            </g>
          </svg>
        </motion.div>

        {/* Second Background Silhouette Layer for More Parallax Depth */}
        <motion.div 
          initial={{ x: '-5%', opacity: 0, scale: 1.05 }}
          animate={{ x: '10%', opacity: 0.08, scale: 1 }}
          transition={{ duration: 7, ease: "easeOut", delay: 0.2 }}
          className="absolute bottom-[5%] w-[200%] h-[40vh] md:h-[50vh] left-[-40%] z-0"
          style={{
            maskImage: 'linear-gradient(to top, black 10%, transparent 70%)',
            WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 70%)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" className="w-full h-full fill-white blur-[8px] md:blur-[12px]">
            <path d="M400,200 Q450,150 500,160 T600,140 T700,150 T800,120 L800,200 Z" />
            <path d="M100,200 Q200,160 300,150 T400,170 L400,200 Z" />
          </svg>
        </motion.div>

        {/* Subtle Tricolor Glows */}
        <motion.div 
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[10%] w-[60vh] h-[40vh] bg-[#FF9933]/10 rounded-full blur-[120px] z-10 mix-blend-screen"
        />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[35%] left-[30%] w-[50vh] h-[40vh] bg-white/5 rounded-full blur-[100px] z-10 mix-blend-screen"
        />
        <motion.div 
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] right-[10%] w-[60vh] h-[40vh] bg-[#138808]/10 rounded-full blur-[120px] z-10 mix-blend-screen"
        />

        {/* Cinematic Noise / Grain */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30 z-10" />
        
        {/* Soft Ambient Light Rays */}
        <motion.div 
          initial={{ opacity: 0, rotate: 15 }}
          animate={{ opacity: 0.3, rotate: 20 }}
          transition={{ duration: 6, ease: "easeOut" }}
          className="absolute top-[-20%] left-[20%] w-[100%] h-[50%] bg-gradient-to-b from-white/5 to-transparent blur-[60px] transform origin-top-left z-10 pointer-events-none"
        />

        {/* Slow drifting particles */}
        {PARTICLES.map((p, i) => (
          <motion.div 
            key={i}
            initial={{ y: 0, opacity: 0, scale: p.scale }}
            animate={{ 
              y: p.yEnd, 
              opacity: [0, p.opacityPeak, 0],
              x: p.xEnd
            }}
            transition={{ 
              duration: p.duration, 
              delay: p.delay, 
              ease: "linear",
              repeat: Infinity
            }}
            className="absolute rounded-full blur-[1px] bg-white/40 shadow-[0_0_10px_#fff] z-20"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
          />
        ))}
      </div>

      {/* Main Content Container with Slow Drift */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-30 flex flex-col items-center justify-center text-center px-6"
      >
        <motion.p
          initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
          animate={{ opacity: 0.6, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 1.8, delay: 0.8, ease: "easeOut" }}
          className="text-white/60 font-sans text-[10px] md:text-xs tracking-[0.4em] uppercase mb-6 md:mb-8"
        >
          Dedicated to
        </motion.p>
        
        <motion.h1
          initial={{ opacity: 0, filter: "blur(12px)", scale: 0.95 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: 2.2, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-3xl md:text-5xl lg:text-7xl text-white tracking-[0.08em] font-light leading-[1.15] drop-shadow-[0_0_50px_rgba(255,255,255,0.35)] mb-2"
        >
          <span className="block">VARUNYA</span>
          <span className="block text-white/40 text-2xl md:text-3xl lg:text-4xl tracking-[0.5em] font-sans font-light my-1 md:my-2">
            &&
          </span>
          <span className="block">RUDRANSH</span>
          <span className="block text-white/80 text-xl md:text-3xl lg:text-4xl tracking-[0.3em] font-sans font-light mt-1">
            SHARMA
          </span>
        </motion.h1>

        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "60px", opacity: 0.5 }}
          transition={{ duration: 1.8, delay: 3, ease: "easeInOut" }}
          className="h-[1px] bg-gradient-to-r from-transparent via-white to-transparent my-10"
        />

        <motion.p
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 0.8, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.8, delay: 3.5, ease: "easeOut" }}
          className="text-white/80 font-sans text-sm md:text-lg font-light italic tracking-wide"
        >
          For every dreamer preparing to serve the nation.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
