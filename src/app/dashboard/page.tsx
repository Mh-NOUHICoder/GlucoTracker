"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BarChart3, TrendingUp, AlertCircle, Droplet, Activity, Calendar, Zap, FileDown, User, ClipboardList, Loader2, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import GlucoseTrendChart from "@/components/GlucoseTrendChart";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Report from "@/components/Report";

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
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [isExporting, setIsExporting] = useState(false);
  const { t, lang } = useI18n();

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        let query = supabase
          .from("glucose_readings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (timeRange !== "all") {
          const now = new Date();
          let startDate = new Date();
          if (timeRange === "7d") startDate.setDate(now.getDate() - 7);
          else if (timeRange === "1m") startDate.setMonth(now.getMonth() - 1);
          else if (timeRange === "3m") startDate.setMonth(now.getMonth() - 3);
          else if (timeRange === "1y") startDate.setFullYear(now.getFullYear() - 1);
          
          query = query.gte("created_at", startDate.toISOString());
        } else {
          query = query.limit(100); 
        }
          
        const { data, error } = await query;
          
        if (!error && data) {
          const deletedStr = localStorage.getItem("deleted_readings") || "[]";
          const deletedIds = JSON.parse(deletedStr);
          const editedStr = localStorage.getItem("edited_readings") || "{}";
          const editedMap = JSON.parse(editedStr);

          const transformedData = data
            .filter((r: any) => !deletedIds.includes(r.id))
            .map((r: any) => ({
              ...r,
              value: editedMap[r.id] !== undefined ? editedMap[r.id] : r.value
            }));

          setReadings(transformedData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (isLoaded) fetchData();
  }, [user, isLoaded, timeRange]);

  useEffect(() => {
    async function fetchInsights() {
      if (readings.length === 0) {
        setAiInsight("");
        return;
      }
      
      const latestReading = readings[0];
      const cacheKey = `insight_data_${latestReading.id}_${lang}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setAiInsight(parsed.insight);
          setLastAnalyzed(parsed.timestamp);
          return;
        } catch (e) {
          // Fallback if parsing fails
        }
      }

      setInsightLoading(true);
      try {
        const response = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readings: readings.slice(0, 10), lang }),
        });
        const data = await response.json();
        if (data.insight) {
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setAiInsight(data.insight);
          setLastAnalyzed(timestamp);
          localStorage.setItem(cacheKey, JSON.stringify({
            insight: data.insight,
            timestamp: timestamp
          }));
        }
      } catch (err) {
        console.error("Failed to fetch insights:", err);
      } finally {
        setInsightLoading(false);
      }
    }

    if (readings.length > 0 && isLoaded) {
      fetchInsights();
    }
  }, [readings[0]?.id, lang, isLoaded]); // Use reading ID as strict dependency

  const handleDownloadReport = async () => {
    const element = document.getElementById("report");
    if (!element) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`GlucoTrack_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const [targetMin, setTargetMin] = useState(70);
  const [targetMax, setTargetMax] = useState(180);
  const [unit, setUnit] = useState("mg/dL");

  useEffect(() => {
    setUnit(localStorage.getItem("glucose_unit") || "mg/dL");
    setTargetMin(Number(localStorage.getItem("target_min") || 70));
    setTargetMax(Number(localStorage.getItem("target_max") || 180));
  }, []);

  const values = readings.map(r => {
    const rawVal = Number(r.value);
    return unit === "mmol/L" ? Number((rawVal / 18.0182).toFixed(1)) : rawVal;
  });

  const displayTargetMin = unit === "mmol/L" ? Number((targetMin / 18.0182).toFixed(1)) : targetMin;
  const displayTargetMax = unit === "mmol/L" ? Number((targetMax / 18.0182).toFixed(1)) : targetMax;

  const avg = values.length ? (unit === "mmol/L" ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : Math.round(values.reduce((a, b) => a + b, 0) / values.length)) : "--";
  const inRange = values.filter(v => v >= displayTargetMin && v <= displayTargetMax).length;
  const inRangePct = values.length ? Math.round((inRange / values.length) * 100) : "--";
  const hypoCount = values.filter(v => v < displayTargetMin).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 md:space-y-8 pb-10"
    >
      {/* Welcome Header */}
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
            {isLoaded && user ? `${t("welcome_back")}, ${user.firstName || "Patient"}` : t("live_overview")}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full lg:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadReport}
            disabled={isExporting || loading}
            className="flex-1 lg:flex-none px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5 text-medical-cyan" />}
            <span className="text-sm">{t("download_report")}</span>
          </motion.button>
          
          <Link href="/upload" className="flex-1 lg:flex-none">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-medical-blue to-medical-cyan text-white font-black flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.5)] transition-all"
            >
              <Plus className="w-6 h-6 stroke-[3px]" /> <span className="text-sm">{t("add_reading")}</span>
            </motion.div>
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {[
          { title: t("recent_average"), value: avg, unit: unit, icon: BarChart3, gradient: "from-blue-500/10 to-medical-cyan/5", border: "border-medical-cyan/20", iconColor: "text-medical-cyan" },
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
                {loading ? (
                  <div className="h-12 w-20 bg-white/5 animate-pulse rounded-xl" />
                ) : metric.value}
              </span>
              <span className="text-xs text-gray-500 font-black uppercase tracking-widest leading-loose">
                {metric.unit}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full border border-white/5 bg-medical-dark/40 backdrop-blur-3xl p-6 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 relative z-10 w-full gap-8">
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
                      timeRange === range.id 
                        ? "bg-medical-cyan text-white shadow-lg shadow-medical-cyan/20" 
                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
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
            <p className="text-gray-500 font-bold animate-pulse text-sm">Synchronizing Data...</p>
          </div>
        ) : readings.length > 0 ? (
          <div className="w-full relative z-10">
             <div className="bg-black/20 p-2 md:p-6 rounded-[2rem] border border-white/5">
                <GlucoseTrendChart 
                   data={readings} 
                   unit={unit}
                   targetMin={targetMin}
                   targetMax={targetMax}
                />
             </div>
             
             <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Insights Card */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-medical-cyan/10 via-medical-dark/40 to-transparent border border-medical-cyan/20 backdrop-blur-xl relative overflow-hidden group/insight"
                >
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-medical-cyan/10 blur-3xl rounded-full" />
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-medical-cyan/20 border border-medical-cyan/30">
                        <Zap className="w-5 h-5 text-medical-cyan" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-medical-cyan">{t("status_report")}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-medical-cyan/10 border border-medical-cyan/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-medical-cyan animate-pulse shadow-[0_0_8px_#06b6d4]" />
                        <span className="text-[10px] font-black text-medical-cyan uppercase tracking-tighter">AI Analysis</span>
                      </div>
                      {lastAnalyzed && (
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mr-2">
                          Analyzed at {lastAnalyzed}
                        </span>
                      )}
                    </div>
                  </div>

                  {insightLoading ? (
                    <div className="space-y-3 mt-4">
                      <div className="h-3 w-full bg-white/5 rounded-full animate-pulse" />
                      <div className="h-3 w-5/6 bg-white/5 rounded-full animate-pulse" />
                      <div className="h-3 w-4/6 bg-white/5 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-gray-200 text-base md:text-lg leading-relaxed font-medium italic relative z-10"
                    >
                      {aiInsight ? `"${aiInsight}"` : (() => {
                         const score = Number(inRangePct);
                         if (isNaN(score)) return t("no_data_desc");
                         if (score >= 90) return `Your glucose levels are exceptional. Maintaining ${score}% in range shows outstanding metabolic control.`;
                         if (score >= 70) return `Great stability! You are ${score}% in range. Keep following your current routine for consistent results.`;
                         if (score >= 50) return `Your readings are fairly stable, but there's room to minimize fluctuations. Consider reviewing your diet with your doctor.`;
                         return `Your levels show significant fluctuations (${score}% in target). We recommend logging activities to identify potential triggers.`;
                      })()}
                    </motion.p>
                  )}
                </motion.div>

                {/* Next Milestone Card */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 md:p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 text-green-400 mb-6 font-black uppercase tracking-widest text-xs">
                      <div className="p-2.5 rounded-xl bg-green-400/10 border border-green-400/20">
                        <Calendar className="w-5 h-5" />
                      </div>
                      {t("next_checkup")}
                    </div>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                      {t("regular_monitoring_tip")}
                    </p>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{t("last_sync")}</span>
                       <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                         <span className="text-[11px] text-medical-cyan font-black">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
            <p className="text-gray-500 max-w-sm mb-10 text-center leading-relaxed font-medium">
              {t("no_data_desc")}
            </p>
            
            <Link href="/upload">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(6,182,212,0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 rounded-full border-2 border-medical-cyan text-medical-cyan hover:bg-medical-cyan/10 transition-all font-black tracking-widest uppercase text-xs flex items-center gap-3"
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
