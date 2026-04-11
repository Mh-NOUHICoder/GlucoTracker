"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Activity, ShieldCheck, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import React, { useMemo } from "react";

// ── Background Components ─────────────────────────────────────────────────────

function BackgroundDynamics() {
  // Deterministic random for purity compliance
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const particles = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => {
      const rand = seededRandom(i);
      // Mostly tiny stars, with a few brighter ones
      const isBright = rand > 0.92;
      const size = isBright 
        ? seededRandom(i + 10) * 2 + 1.5 
        : seededRandom(i + 10) * 1 + 0.5;

      return {
        id: i,
        size,
        x: seededRandom(i + 20) * 100,
        y: seededRandom(i + 30) * 100,
        duration: seededRandom(i + 40) * 4 + 3,
        delay: seededRandom(i + 50) * 5,
        opacity: seededRandom(i + 60) * 0.7 + 0.3,
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#020617]">
      {/* Animated Blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 80, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-medical-cyan/10 blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -80, 0],
          y: [0, 100, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-medical-primary/10 blur-[150px]"
      />
      
      {/* Moving Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(#ffffff05 1px, transparent 1px), linear-gradient(90deg, #ffffff05 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Twinkling Night Sky Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [p.opacity, p.opacity * 0.2, p.opacity],
            scale: p.size > 2 ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
          className="absolute bg-white rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.id % 10 === 0 ? '#06b6d4' : 'white', // Occasional cyan star
            boxShadow: p.size > 2 ? `0 0 10px rgba(255, 255, 255, 0.8)` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { t, dir } = useI18n();

  return (
    <div className="relative min-h-screen">
      <BackgroundDynamics />

      <div className="flex flex-col items-center justify-center pt-10 pb-20 md:pt-6">
        {/* Banner Pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-medical-cyan/20 bg-medical-cyan/5 backdrop-blur-md mb-8"
        >
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medical-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-medical-cyan"></span>
          </div>
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-medical-cyan/80">
            {t("ai_powered_tracking")}
          </span>
        </motion.div>

        {/* Hero Title */}
        <div className="text-center max-w-5xl mx-auto space-y-8 px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className={`text-6xl md:text-8xl font-black tracking-tight text-white leading-[1.15] md:leading-[1.1] py-4 ${dir === "rtl" ? "font-arabic" : ""}`}
          >
            {t("intelligent")}<br />
            <span className="relative inline-block px-4 text-transparent bg-clip-text bg-gradient-to-r from-medical-cyan via-white to-medical-cyan italic background-animate pb-4">
              {t("diabetes_care")}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium"
          >
            {t("landing_subtitle")}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10"
          >
            <Link href="/dashboard" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary !px-14 !py-5 shadow-[0_20px_50px_rgba(0,229,255,0.3)] !text-base"
              >
                {t("open_dashboard")}
                <ArrowRight className={`w-5 h-5 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </motion.button>
            </Link>
            <Link href="/upload" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
                whileTap={{ scale: 0.95 }}
                className="btn-secondary !px-14 !py-5 !text-base"
              >
                {t("scan_reading")}
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Feature Highlights */}
        <div className="w-full mt-40 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { 
                icon: Zap, 
                title: t("instant_extraction"), 
                desc: t("instant_extraction_desc"),
                glow: "group-hover:shadow-[0_0_50px_rgba(0,229,255,0.15)]"
              },
              { 
                icon: Activity, 
                title: t("smart_trends"), 
                desc: t("smart_trends_desc"),
                glow: "group-hover:shadow-[0_0_50px_rgba(16,185,129,0.15)]"
              },
              { 
                icon: ShieldCheck, 
                title: t("secure_private"), 
                desc: t("secure_private_desc"),
                glow: "group-hover:shadow-[0_0_50px_rgba(99,102,241,0.15)]"
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 + i * 0.1 }}
                whileHover={{ y: -8 }}
                className={`relative group p-10 rounded-[3rem] border border-white/5 bg-white/[0.02] backdrop-blur-3xl overflow-hidden transition-all duration-500 ${feature.glow}`}
              >
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-medical-cyan/20 group-hover:border-medical-cyan/30 transition-all duration-500">
                    <feature.icon className="w-8 h-8 text-white group-hover:text-medical-cyan transition-colors" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 tracking-tight italic -skew-x-3 uppercase">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 text-base leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
                {/* Subtle internal glow */}
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-medical-cyan/5 blur-[60px] rounded-full group-hover:bg-medical-cyan/10 transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-20 opacity-30"
        >
          <div className="w-1 h-12 rounded-full bg-gradient-to-b from-medical-cyan to-transparent" />
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes background-animate {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .background-animate {
          background-size: 200% 200%;
          animation: background-animate 5s ease infinite;
        }
      `}</style>
    </div>
  );
}
