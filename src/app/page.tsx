"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Activity, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto space-y-8"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-medical-cyan/30 bg-medical-cyan/10 text-medical-cyan mb-4"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medical-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-medical-cyan"></span>
          </span>
          <span className="text-xs font-medium tracking-wide uppercase">AI-Powered Tracking</span>
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
          Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-medical-blue-light to-medical-cyan">Diabetes</span> Care
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Monitor your glucose levels effortlessly using advanced AI image recognition. Just valid insights, zero friction.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/dashboard">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-medical-blue to-medical-cyan text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-medical-blue/25 w-full sm:w-auto"
            >
              Open Dashboard <ArrowRight className="w-5 h-5" />
            </motion.div>
          </Link>
          <Link href="/upload">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-full border border-medical-blue/30 bg-medical-dark/50 text-white font-medium flex items-center justify-center hover:bg-medical-blue/10 transition-colors w-full sm:w-auto"
            >
              Scan Reading
            </motion.div>
          </Link>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24"
      >
        {[
          { icon: Zap, title: "Instant Extraction", desc: "Our AI reads your meter display instantly from photos." },
          { icon: Activity, title: "Smart Trends", desc: "Visualize patterns and predict potential hypo/hyperglycemic events." },
          { icon: ShieldCheck, title: "Secure & Private", desc: "Your health data is encrypted and completely under your control." },
        ].map((feature, i) => (
          <div key={i} className="p-6 rounded-2xl border border-medical-blue/10 bg-medical-dark/40 backdrop-blur-sm">
            <feature.icon className="w-8 h-8 text-medical-cyan mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
