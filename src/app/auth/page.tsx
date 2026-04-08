"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export default function AuthPage() {
  const [showSignIn, setShowSignIn] = useState(true);
  const { t } = useI18n();

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 bg-medical-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[500px]"
      >
        <div className="w-full mb-10 text-center">
           <h1 className="text-4xl font-black text-white mb-3 tracking-tighter">
             {showSignIn ? t("welcome_back") : t("create_account")}
           </h1>
           <p className="text-gray-500 font-medium text-base">
             {t("auth_sync_desc")}
           </p>
        </div>

        <div className="w-full flex justify-center">
           <AnimatePresence mode="wait">
             <motion.div
               key={showSignIn ? "signin" : "signup"}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 10 }}
               className="w-full flex justify-center"
             >
                {showSignIn ? (
                  <SignIn routing="hash" signUpUrl="#" />
                ) : (
                  <SignUp routing="hash" signInUrl="#" />
                )}
             </motion.div>
           </AnimatePresence>
        </div>

        <div className="mt-10 flex justify-center">
           <button 
             onClick={() => setShowSignIn(!showSignIn)}
             className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-medical-cyan text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all shadow-xl"
           >
             {showSignIn ? t("no_account") : t("have_account")}
           </button>
        </div>
      </motion.div>
    </div>
  );
}
