"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { 
  Sparkles, 
  Stethoscope, 
  X, 
  Send, 
  Activity, 
  User, 
  RefreshCw, 
  Volume2, 
  Square,
  ShieldAlert,
  BrainCircuit,
  MessageSquare
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

interface Message {
  role: "user" | "ai";
  content: string;
}

export default function DoctorAIChat() {
  const { user, isLoaded } = useUser();
  const { lang, dir } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingContext, setIsFetchingContext] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic with smoother handling
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  // Initial Greeting with personalization
  useEffect(() => {
    if (isOpen && messages.length === 0 && isLoaded) {
      const name = user?.firstName || (lang === "ar" ? "صديقي" : "there");
      const greeting = lang === "ar" 
        ? `أهلاً بك ${name}. أنا دكتور الذكاء الاصطناعي الخاص بك. لقد قمت بمزامنة سجل بياناتك الحالي، وأنا مستعد لتحليل مستويات الجلوكوز لديك وتقديم نصائح دقيقة. كيف يمكنني مساعدتك الآن؟`
        : `Welcome ${name}. I am your dedicated Doctor AI. I've successfully synchronized with your metabolic history and am ready to provide real-time clinical insights. How can I assist you today?`;
      
      // Delay greeting slightly for premium feel
      setTimeout(() => {
        setMessages([{ role: "ai", content: greeting }]);
      }, 500);
    }
  }, [isOpen, user, lang, isLoaded, messages.length]);

  const toggleSpeech = (text: string, idx: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    if (playingIdx === idx) {
      window.speechSynthesis.cancel();
      setPlayingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const locales: Record<string, string> = { ar: "ar-SA", fr: "fr-FR", en: "en-US" };
    utterance.lang = locales[lang] || "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    
    utterance.onend = () => setPlayingIdx(null);
    utterance.onerror = () => setPlayingIdx(null);
    
    setPlayingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setPlayingIdx(null);
    }

    try {
      setIsFetchingContext(true);
      let readingsContext: any[] = [];
      
      // Attempt to get context from Supabase securely
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from("glucose_readings")
            .select("value, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(12);
          
          if (!error) readingsContext = data || [];
        } catch (sbErr) {
          console.warn("Medical Context Sync Issue:", sbErr);
        }
      }
      setIsFetchingContext(false);

      const apiUrl = "/api/chat";
      const modelId = typeof window !== "undefined" ? localStorage.getItem("preferredModelId") : null;
      const provider = typeof window !== "undefined" ? localStorage.getItem("preferredModelProvider") : null;
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
          lang,
          userName: user?.firstName || "",
          context: readingsContext,
          modelId,
          provider
        }),
      });

      if (!res.ok) throw new Error("API_COMM_FAIL");
      
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
    } catch (error) {
      console.error("Doctor AI Connectivity Error:", error);
      const fallback = lang === "ar" 
        ? "عذراً، أواجه صعوبة في الاتصال بـ 'النواة العصبية'. يرجى المحاولة مرة أخرى أو التحقق من جودة الاتصال." 
        : "I apologize, but I'm having trouble connecting to my clinical neural core. Please try again or check your connectivity.";
      setMessages((prev) => [...prev, { role: "ai", content: fallback }]);
    } finally {
      setIsLoading(false);
      setIsFetchingContext(false);
    }
  };

  if (!isLoaded || !user) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            layoutId="ai-core-main"
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 45 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-[140px] lg:bottom-10 right-6 lg:right-10 z-[70] flex items-center justify-center cursor-pointer pointer-events-auto"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={() => setIsOpen(true)}
          >
            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: -15, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 10, filter: "blur(10px)" }}
                  className={`absolute right-full mr-5 px-4 py-2 bg-black/60 backdrop-blur-xl border border-medical-cyan/30 rounded-full shadow-[0_0_30px_rgba(0,229,255,0.2)] text-[11px] font-black uppercase tracking-[0.2em] text-medical-cyan hidden md:flex items-center gap-2`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'استشارة طبية ذكية' : 'AI Clinical Consult'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Neural Core Trigger */}
            <div className="relative group">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    "0 0 20px rgba(0,229,255,0.3)",
                    "0 0 40px rgba(0,229,255,0.6)",
                    "0 0 20px rgba(0,229,255,0.3)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-tr from-medical-dark via-medical-cyan/40 to-cyan-200 p-[2px] backdrop-blur-3xl overflow-hidden shadow-2xl"
              >
                <div className="w-full h-full rounded-full bg-medical-black flex items-center justify-center relative bg-clip-padding group-hover:bg-medical-cyan/10 transition-colors duration-500">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.2),transparent_70%)] animate-pulse" />
                  <Stethoscope className="w-7 h-7 lg:w-9 lg:h-9 text-medical-cyan relative z-10 transition-all group-hover:scale-110 group-hover:rotate-12" />
                </div>
              </motion.div>
              
              {/* Spinning Orbitals */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-4px] rounded-full border border-dashed border-medical-cyan/30 pointer-events-none"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            layoutId="ai-core-main"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-0 lg:bottom-10 right-0 lg:right-10 w-full lg:w-[450px] h-full lg:h-[700px] lg:max-h-[85vh] z-[80] lg:rounded-[2.5rem] bg-medical-black/80 backdrop-blur-[40px] border-t lg:border border-white/10 shadow-[0_-10px_60px_-10px_rgba(0,0,0,0.8),0_0_80px_-20px_rgba(0,229,255,0.1)] flex flex-col overflow-hidden`}
          >
            {/* Ambient Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-medical-cyan/5 via-transparent to-medical-blue/5 pointer-events-none" />
            
            {/* Header */}
            <header className="px-6 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between relative z-10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-medical-dark to-medical-black border border-medical-cyan/30 flex items-center justify-center shadow-inner group">
                    <BrainCircuit className="w-6 h-6 text-medical-cyan animate-pulse" />
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-medical-black shadow-[0_0_10px_#22c55e]" 
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Neural_OS v2.4</h3>
                    <div className="px-2 py-0.5 rounded-full bg-medical-cyan/10 border border-medical-cyan/20 text-[8px] font-black text-medical-cyan uppercase">CLINICAL_AI</div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Activity className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Live Metabolic Synchronization</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.speechSynthesis?.cancel();
                  setPlayingIdx(null);
                }}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none scroll-smooth" dir={dir}>
              {messages.length === 0 && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                   <MessageSquare className="w-12 h-12 mb-4 text-medical-cyan" />
                   <div className="text-xs font-black uppercase tracking-[0.3em]">{lang === 'ar' ? 'جاري تهيئة النواة...' : 'Initializing Neural Core...'}</div>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div className={`flex items-end gap-3 w-full ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center border shadow-lg ${
                      msg.role === "ai" 
                        ? "bg-medical-dark border-medical-cyan/20 text-medical-cyan" 
                        : "bg-medical-cyan border-medical-cyan/50 text-black"
                    }`}>
                      {msg.role === "ai" ? <BrainCircuit className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    
                    <div className={`max-w-[80%] rounded-[1.8rem] px-5 py-4 text-[13px] leading-relaxed shadow-xl relative overflow-hidden group/text ${
                      msg.role === "user"
                        ? `bg-gradient-to-br from-medical-cyan to-medical-blue text-black font-bold border border-medical-cyan/20 ${dir === 'rtl' ? 'rounded-br-none' : 'rounded-bl-none'}`
                        : `bg-white/5 backdrop-blur-md text-gray-100 border border-white/10 ${dir === 'rtl' ? 'rounded-bl-none' : 'rounded-br-none'}`
                    }`}>
                      {msg.content}
                    </div>
                  </div>

                  {msg.role === "ai" && (
                    <motion.button 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      onClick={() => toggleSpeech(msg.content, idx)}
                      className={`flex items-center gap-2 p-1.5 px-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        playingIdx === idx 
                          ? 'bg-medical-cyan text-black' 
                          : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                      } ${dir === "rtl" ? "mr-12" : "ml-12"}`}
                    >
                      {playingIdx === idx ? (
                        <> <Square className="w-3 h-3 fill-current" /> STOP_AUDIO </>
                      ) : (
                        <> <Volume2 className="w-3.5 h-3.5" /> VOICE_PLAYBACK </>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              ))}

              {(isLoading || isFetchingContext) && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-3">
                   <div className="w-9 h-9 rounded-xl bg-medical-dark border border-medical-cyan/40 text-medical-cyan flex items-center justify-center animate-pulse">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                   </div>
                   <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-[1.8rem] rounded-bl-none flex flex-col gap-2">
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-medical-cyan">
                        <Sparkles className="w-3.5 h-3.5" />
                        {isFetchingContext ? 'SYNCING_CONTEXT...' : 'PROCESSING_CLINICAL_REPLY...'}
                     </div>
                     <div className="flex gap-1">
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-1.5 h-1.5 bg-medical-cyan rounded-full" />
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 bg-medical-cyan rounded-full" />
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 bg-medical-cyan rounded-full" />
                     </div>
                   </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <footer className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-3xl relative z-10">
              <div className="relative group/input">
                 {/* Input Glow */}
                 <div className="absolute inset-[-1px] bg-gradient-to-r from-medical-cyan/30 to-medical-blue/30 rounded-[1.8rem] opacity-0 group-focus-within/input:opacity-100 transition-opacity blur-md" />
                 
                 <div className="relative flex items-center bg-medical-black rounded-[1.8rem] border border-white/10 overflow-hidden px-5 py-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend();
                      }}
                      placeholder={lang === "ar" ? "أدخل استفسارك الطبي هنا..." : "Enter clinical inquiry..."}
                      className={`flex-1 bg-transparent py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none ${dir === "rtl" ? "text-right" : "text-left"}`}
                      dir={dir}
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className={`p-3 rounded-2xl transition-all ${
                        input.trim() && !isLoading 
                          ? "bg-medical-cyan text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]" 
                          : "text-gray-600 bg-white/5"
                      }`}
                    >
                      <Send className={`w-5 h-5 ${dir === "rtl" ? "rotate-180" : ""}`} />
                    </motion.button>
                 </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">
                 <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3" />
                    Medical Advisor Only
                 </div>
                 <div className="w-1 h-1 bg-white/10 rounded-full" />
                 <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    System Active
                 </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}