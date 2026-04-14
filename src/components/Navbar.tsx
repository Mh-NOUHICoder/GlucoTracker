"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  UploadCloud, 
  History, 
  LayoutDashboard, 
  Settings, 
  ChevronDown, 
  User, 
  Bell, 
  Bluetooth,
  Zap,
  Globe,
  LogOut,
  Users,
  DownloadCloud
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { SignInButton, useUser, useClerk } from "@clerk/nextjs";
import { useI18n, Language } from "@/lib/i18n";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "ar", label: "AR", flag: "🇲🇦" },
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

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-medical-cyan/30 transition-all font-black text-[10px] tracking-widest text-gray-400 hover:text-white"
      >
        <Globe className="w-3.5 h-3.5 text-medical-cyan" />
        <span>{lang.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-32 bg-medical-dark/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-2xl z-[100] shadow-2xl"
          >
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-medical-cyan/10
                  ${lang === l.code ? "text-medical-cyan bg-medical-cyan/5" : "text-gray-400 hover:text-white"}`}
              >
                <div className="flex items-center gap-2">
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </div>
                {lang === l.code && <div className="w-1 h-1 rounded-full bg-medical-cyan animate-pulse" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



function UserMenu() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { t } = useI18n();
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

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group p-[1px] block"
      >
        <div className={`absolute inset-0 rounded-full border transition-colors duration-300 ${isOpen ? "border-medical-cyan border-2" : "border-medical-cyan/30 group-hover:border-medical-cyan"}`} />
        <div className="absolute -top-0.5 -right-0.5 z-20">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-medical-black shadow-[0_0_8px_#22c55e] animate-pulse" />
        </div>
        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-medical-black border border-white/5 mx-auto">
          {user?.imageUrl ? (
            <Image 
              src={user.imageUrl} 
              alt="Profile" 
              width={36} 
              height={36} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-medical-cyan">
              <User className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-medical-cyan/0 group-hover:bg-medical-cyan/5 transition-colors pointer-events-none" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-3 right-0 w-64 bg-medical-dark/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-3xl z-[100] shadow-2xl p-2"
          >
            <div className="px-4 py-3 border-b border-white/5 mb-2 bg-white/5 rounded-xl">
               <div className="flex flex-col gap-0.5">
                 <p className="text-[10px] font-black tracking-[0.2em] text-medical-cyan uppercase truncate">
                   {user?.fullName || 'Active Patient'}
                 </p>
                 <p className="text-[8px] font-medium text-gray-400 truncate tracking-wider opacity-70">
                   {user?.primaryEmailAddress?.emailAddress}
                 </p>
               </div>
            </div>

            <div className="space-y-1">
              <Link href="/profile" onClick={() => setIsOpen(false)}>
                <motion.div 
                  whileHover={{ x: 5, backgroundColor: "rgba(0, 229, 255, 0.1)" }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-medical-cyan/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-medical-cyan" />
                  </div>
                  <span>{t('profile')}</span>
                </motion.div>
              </Link>

              <button 
                onClick={() => {
                  setIsOpen(false);
                  openUserProfile(); 
                }}
                className="w-full"
              >
                <motion.div 
                  whileHover={{ x: 5, backgroundColor: "rgba(0, 229, 255, 0.1)" }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-medical-cyan/10 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-medical-cyan" />
                  </div>
                  <span>{t('switch_account')}</span>
                </motion.div>
              </button>

              <div className="h-px bg-white/5 my-2 mx-2" />

              <button 
                onClick={() => signOut()}
                className="w-full"
              >
                <motion.div 
                  whileHover={{ x: 5, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400/80 hover:text-red-400 transition-all cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <LogOut className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('sign_out')}</span>
                </motion.div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const NavLink = ({ link, isActive, t }: { link: any, isActive: boolean, t: any }) => {
  const Icon = link.icon;
  
  return (
    <Link
      href={link.href}
      className={`relative px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-500 group ${
        isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
      }`}
    >
      <div className="relative z-10 flex items-center gap-2.5">
        <Icon className={`w-4 h-4 transition-all duration-500 ${isActive ? "scale-110 text-medical-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" : "group-hover:scale-110 group-hover:text-medical-cyan"}`} />
        <span className="relative">
          {link.name}
        </span>
      </div>

      {isActive && (
        <motion.div
          layoutId="desktop-active-glide"
          className="absolute inset-0 z-0"
          initial={false}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          {/* Subtle blurred beam integrated into nav */}
          <div className="absolute inset-x-2 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-medical-cyan to-transparent shadow-[0_0_15px_#00e5ff]" />
          <div className="absolute inset-0 bg-medical-cyan/5 blur-sm rounded-xl" />
        </motion.div>
      )}
    </Link>
  );
};

export default function Navbar() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowOpacity = useSpring(0, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
    glowOpacity.set(1);
  };

  const links = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("upload"), href: "/upload", icon: UploadCloud },
    { name: t("connections"), href: "/connections", icon: Bluetooth },
    { name: t("history"), href: "/history", icon: History },
    { name: t("preferences"), href: "/models", icon: Settings },
  ];

  const navScale = useTransform(scrollY, [0, 80], [1, 0.97]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5 px-4 pointer-events-none">
        <motion.nav 
          style={{ scale: navScale }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => glowOpacity.set(0)}
          className={`pointer-events-auto w-full max-w-6xl flex items-center justify-between px-6 py-2 rounded-[2rem] border transition-all duration-1000 relative ${
            scrolled 
              ? "bg-medical-black/80 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl" 
              : "bg-medical-dark/40 border-white/5 backdrop-blur-2xl"
          }`}
        >
          {/* Integrated Dynamic Background Glow */}
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none z-0">
            <motion.div 
              style={{ left: glowX, top: glowY, opacity: glowOpacity }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-medical-cyan/5 blur-[60px]"
            />
          </div>

          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-4 group z-10 py-1">
            <div className="relative flex items-center justify-center w-10 h-10">
              <div className="absolute inset-0 border border-medical-cyan/20 rounded-xl group-hover:rotate-90 transition-transform duration-700" />
              <Activity className="w-5 h-5 text-medical-cyan group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border-2 border-medical-black shadow-[0_0_8px_#22c55e]" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white uppercase group-hover:text-medical-cyan transition-colors">
              Gluco<span className="text-medical-cyan font-black">Track</span>
            </span>
          </Link>

          {/* New Smooth Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 relative z-10">
            {links.map((link) => (
              <NavLink key={link.name} link={link} isActive={pathname === link.href} t={t} />
            ))}
          </div>

          {/* Action Area */}
          <div className="flex items-center gap-4 z-10">

            <LanguageSwitcher />

            {!isLoaded ? (
              <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse" />
            ) : isSignedIn ? (
              <UserMenu />
            ) : (
              <SignInButton mode="modal">
                <button className="px-5 py-2 bg-medical-cyan text-black font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg hover:shadow-cyan-500/30 transition-all">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </motion.nav>
      </div>

      {/* Mobile Interaction Dock: Smooth Morphing Border */}
      <div className="fixed bottom-10 left-0 right-0 z-[60] flex justify-center lg:hidden pointer-events-none px-6">
        <motion.div 
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="bg-medical-black/80 backdrop-blur-[40px] border border-white/10 p-2 rounded-[3rem] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] flex items-center justify-between w-full max-w-[400px] pointer-events-auto relative"
        >
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.name} href={link.href} className="flex-1 flex justify-center py-2 relative">
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  className={`relative p-3 rounded-full transition-all duration-300 z-10 ${isActive ? "text-medical-cyan" : "text-gray-500 hover:text-gray-400"}`}
                >
                  <div className="relative z-10 flex items-center justify-center">
                    <Icon className={`w-6.5 h-6.5 transition-all duration-500 ${isActive ? "scale-110 drop-shadow-[0_0_10px_rgba(0,229,255,0.6)]" : ""}`} />
                  </div>
                </motion.div>

                {/* Smooth Gliding Magic Ring */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-border-glide"
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full border border-medical-cyan shadow-[0_0_20px_rgba(0,229,255,0.2)] z-0"
                    initial={false}
                    transition={{ 
                      type: "spring", 
                      stiffness: 450, 
                      damping: 35,
                      mass: 1
                    }}
                  >
                     <div className="absolute inset-0 bg-medical-cyan/10 rounded-full blur-[4px]" />
                  </motion.div>
                )}
              </Link>
            );
          })}
        </motion.div>
      </div>
    </>
  );
}
