"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { Sparkles, Stethoscope, X, Send, Activity, User, RefreshCw, Volume2, Square } from "lucide-react";
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
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial Greeting
  useEffect(() => {
    if (isOpen && messages.length === 0 && isLoaded) {
      const name = user?.firstName || (lang === "ar" ? "يا صديقي" : "there");
      const greeting = lang === "ar" 
        ? `مرحباً بك ${name}. أنا دكتور الذكاء الاصطناعي، طبيبك الاستشاري المساعد. أنا متصل بنظام بيانات جلوكوتراك الخاص بك المباشر، كيف يمكنني مساعدتك في إدارة مستويات الجلوكوز اليوم؟`
        : `Hello ${name}. I am Doctor AI, your caring specialist. I'm actively connected to your live history. How can I assist you with your glucose management today?`;
      setMessages([{ role: "ai", content: greeting }]);
    }
  }, [isOpen, user, lang, messages.length, isLoaded]);

  const toggleSpeech = (text: string, idx: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    if (playingIdx === idx) {
      window.speechSynthesis.cancel();
      setPlayingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Set language based on active setting
    if (lang === "ar") utterance.lang = "ar-SA";
    else if (lang === "fr") utterance.lang = "fr-FR";
    else utterance.lang = "en-US";
    
    utterance.onend = () => {
      setPlayingIdx(null);
    };
    
    utterance.onerror = () => {
      setPlayingIdx(null);
    };
    
    setPlayingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    // Stop speaking if new message is sent
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setPlayingIdx(null);
    }

    try {
      let readingsContext: any[] = [];
      if (user?.id) {
         const { data: readings, error: sbError } = await supabase
            .from("glucose_readings")
            .select("value, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);
         
         if (sbError) console.error("Supabase Context Error:", sbError);
         readingsContext = readings || [];
      }

      console.log("Doctor AI: Sending chat request...");
      const apiUrl = typeof window !== "undefined" ? `${window.location.origin}/api/chat` : "/api/chat";
      
      const preferredModelId = typeof window !== "undefined" ? localStorage.getItem("preferredModelId") : null;
      const preferredModelProvider = typeof window !== "undefined" ? localStorage.getItem("preferredModelProvider") : null;
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
          lang,
          userName: user?.firstName || "",
          context: readingsContext,
          modelId: preferredModelId,
          provider: preferredModelProvider
        }),
      }).catch(err => {
        console.error("Fetch Execution Error:", err);
        throw err;
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error("Failed to fetch response");
      }
      
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
    } catch (error: any) {
      console.error("Doctor AI Send Error:", error);
      const fallback = lang === "ar" 
        ? "عذراً، أواجه مشكلة في الاتصال بنظام الذكاء الاصطناعي. يرجى التأكد من اتصالك بالإنترنت وإيقاف أي ملحقات للمتصفح قد تحجب الطلبات." 
        : "I apologize, I'm having trouble connecting to my neural core. Please check your internet connection and ensure no browser extensions are blocking the request.";
      setMessages((prev) => [...prev, { role: "ai", content: fallback }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show if user is loaded and signed in (optional, but requested to greet by name from Clerk)
  if (!isLoaded || !user) return null;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            layoutId="ai-core-container"
            className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-[45] sm:z-[60] flex items-center justify-center cursor-pointer"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: -10 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-full mr-4 whitespace-nowrap bg-medical-dark/90 text-white px-3 py-1.5 rounded-full text-sm font-medium border border-cyan-500/30 backdrop-blur-md shadow-lg pointer-events-none"
                >
                  {lang === 'ar' ? 'اسأل دكتور الذكاء الاصطناعي' : 'Ask Dr. AI'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Glowing morphing sphere */}
            <motion.div
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-300 flex items-center justify-center relative overflow-hidden"
              animate={{
                boxShadow: ["0 0 20px #00e5ff", "0 0 40px #00e5ff", "0 0 20px #00e5ff"],
                scale: isHovered ? 1.05 : 1,
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 bg-white/20 blur-md rounded-full pointer-events-none animate-pulse"></div>
              {/* Inner core effect */}
              <div className="absolute inset-2 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm pointer-events-none" />
              <Stethoscope className="w-8 h-8 text-medical-black z-10" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="ai-core-container"
            className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[600px] max-h-[80vh] sm:max-h-[85vh] z-[60] rounded-2xl overflow-hidden flex flex-col backdrop-blur-xl bg-white/5 border border-white/10 shadow-[0_0_50px_rgba(0,229,255,0.15)] origin-bottom-right"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-[0_0_15px_#00e5ff] p-[2px]">
                    <div className="bg-medical-dark w-full h-full rounded-full flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>
                  {/* Live Sync Indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-medical-dark rounded-full shadow-[0_0_10px_#22c55e] animate-pulse"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-wide">Doctor AI</h3>
                  <div className="flex items-center gap-1.5 opacity-80">
                    <Activity className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Live Sync Active</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                     window.speechSynthesis.cancel();
                     setPlayingIdx(null);
                  }
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10" dir={dir}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div className={`flex items-end gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"} w-full`}>
                    {msg.role === "ai" && (
                       <div className="w-8 h-8 rounded-full bg-cyan-900/40 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                         <Sparkles className="w-4 h-4 text-cyan-400" />
                       </div>
                    )}
                    <div
                      className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? `bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-md ${dir === 'rtl' ? 'rounded-2xl rounded-bl-none' : 'rounded-2xl rounded-br-none'}`
                          : `bg-white/10 text-gray-100 border border-white/5 shadow-sm ${dir === 'rtl' ? 'rounded-2xl rounded-br-none' : 'rounded-2xl rounded-bl-none'}`
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-600 shadow-inner">
                         <User className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Speech Button correctly aligned beneath AI messages */}
                  {msg.role === "ai" && (
                    <motion.div 
                       initial={{ opacity: 0 }} 
                       animate={{ opacity: 1 }}
                       className={`flex items-center gap-2 mt-1 ${dir === "rtl" ? "mr-[42px]" : "ml-[42px]"}`}
                    >
                      <button 
                         onClick={() => toggleSpeech(msg.content, idx)}
                         className={`p-1.5 rounded-full flex items-center justify-center border transition-all ${
                           playingIdx === idx 
                             ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' 
                             : 'bg-white/5 text-gray-400 border-transparent hover:text-white hover:bg-white/10'
                         }`}
                         title={lang === "ar" ? "قراءة التقرير" : "Read aloud"}
                      >
                         {playingIdx === idx ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2.5">
                   <div className="w-8 h-8 rounded-full bg-cyan-900/40 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                       <Sparkles className="w-4 h-4 text-cyan-400" />
                   </div>
                   <div className={`px-4 py-3 bg-white/5 text-cyan-400 border border-white/5 flex items-center gap-2 shadow-sm ${dir === 'rtl' ? 'rounded-2xl rounded-br-none' : 'rounded-2xl rounded-bl-none'}`}>
                     <RefreshCw className="w-4 h-4 animate-spin" />
                     <span className="text-xs font-medium">{lang === 'ar' ? 'أقوم بالتحليل...' : 'Analyzing...'}</span>
                   </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/40">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  placeholder={lang === "ar" ? "اسأل دكتور الذكاء الاصطناعي..." : "Ask Doctor AI..."}
                  className={`w-full bg-white/5 border border-white/10 rounded-full px-5 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all ${dir === "rtl" ? "pl-12" : "pr-12"}`}
                  dir={dir}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`absolute ${dir === "rtl" ? "left-2" : "right-2"} p-2.5 rounded-full transition-colors ${
                    input.trim() && !isLoading ? "text-cyan-400 hover:bg-cyan-500/20" : "text-gray-600 cursor-not-allowed"
                  }`}
                >
                  <Send className={`w-5 h-5 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
