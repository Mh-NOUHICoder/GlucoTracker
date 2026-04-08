"use client";

import { motion } from "framer-motion";
import UploadButton from "@/components/UploadButton";
import { Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";
export default function UploadPage() {
  const { t } = useI18n();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-8 md:py-16 min-h-[80vh] flex flex-col justify-center"
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Left Side: Copy & Info */}
          <div className="lg:col-span-6 space-y-10">
            <div className="space-y-6 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-cyan/10 border border-medical-cyan/20 text-medical-cyan text-xs font-black uppercase tracking-widest"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-medical-cyan animate-pulse" />
                AI Vision Engine Pro
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-[0.9] lg:max-w-md">
                {t("capture_reading_title")}
              </h1>
              <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t("capture_reading_desc")}
              </p>
            </div>

            {/* Desktop Info Box */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden lg:block p-8 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-medical-cyan/10 flex items-center justify-center">
                <Info className="w-6 h-6 text-medical-cyan" />
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-bold text-lg">{t("best_results")}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                   {t("best_results_desc")}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Interactive Upload */}
          <div className="lg:col-span-6 w-full">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="relative"
            >
              {/* Decorative Glow */}
              <div className="absolute -inset-4 bg-medical-cyan/5 blur-3xl rounded-[3rem] -z-10" />
              
              <UploadButton />
            </motion.div>

            {/* Mobile Info Box (Stacked) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="lg:hidden mt-12 flex items-start gap-4 p-6 rounded-3xl border border-medical-blue/20 bg-medical-blue/5 text-sm text-gray-300"
            >
              <Info className="w-6 h-6 text-medical-cyan shrink-0" />
              <div className="space-y-1">
                <strong className="text-white block">{t("best_results")}</strong>
                <p className="leading-relaxed opacity-80">
                  {t("best_results_desc")}
                </p>
              </div>
            </motion.div>
          </div>
          
        </div>
      </div>
    </motion.div>
  );
}
