"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Activity, ShieldCheck, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t } = useI18n();
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-medical-primary/30 bg-medical-primary/10 text-medical-primary mb-4"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medical-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-medical-primary"></span>
          </span>
          <span className="text-xs font-bold tracking-widest uppercase">{t("ai_powered_tracking")}</span>
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
          {t("intelligent")}<span className="text-transparent bg-clip-text bg-gradient-to-r from-medical-primary to-white italic"> {t("diabetes_care")}</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          {t("landing_subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary !w-full sm:!w-auto px-10"
            >
              {t("open_dashboard")} <ArrowRight className="w-5 h-5" />
            </motion.div>
          </Link>
          <Link href="/upload" className="w-full sm:w-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-secondary !w-full sm:!w-auto px-10"
            >
              {t("scan_reading")}
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
          { icon: Zap, title: t("instant_extraction"), desc: t("instant_extraction_desc") },
          { icon: Activity, title: t("smart_trends"), desc: t("smart_trends_desc") },
          { icon: ShieldCheck, title: t("secure_private"), desc: t("secure_private_desc") },
        ].map((feature, i) => (
          <div key={i} className="p-8 rounded-[2rem] border border-white/5 bg-medical-dark/50 backdrop-blur-sm group hover:border-medical-primary/20 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-medical-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <feature.icon className="w-6 h-6 text-medical-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
