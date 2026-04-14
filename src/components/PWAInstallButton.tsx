"use client";

import { useState, useEffect } from "react";
import { DownloadCloud, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export default function PWAInstallButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
       setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // THE "ONE CLICK" EXPERIENCE: Immediately show the browser's install dialog
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback for iOS/Non-supported browsers
      setShowGuide(true);
    }
  };

  if (isInstalled) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-black text-[12px] tracking-widest uppercase transition-all"
      >
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>{t('app_installed') || 'App Installed'}</span>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleInstallClick}
        className={`relative group overflow-hidden px-10 py-5 rounded-[2rem] bg-medical-dark/40 border border-medical-cyan/30 backdrop-blur-2xl transition-all duration-500 shadow-[0_0_40px_rgba(0,229,255,0.15)] flex items-center gap-4 ${className}`}
      >
        {/* Animated Shimmer Beam */}
        <motion.div
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 1
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-medical-cyan/20 to-transparent skew-x-12 pointer-events-none"
        />

        {/* Action Icon */}
        <div className="relative z-10 p-2.5 rounded-xl bg-medical-cyan/10 border border-medical-cyan/20 group-hover:bg-medical-cyan group-hover:text-medical-black transition-all duration-500">
          <DownloadCloud className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" />
        </div>

        {/* Button Text */}
        <div className="relative z-10 flex flex-col items-start translate-y-0.5">
          <span className="text-[12px] font-black tracking-[0.3em] uppercase text-white group-hover:text-medical-cyan transition-colors duration-500">
            {t('pwa_install_btn')}
          </span>
          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 opacity-60">
            Native Desktop & Mobile Experience
          </span>
        </div>
      </motion.button>

      {/* Manual Guide Modal (Only if browser prompt fails) */}
      <AnimatePresence>
        {showGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuide(false)}
              className="absolute inset-0 bg-medical-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg p-10 md:p-14 bg-medical-dark/95 border border-white/10 rounded-[3rem] backdrop-blur-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="space-y-10">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-medical-cyan" />
                      <h4 className="text-white font-black uppercase tracking-[0.3em] text-[12px]">{t('pwa_clinical_access')}</h4>
                    </div>
                    <h2 className="text-3xl font-black text-white italic -skew-x-3">{t('pwa_manual_setup')}</h2>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-gray-400 hover:text-white transition-all">✕</button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/5 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-medical-cyan/10 flex items-center justify-center text-[12px] font-black text-medical-cyan">01</div>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed">{t('pwa_step_1')}</p>
                  </div>
                  <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/5 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-medical-cyan/10 flex items-center justify-center text-[12px] font-black text-medical-cyan">02</div>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed">{t('pwa_step_2')}</p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col items-center gap-4">
                   <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                   <p className="text-[10px] text-gray-500 font-black tracking-[0.2em] uppercase">{t('pwa_secure_env')}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
