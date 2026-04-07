"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export default function AuthPage() {
  const [showSignIn, setShowSignIn] = useState(true);
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto pt-16 flex flex-col items-center"
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          {showSignIn ? t("welcome_back") : t("create_account")}
        </h1>
        <p className="text-gray-400">
          {t("auth_sync_desc")}
        </p>
      </div>

      <div className="w-full flex justify-center">
        {showSignIn ? (
          <SignIn routing="hash" />
        ) : (
          <SignUp routing="hash" />
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => setShowSignIn(!showSignIn)}
          className="text-medical-cyan hover:underline text-sm font-medium"
        >
          {showSignIn
            ? t("no_account")
            : t("have_account")}
        </button>
      </div>
    </motion.div>
  );
}
