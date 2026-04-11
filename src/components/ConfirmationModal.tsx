"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger",
  isLoading = false
}: ConfirmationModalProps) {
  const { t } = useI18n();

  const colors = {
    danger: {
      primary: "bg-red-500",
      hover: "hover:bg-red-600",
      border: "border-red-500/20",
      glow: "shadow-red-500/20",
      icon: "text-red-500",
      iconBg: "bg-red-500/10"
    },
    warning: {
      primary: "bg-yellow-500",
      hover: "hover:bg-yellow-600",
      border: "border-yellow-500/20",
      glow: "shadow-yellow-500/20",
      icon: "text-yellow-500",
      iconBg: "bg-yellow-500/10"
    },
    info: {
      primary: "bg-medical-primary",
      hover: "hover:bg-medical-primary/80",
      border: "border-medical-primary/20",
      glow: "shadow-medical-primary/20",
      icon: "text-medical-primary",
      iconBg: "bg-medical-primary/10"
    }
  };

  const style = colors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-medical-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-md bg-medical-dark/90 border ${style.border} rounded-[2.5rem] p-8 shadow-2xl overflow-hidden`}
          >
            {/* Background Decorative Element */}
            <div className={`absolute -top-24 -end-24 w-48 h-48 ${style.primary} opacity-5 blur-[80px] rounded-full`} />
            <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-medical-cyan/20 to-transparent" />

            <div className="relative z-10">
              {/* Header Icon */}
              <div className="flex justify-center mb-6">
                <div className={`w-20 h-20 rounded-3xl ${style.iconBg} border border-white/5 flex items-center justify-center shadow-inner relative group`}>
                  <div className={`absolute inset-0 rounded-3xl ${style.primary} opacity-20 blur-xl group-hover:opacity-40 transition-opacity`} />
                  {variant === "danger" ? (
                    <Trash2 className={`w-10 h-10 ${style.icon}`} />
                  ) : (
                    <AlertCircle className={`w-10 h-10 ${style.icon}`} />
                  )}
                </div>
              </div>

              {/* Text Content */}
              <div className="text-center space-y-3 mb-8">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {title}
                </h3>
                <p className="text-gray-400 font-medium leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/5 text-gray-400 font-bold text-sm uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all order-2 sm:order-1"
                >
                  {cancelText || t("cancel")}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-4 px-6 rounded-2xl ${style.primary} text-black font-black text-sm uppercase tracking-widest shadow-lg ${style.glow} ${style.hover} hover:-translate-y-0.5 transition-all active:scale-[0.95] flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    variant === "danger" ? <Trash2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />
                  )}
                  {confirmText || (variant === "danger" ? t("delete") : t("confirm"))}
                </button>
              </div>
            </div>

            {/* Close Button X */}
            <button
              onClick={onClose}
              className="absolute top-6 end-6 p-2 rounded-xl bg-white/5 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
