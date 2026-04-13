"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BarChart3, TrendingUp, AlertCircle, Droplet, Activity, Calendar, Zap, Loader2, ChevronDown, Check, Volume2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useI18n, translateName } from "@/lib/i18n";
import GlucoseTrendChart from "@/components/GlucoseTrendChart";
import dynamic from "next/dynamic";
const PDFDownloadBtn = dynamic(() => import("@/components/PDFDownloadBtn"), { ssr: false });
import Report from "@/components/Report";
import localforage from "localforage";
import { convertGlucose } from "@/lib/units";

export interface GlucoseReading {
  id: string;
  value: string | number;
  created_at: string;
  user_id?: string;
}

type TimeRange = "7d" | "1m" | "3m" | "1y" | "all";

function TimeRangeDropdown({ current, onChange }: { current: TimeRange, onChange: (val: TimeRange) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const ranges: { id: TimeRange; label: string }[] = [
    { id: "7d", label: t("last_7_days") },
    { id: "1m", label: t("last_month") },
    { id: "3m", label: t("last_3_months") },
    { id: "1y", label: t("last_year") },
    { id: "all", label: t("all_time") },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = ranges.find(r => r.id === current)?.label;

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full sm:w-48 px-5 py-3 bg-medical-dark/50 border border-medical-cyan/20 rounded-2xl text-white font-bold text-sm backdrop-blur-md shadow-lg"
      >
        <span className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-medical-cyan" />
          {currentLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 bg-medical-dark/95 border border-medical-cyan/30 rounded-2xl overflow-hidden backdrop-blur-xl z-[40] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            {ranges.map((range) => (
              <button
                key={range.id}
                onClick={() => {
                  onChange(range.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm transition-all hover:bg-medical-cyan/10 
                  ${current === range.id ? "bg-medical-cyan/20 text-medical-cyan font-bold" : "text-gray-400"}`}
              >
                {range.label}
                {current === range.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string>("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  // removed isExporting state - not needed
  const { t, lang } = useI18n();

  const [targetMin, setTargetMin] = useState(70);
  const [targetMax, setTargetMax] = useState(180);
  const [unit, setUnit] = useState<"mg/dL" | "mmol/L" | "g/L">("mg/dL");

  useEffect(() => {
    const loadPrefs = () => {
      const savedUnit = localStorage.getItem("glucose_unit");
      if (savedUnit === "mg/dL" || savedUnit === "mmol/L" || savedUnit === "g/L") {
        setUnit(savedUnit);
      }
      setTargetMin(Number(localStorage.getItem("target_min") || 70));
      setTargetMax(Number(localStorage.getItem("target_max") || 180));
    };

    loadPrefs();

    const handleUpdate = () => {
      loadPrefs();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("settings-update", handleUpdate);
    
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("settings-update", handleUpdate);
    };
  }, []);

  const speakInsight = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map internal lang to speech locales
    const locales: Record<string, string> = { en: "en-US", fr: "fr-FR", ar: "ar-SA" };
    utterance.lang = locales[lang] || "en-US";
    
    // Soft, calm voice settings
    utterance.pitch = 0.95; 
    utterance.rate = 0.9;
    utterance.volume = 0.8;

    // Try to find a professional sounding voice for the locale
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith(utterance.lang) && (v.name.includes("Natural") || v.name.includes("Premium") || v.name.includes("Google")));
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const runInsights = useCallback(async (freshReadings: GlucoseReading[], forceRefresh = false, shouldSpeak = false) => {
    if (!freshReadings || freshReadings.length === 0) {
      setAiInsight("");
      return;
    }

    // Smart cache: key by latest reading ID + timeRange + lang
    const latestId = freshReadings[0]?.id;
    const cacheKey = `insight_v2_${latestId}_${timeRange}_${lang}`;
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAiInsight(parsed.insight);
          setLastAnalyzed(parsed.timestamp);
          if (shouldSpeak) speakInsight(parsed.insight);
          return; // ✅ Serve from cache, no API call
        } catch {
          // Cache corrupt, fall through to API
        }
      }
    }

    setInsightLoading(true);
    setAiInsight("");

    try {
      const preferredModelId = localStorage.getItem("preferredModelId");
      const preferredModelProvider = localStorage.getItem("preferredModelProvider");

      const response = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store"
        },
        cache: "no-store",
        body: JSON.stringify({
          readings: freshReadings.slice(0, 15),
          timeRange,
          lang,
          modelId: preferredModelId,
          provider: preferredModelProvider
        }),
      });
      const data = await response.json();
      if (data.insight) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setAiInsight(data.insight);
        setLastAnalyzed(timestamp);
        // 💾 Save to cache so next visit doesn't re-analyze
        localStorage.setItem(cacheKey, JSON.stringify({ insight: data.insight, timestamp }));
        
        // Auto-read the new insight
        speakInsight(data.insight);
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setInsightLoading(false);
    }
  }, [timeRange, lang, speakInsight]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setDbError(false);
    try {
      // Show cached data immediately for fast UI, but don't trigger insights from it
      const cacheKey = `dashboard_readings_${user.id}_${timeRange}`;
      const cached = await localforage.getItem(cacheKey);
      if (cached) {
        setReadings(cached as GlucoseReading[]);
        setLoading(false);
      }

      let query = supabase
        .from("glucose_readings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (timeRange !== "all") {
        const now = new Date();
        const startDate = new Date();
        if (timeRange === "7d") startDate.setDate(now.getDate() - 7);
        else if (timeRange === "1m") startDate.setMonth(now.getMonth() - 1);
        else if (timeRange === "3m") startDate.setMonth(now.getMonth() - 3);
        else if (timeRange === "1y") startDate.setFullYear(now.getFullYear() - 1);
        query = query.gte("created_at", startDate.toISOString());
      } else {
        query = query.limit(100); 
      }
        
      const { data, error } = await query;
        
      if (error) throw error;
      
      if (data) {
        const deletedStr = localStorage.getItem("deleted_readings") || "[]";
        const deletedIds = JSON.parse(deletedStr);
        const editedStr = localStorage.getItem("edited_readings") || "{}";
        const editedMap = JSON.parse(editedStr);

        const transformedData = data
          .filter((r: { id: string }) => !deletedIds.includes(r.id))
          .map((r: GlucoseReading) => {
            const edited = editedMap[r.id];
            return {
              ...r,
              value: edited?.value !== undefined ? edited.value : r.value,
              created_at: edited?.created_at !== undefined ? edited.created_at : r.created_at
            };
          });

        setReadings(transformedData);
        setLastSync(new Date());
        await localforage.setItem(cacheKey, transformedData);

        // ✅ Always run AI analysis on the FRESH data from Supabase
        await runInsights(transformedData);
      }
    } catch (err) {
      console.error("Database Connection Issue:", err);
      setDbError(true);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange, runInsights]);

  useEffect(() => {
    if (isLoaded) fetchData();
  }, [isLoaded, fetchData]);


  // Clear only old-format stale insight caches on mount (insight_data_ prefix)
  useEffect(() => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("insight_data_")) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }, []);



  // PDF download handled via PDFDownloadLink component; no custom function needed

  const displayTargetMin = convertGlucose(targetMin, unit);
  const displayTargetMax = convertGlucose(targetMax, unit);

  const validReadings = readings.filter(r => r.value !== null && r.value !== "" && !isNaN(Number(r.value)));
  
  const rawAvg = validReadings.length ? validReadings.reduce((a, b) => a + Number(b.value), 0) / validReadings.length : 0;
  const eA1c = validReadings.length ? ((rawAvg + 46.7) / 28.7).toFixed(1) : "--";
  
  const values = validReadings.map(r => convertGlucose(Number(r.value), unit));
  const avg = values.length 
      ? (unit === "mg/dL" ? Math.round(values.reduce((a, b) => a + Number(b), 0) / values.length).toString() : (values.reduce((a, b) => a + Number(b), 0) / values.length).toFixed(unit === "g/L" ? 2 : 1)) 
      : "--";
  const inRange = values.filter(v => Number(v) >= displayTargetMin && Number(v) <= displayTargetMax).length;
  const inRangePct = values.length ? Math.round((inRange / values.length) * 100).toString() : "--";
  const hypoCount = values.filter(v => Number(v) < displayTargetMin).length;

  const [weeklyPattern, setWeeklyPattern] = useState("");
  
  useEffect(() => {
     if (readings.length === 0) return;
     const patterns: Record<string, number[]> = {};
     readings.forEach(r => {
        const d = new Date(r.created_at);
        const day = d.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = d.getHours();
        let timeOfDay = "night";
        if (hour >= 6 && hour < 12) timeOfDay = "morning";
        else if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
        else if (hour >= 18 && hour < 22) timeOfDay = "evening";
        const key = `${day} ${timeOfDay}s`;
        if (!patterns[key]) patterns[key] = [];
        patterns[key].push(Number(r.value));
     });
     
     let highestAvg = 0;
     let highestKey = "";
     for (const key in patterns) {
        if (patterns[key].length >= 2) {
           const a = patterns[key].reduce((acc, val) => acc + val, 0) / patterns[key].length;
           if (a > highestAvg) {
              highestAvg = a;
              highestKey = key;
           }
        }
     }
     
     if (highestAvg > targetMax) {
         setWeeklyPattern(t("spike_pattern")
           .replace("{time}", highestKey)
           .replace("{value}", Math.round(highestAvg).toString()));
      } else if (values.length > 5 && hypoCount === 0 && Number(inRangePct) > 85) {
         setWeeklyPattern(t("stability_pattern"));
      } else {
         setWeeklyPattern(t("collect_more_data"));
      }
   }, [readings, targetMax, inRangePct, hypoCount, values.length, t]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-6 md:py-10 space-y-6 md:space-y-8 pb-10"
    >
      <AnimatePresence>
        {dbError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-xs">{t("db_error")}</h3>
                <p className="text-red-200/60 text-xs font-medium mt-1">{t("syncing_context")}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchData()}
              className="px-6 py-2.5 bg-red-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all"
            >
              {t("confirm")} {t("live_sync")}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-br from-medical-dark to-medical-black p-6 md:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-medical-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-medical-cyan/10 border border-medical-cyan/20">
              <Activity className="w-5 h-5 text-medical-cyan" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">{t("dashboard")}</h1>
          </div>
          <p className="text-gray-400 font-medium flex items-center gap-2 pl-1">
            {isLoaded && user ? `${t("welcome_back")}, ${translateName(user.firstName || "Patient", lang)}` : t("live_overview")}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full lg:w-auto">
          {readings.length > 0 && !loading && (
            <PDFDownloadBtn
              userFullName={user?.fullName}
              userEmail={user?.primaryEmailAddress?.emailAddress}
              readings={readings}
              unit={unit}
              targetMin={targetMin}
              targetMax={targetMax}
              lang={lang}
              label={t("download_report")}
            />
          )}
          
          <Link href="/upload" className="flex-1 lg:flex-none">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-[#00e5ff] text-black font-black rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.3)] flex items-center justify-center gap-2 uppercase tracking-widest text-sm transition-all hover:bg-[#70f3ff]"
            >
              <Plus className="w-6 h-6 stroke-[3px]" /> 
              <span>{t("add_reading")}</span>
            </motion.button>
          </Link>
        </div>
      </div>

      <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
        <Report 
          userEmail={user?.primaryEmailAddress?.emailAddress} 
          userName={user?.fullName || "Patient"} 
          readings={readings} 
          unit={unit}
          targetMin={targetMin}
          targetMax={targetMax}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {[
          { title: t("recent_average"), value: avg, unit: unit, icon: BarChart3, gradient: "from-blue-500/10 to-medical-cyan/5", border: "border-medical-cyan/20", iconColor: "text-medical-cyan" },
          { title: t("estimated_a1c"), value: eA1c, unit: "%", icon: Activity, gradient: "from-purple-500/10 to-pink-500/5", border: "border-purple-500/20", iconColor: "text-purple-400" },
          { title: t("target_range"), value: inRangePct, unit: `% (${displayTargetMin}-${displayTargetMax})`, icon: TrendingUp, gradient: "from-green-500/10 to-emerald-500/5", border: "border-green-500/20", iconColor: "text-green-400" },
          { title: t("hypo_events"), value: hypoCount, unit: t("events"), icon: AlertCircle, gradient: "from-red-500/10 to-orange-500/5", border: "border-red-500/20", iconColor: "text-red-400" },
        ].map((metric, i) => (
           <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 md:p-8 rounded-[2.5rem] border ${metric.border} bg-gradient-to-br ${metric.gradient} backdrop-blur-xl shadow-xl flex flex-col justify-between h-full relative overflow-hidden group`}
          >
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity duration-500">
              <metric.icon className="w-16 h-16" />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                <metric.icon className={`w-6 h-6 ${metric.iconColor}`} />
              </div>
              <h3 className="font-bold text-gray-400 tracking-wider text-[11px] uppercase">{metric.title}</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl md:text-6xl font-black text-white tracking-tighter">
                {loading ? <div className="h-12 w-20 bg-white/5 animate-pulse rounded-xl" /> : metric.value}
              </span>
              <span className="text-xs text-gray-500 font-black uppercase tracking-widest leading-loose">{metric.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full border border-white/5 bg-medical-dark/40 backdrop-blur-3xl p-6 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 relative z-50 w-full gap-8">
           <div>
            <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
              <div className="w-2 h-8 bg-medical-cyan rounded-full" />
              {t("trend_trajectory")}
            </h2>
            <p className="text-gray-500 text-sm mt-1 ml-5 font-medium">{t("showing_recent_readings")}</p>
           </div>
           
           <div className="w-full lg:w-auto">
             <div className="hidden lg:flex items-center gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                {[
                  { id: "7d", label: t("last_7_days") },
                  { id: "1m", label: t("last_month") },
                  { id: "3m", label: t("last_3_months") },
                  { id: "1y", label: t("last_year") },
                  { id: "all", label: t("all_time") },
                ].map((range) => (
                  <button 
                    key={range.id}
                    onClick={() => setTimeRange(range.id as TimeRange)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                      timeRange === range.id ? "bg-medical-cyan text-white shadow-lg shadow-medical-cyan/20" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
             </div>
             <div className="block lg:hidden w-full">
               <TimeRangeDropdown current={timeRange} onChange={(val) => setTimeRange(val)} />
             </div>
           </div>
        </div>

        {loading ? (
          <div className="w-full h-[350px] flex flex-col justify-center items-center gap-4">
            <div className="w-16 h-16 border-4 border-medical-cyan/20 border-t-medical-cyan rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse text-sm">{t("sync_data")}</p>
          </div>
        ) : readings.length > 0 ? (
          <div className="w-full relative z-10">
             <div className="bg-black/20 p-2 md:p-6 rounded-[2rem] border border-white/5">
                <GlucoseTrendChart data={readings} unit={unit} targetMin={targetMin} targetMax={targetMax} />
             </div>
             <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-medical-cyan/10 via-medical-dark/40 to-transparent border border-medical-cyan/20 backdrop-blur-xl relative overflow-hidden group/insight">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-medical-cyan/10 blur-3xl rounded-full" />
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-medical-cyan/20 border border-medical-cyan/30">
                        <Zap className={`w-5 h-5 text-medical-cyan ${insightLoading ? 'animate-pulse' : ''}`} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-medical-cyan">{t("status_report")}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2 relative z-[60]">
                      <div className="flex items-center gap-2">
                        {aiInsight && !insightLoading && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              speakInsight(aiInsight);
                            }}
                            className="p-2 sm:p-1.5 rounded-full bg-medical-cyan/10 border border-medical-cyan/20 text-medical-cyan hover:bg-medical-cyan/20 transition-all shadow-lg"
                            title="Read aloud"
                          >
                            <Volume2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.9 }}
                           disabled={insightLoading}
                           onClick={(e) => {
                             e.stopPropagation();
                             runInsights(readings, true, true);
                           }}
                           className="flex items-center gap-2.5 px-5 py-2.5 sm:px-3 sm:py-1.5 rounded-full bg-medical-cyan/15 border border-medical-cyan/30 hover:bg-medical-cyan/25 transition-all group disabled:opacity-50 touch-manipulation shadow-lg shadow-medical-cyan/5 active:bg-medical-cyan/40"
                         >
                          <div className={`w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full bg-medical-cyan ${insightLoading ? 'animate-pulse' : ''} shadow-[0_0_10px_#06b6d4]`} />
                          <span className="text-[11px] sm:text-[10px] font-black text-medical-cyan uppercase tracking-wider group-hover:scale-105 transition-transform">{t("ai_analysis")}</span>
                        </motion.button>
                      </div>
                      {lastAnalyzed && <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mr-2">{t("analyzed_at")} {lastAnalyzed}</span>}
                    </div>
                  </div>
                  {insightLoading ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-medical-cyan animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">{t("analyzing")}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-white/5 rounded-full animate-pulse" />
                        <div className="h-3 w-5/6 bg-white/5 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-gray-200 text-base md:text-lg leading-relaxed font-medium italic relative z-10"
                    >
                      {aiInsight ? `"${aiInsight}"` : t("collect_more_data")}
                    </motion.p>
                  )}
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 md:p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 text-purple-400 mb-6 font-black uppercase tracking-widest text-xs">
                       <div className="p-2.5 rounded-xl bg-purple-400/10 border border-purple-400/20">
                         <Activity className="w-5 h-5" />
                       </div>
                       {t("weekly_patterns")}
                    </div>
                    <div className="text-gray-200 text-sm md:text-base font-medium leading-relaxed italic">{weeklyPattern || t("collect_more_data")}</div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{t("last_sync")}</span>
                       <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                         <span className="text-[11px] text-medical-cyan font-black">{lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                       </div>
                    </div>
                  </div>
                </motion.div>
             </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-20 relative z-10">
            <div className="w-28 h-28 rounded-full bg-medical-cyan/5 flex items-center justify-center mb-8 border border-medical-cyan/10 group-hover:scale-110 transition-transform duration-500">
               <Droplet className="w-14 h-14 text-medical-cyan/30" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">{t("no_data")}</h2>
            <p className="text-gray-500 max-w-sm mb-10 text-center leading-relaxed font-medium">{t("no_data_desc")}</p>
            <Link href="/upload">
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                className="btn-secondary px-10 !py-4 !w-auto !rounded-full !border-medical-cyan !text-medical-cyan hover:!bg-medical-cyan/10"
              >
                <Plus className="w-5 h-5 stroke-[3px]" /> {t("start_tracking")}
              </motion.button>
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
