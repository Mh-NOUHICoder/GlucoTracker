"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, UploadCloud, History, LayoutDashboard, Settings, Globe, ChevronDown, User, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useI18n, Language } from "@/lib/i18n";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
];

function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = languages.find((l) => l.code === lang);

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-medical-dark/50 border border-medical-cyan/20 backdrop-blur-md hover:border-medical-cyan/50 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
      >
        <span className="text-lg">{currentLang?.flag}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-300 hidden sm:block">{lang}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute top-full mt-2 right-0 w-40 bg-medical-dark/90 border border-medical-cyan/30 rounded-2xl overflow-hidden backdrop-blur-xl z-[60] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-medical-cyan/10 
                  ${lang === l.code ? "bg-medical-cyan/20 text-medical-cyan font-bold" : "text-gray-400"}`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const { t } = useI18n();

  const links = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("upload"), href: "/upload", icon: UploadCloud },
    { name: t("history"), href: "/history", icon: History },
    { name: t("ai_setup"), href: "/models", icon: Settings },
  ];

  return (
    <>
      {/* Top Header */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-medical-black/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-18 md:h-20 items-center justify-between py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-medical-cyan/20 blur-lg rounded-full animate-pulse" />
                <Activity className="h-7 w-7 text-medical-cyan relative z-10" />
              </div>
              <span className="font-black text-xl md:text-2xl tracking-tighter text-white">
                Gluco<span className="text-medical-cyan">Track</span> AI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 bg-white/5 p-1 rounded-2xl border border-white/5">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all rounded-xl ${
                      isActive 
                        ? "text-white bg-medical-cyan/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]" 
                        : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-medical-cyan" : ""}`} />
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 border border-medical-cyan/30 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Actions: Lang, Profile */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              
              <div className="h-8 w-[1px] bg-white/10 mx-1 hidden sm:block" />

              {!isLoaded ? (
                <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
              ) : isSignedIn ? (
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors hidden sm:flex"
                  >
                    <Bell className="w-5 h-5 text-gray-400" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-medical-cyan rounded-full border-2 border-medical-black" />
                  </motion.button>

                  <Link href="/profile">
                    <motion.div 
                      whileHover={{ scale: 1.05, borderColor: "#06b6d4" }}
                      whileTap={{ scale: 0.95 }}
                      className="relative group p-0.5 rounded-full border-2 border-white/10 hover:border-medical-cyan transition-all duration-300"
                    >
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden">
                        {user?.imageUrl ? (
                          <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-medical-dark flex items-center justify-center text-medical-cyan">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-full bg-medical-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                    </motion.div>
                  </Link>
                </div>
              ) : (
                <SignInButton mode="modal">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-medical-blue to-medical-cyan text-white text-sm font-bold shadow-lg shadow-medical-cyan/20 hover:shadow-medical-cyan/40 transition-all border border-white/10"
                  >
                    {t("sign_in_save")}
                  </motion.button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-6 left-0 right-0 z-[60] flex justify-center md:hidden pointer-events-none">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
          className="bg-medical-dark/70 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-1 pointer-events-auto"
        >
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.name} href={link.href}>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`relative p-4 rounded-full transition-all ${
                    isActive ? "text-medical-cyan" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? "drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" : ""}`} />
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute inset-0 bg-medical-cyan/10 rounded-full border border-medical-cyan/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </>
  );
}

