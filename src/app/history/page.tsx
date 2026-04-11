"use client";

import { motion, AnimatePresence } from "framer-motion";
import { History as HistoryIcon, Clock, Activity, Calendar, Trash2, Pencil, Check, X, AlertCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback, useRef } from "react";
import { useScroll, useTransform } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import localforage from "localforage";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ConfirmationModal";


type GlucoseReading = {
  id: string;
  value: number | string;
  created_at: string;
  source?: string;
  [key: string]: unknown;
};

export default function HistoryPage() {
  const { user, isLoaded } = useUser();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [unit, setUnit] = useState("mg/dL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "danger"
  });
  const { t, lang } = useI18n();

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 30%", "end end"]
  });

  const beadTop = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  useEffect(() => {
    setUnit(localStorage.getItem("glucose_unit") || "mg/dL");
  }, []);

  const formatValue = (val: number) => {
     if (unit === "mmol/L") return (val / 18.0182).toFixed(1);
     if (unit === "g/L") return (val / 100).toFixed(2);
     return val.toString();
  };

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Offline-first: load instantly from cache
      const cached = await localforage.getItem(`readings_${user.id}`);
      if (cached) {
        setReadings(cached as GlucoseReading[]);
        setLoading(false);
      }

      const { data, error } = await supabase
        .from("glucose_readings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (!error && data) {
        // Apply Virtual Delete Filter
        const deletedStr = localStorage.getItem("deleted_readings") || "[]";
        const deletedIds = JSON.parse(deletedStr);
        
        // Apply Virtual Edit Overlays
        const editedStr = localStorage.getItem("edited_readings") || "{}";
        const editedMap = JSON.parse(editedStr);
        const transformedData: GlucoseReading[] = data
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
        await localforage.setItem(`readings_${user.id}`, transformedData);
      }
    } catch (err) {
      console.error(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded) {
      fetchHistory();
    }
  }, [isLoaded, fetchHistory]);

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t("delete_reading_title") || "Permanently Delete?",
      message: t("delete_confirm"),
      variant: "danger",
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id: string) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      // 1. Database Delete
      if (user) {
        const { error } = await supabase.from("glucose_readings").delete().eq("id", id);
        if (error) throw error;
      }

      // 2. Local Virtual Filter (Persistent safety)
      const deletedStr = localStorage.getItem("deleted_readings") || "[]";
      const deletedIdsArr = JSON.parse(deletedStr);
      if (!deletedIdsArr.includes(id)) {
        deletedIdsArr.push(id);
        localStorage.setItem("deleted_readings", JSON.stringify(deletedIdsArr));
      }

      // 3. Local State Sync
      const nextReadings = readings.filter(r => r.id !== id);
      setReadings(nextReadings);
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      
      // 4. Update IndexedDB Cache
      if (user) {
        await localforage.setItem(`readings_${user.id}`, nextReadings);
      }

      toast.success(t("reading_delete_success"));
    } catch (err) {
      toast.error(t("reading_delete_failed"));
      console.error("Delete failed:", err);
    }
  };

  const handleBulkDelete = () => {
    if (!user || selectedIds.size === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: t("delete_multiple_title") || "Batch Deletion",
      message: t("bulk_delete_confirm").replace("{n}", selectedIds.size.toString()),
      variant: "danger",
      onConfirm: executeBulkDelete
    });
  };

  const executeBulkDelete = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      
      // 1. Supabase Delete
      const { error } = await supabase
        .from("glucose_readings")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      // 2. Local Virtual Filter Sync
      const deletedStr = localStorage.getItem("deleted_readings") || "[]";
      let deletedIdsArr = JSON.parse(deletedStr);
      deletedIdsArr = Array.from(new Set([...deletedIdsArr, ...idsToDelete]));
      localStorage.setItem("deleted_readings", JSON.stringify(deletedIdsArr));

      // 3. Local State Sync
      const nextReadings = readings.filter(r => !selectedIds.has(r.id));
      setReadings(nextReadings);
      
      // 4. Update IndexedDB Cache
      if (user) {
        await localforage.setItem(`readings_${user.id}`, nextReadings);
      }
      
      setSelectedIds(new Set());
      toast.success(t("bulk_delete_success").replace("{n}", idsToDelete.length.toString()));
    } catch (err) {
      toast.error(t("bulk_delete_failed"));
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };


  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === readings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readings.map(r => r.id)));
    }
  };

  const startEditing = (id: string, value: number, createdAt: string) => {
    setEditingId(id);
    setEditValue(value.toString());
    
    const d = new Date(createdAt);
    // YYYY-MM-DD
    setEditDate(d.toISOString().split('T')[0]);
    // HH:MM
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setEditTime(`${hh}:${mm}`);
  };

  const handleUpdate = async (id: string) => {
    let val = parseFloat(editValue);
    if (isNaN(val)) return toast.error("Invalid number");

    // Normalize back to mg/dL before saving
    if (unit === "mmol/L") val = val * 18.0182;
    if (unit === "g/L") val = val * 100;
    
    // Round to precision to avoid float issues
    val = Math.round(val);

    try {
      // Create new timestamp from split inputs
      const newCreatedAt = new Date(`${editDate}T${editTime}`).toISOString();

      // Save to Virtual Edit Overlay
      const editedStr = localStorage.getItem("edited_readings") || "{}";
      const editedMap = JSON.parse(editedStr);
      editedMap[id] = { 
        value: val, 
        created_at: newCreatedAt 
      };
      localStorage.setItem("edited_readings", JSON.stringify(editedMap));

      // Update local state
      setReadings(prev => prev.map(r => r.id === id ? { ...r, value: val, created_at: newCreatedAt } : r));
      setEditingId(null);
      toast.success(t("reading_update_success"));
    } catch (err) {
      toast.error(t("reading_update_failed"));
      console.error("Virtual update failed:", err);
    }
  };

  // Group readings by date for the timeline view
  const groupedReadings = readings.reduce((acc, reading) => {
    const date = new Date(reading.created_at);
    // Locale-aware format: 'Friday, April 10, 2026'
    const dateKey = date.toLocaleDateString(lang, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    if (acc.length === 0 || acc[acc.length - 1].date !== dateKey) {
      acc.push({ date: dateKey, items: [reading] });
    } else {
      acc[acc.length - 1].items.push(reading);
    }
    return acc;
  }, [] as { date: string, items: GlucoseReading[] }[]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-6 md:py-10 space-y-8 pb-10"
    >
      <div className="relative group overflow-hidden rounded-[2.5rem]">
        {/* Animated Mesh Background Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-medical-primary/5 via-transparent to-medical-cyan/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-medical-primary/10 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-medical-cyan/10 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-medical-black/40 backdrop-blur-2xl p-8 md:p-10 border border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 hover:border-medical-primary/20">
          
          {/* Subtle Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 z-10 w-full md:w-auto">
            <div 
              onClick={toggleSelectAll}
              className="flex items-center gap-5 cursor-pointer group/selectall transition-all hover:scale-[1.02] active:scale-95"
            >
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${selectedIds.size === readings.length && readings.length > 0 ? "bg-medical-primary border-medical-primary shadow-[0_0_25px_rgba(0,229,255,0.4)]" : "bg-medical-dark border-white/10 group-hover/selectall:border-medical-primary/50 group-hover/selectall:shadow-[0_0_15px_rgba(0,229,255,0.1)]"}`}>
                   {selectedIds.size === readings.length && readings.length > 0 ? (
                      <Check className="w-7 h-7 text-black" strokeWidth={4} />
                   ) : (
                      <div className="w-5 h-5 rounded-lg border-2 border-white/20 transition-all group-hover/selectall:border-medical-primary/40 group-hover/selectall:scale-110" />
                   )}
                </div>
                {selectedIds.size > 0 && selectedIds.size < readings.length && (
                   <div className="absolute -top-1 -right-1 w-4 h-4 bg-medical-primary rounded-full border-2 border-medical-dark shadow-lg animate-bounce" />
                )}
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-primary/40 group-hover/selectall:text-medical-primary transition-colors">
                   {selectedIds.size === readings.length ? t("deselect_all") : t("select_all")}
                 </span>
                 <span className="text-xs font-bold text-gray-500 group-hover/selectall:text-gray-400 transition-colors">
                   {selectedIds.size} {t("selected")}
                 </span>
              </div>
            </div>

            <div className="hidden sm:block w-[1px] h-12 bg-white/5" />

            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic">
                {t("manage_readings")}
              </h1>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-medical-primary animate-pulse shadow-[0_0_8px_#00e5ff]" />
                 <p className="text-medical-cyan/60 font-black text-[10px] uppercase tracking-widest">{t("sync_message")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
             <div className="relative group/icon">
                <div className="absolute inset-0 bg-medical-primary/20 blur-2xl rounded-full opacity-0 group-hover/icon:opacity-100 transition-opacity duration-500" />
                <div className="p-4 rounded-[2rem] bg-medical-black border border-medical-primary/30 text-medical-primary shadow-[0_0_20px_-5px_#00e5ff] relative z-10 transition-transform duration-500 group-hover/icon:-translate-y-1">
                  <HistoryIcon className="w-8 h-8 animate-[spin_10s_linear_infinite]" />
                </div>
             </div>
          </div>
        </div>
      </div>


      {loading ? (
        <div className="w-full flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-medical-primary/20 border-t-medical-primary rounded-full animate-spin shadow-[0_0_20px_rgba(255,158,94,0.2)]"></div>
        </div>
      ) : readings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full flex-col min-h-[400px] border border-medical-blue/10 bg-medical-dark/30 rounded-3xl p-8 flex items-center justify-center text-center shadow-xl"
        >
          <div className="w-20 h-20 rounded-full bg-medical-cyan/5 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-medical-cyan/40" />
          </div>
          <h2 className="text-2xl font-bold text-gray-200 mb-3">{t("no_history")}</h2>
          <p className="text-gray-500 max-w-sm mb-8 text-sm leading-relaxed">
            {user ? "Try recording your first reading with the AI vision camera." : "Please sign in to manage your health data."}
          </p>
        </motion.div>
      ) : (
        <div className="relative space-y-12">
          {/* Global Continuous Timeline Line */}
          <div className="absolute start-[11px] top-6 bottom-0 w-[1px] z-0 bg-white/5">
            <motion.div 
              style={{ scaleY: scrollYProgress }}
              className="w-full h-full origin-top bg-gradient-to-b from-medical-cyan via-medical-cyan to-medical-cyan/10"
            />
            
            {/* Lead Point (The 'current' position bead) */}
            <motion.div
              style={{ top: beadTop, opacity }}
              className="absolute start-[-3.5px] w-2 h-2 rounded-full bg-medical-cyan shadow-[0_0_15px_#00e5ff] z-20"
            />

            {/* Traveling Pulses (Multiple beads) */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  top: ['0%', '100%'],
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  duration: 4 + (i * 2), 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: i * 1.5
                }}
                className="absolute start-[-1.5px] w-[4px] h-20 bg-gradient-to-b from-transparent via-medical-cyan/50 to-transparent blur-[1px] z-10"
              />
            ))}
          </div>

          {groupedReadings.map((group) => (
            <div key={group.date} className="relative ps-8">
              {/* Sticky Date Header */}
              <div className="sticky top-6 z-20 mb-8 -ms-8 flex items-center gap-4">
                <div className="w-[23px] h-[23px] rounded-full bg-medical-dark border border-medical-cyan/30 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-medical-cyan shadow-[0_0_8px_#00e5ff]" />
                </div>
                <div className="backdrop-blur-xl bg-medical-black/60 px-4 py-1.5 rounded-full border border-medical-cyan/20 shadow-lg">
                  <h2 className="text-[10px] md:text-xs font-black text-medical-cyan/60 uppercase tracking-[0.3em]">
                    {group.date}
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode='popLayout'>
                  {group.items.map((reading) => {
                    const val = Number(reading.value);
                    const isHigh = val > 180;
                    const isLow = val < 70;
                    const dateObj = new Date(reading.created_at);
                    const timeStr = dateObj.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

                    return (
                      <motion.div
                        key={reading.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50, scale: 0.95 }}
                        onClick={(e) => toggleSelect(reading.id, e)}
                        className={`group relative flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl bg-medical-dark/40 shadow-xl border transition-all backdrop-blur-md cursor-pointer ${selectedIds.has(reading.id) ? "border-medical-primary ring-1 ring-medical-primary/20 bg-medical-primary/[0.03]" : "border-white/5 hover:border-medical-primary/30"}`}
                      >
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full">
                          <div className="flex items-center gap-4 w-full">
                            {/* Selection Checkbox */}
                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all ${selectedIds.has(reading.id) ? "bg-medical-primary border-medical-primary shadow-[0_0_8px_#00e5ff]" : "border-white/10 group-hover:border-medical-primary/50"}`}>
                              {selectedIds.has(reading.id) && <Check className="w-4 h-4 text-black" strokeWidth={4} />}
                            </div>

                            <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border ${isHigh ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : isLow ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                              <Activity className="w-6 h-6" />
                            </div>
                            
                            <div className="flex-1">
                              {editingId === reading.id ? (
                                <div className="flex flex-col gap-5 p-5 rounded-[2rem] bg-medical-black/60 border border-medical-primary/30 shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom-2 duration-300">
                                   <div className="space-y-4">
                                     {/* Glucose Value Field */}
                                     <div>
                                        <label className="text-[10px] uppercase font-black tracking-widest text-medical-primary mb-2 block ps-1">{t("glucose_value")}</label>
                                        <div className="relative">
                                          <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                                            <Activity className="w-5 h-5 text-medical-primary/40" />
                                          </div>
                                          <input 
                                            type="number" 
                                            value={editValue} 
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-full bg-medical-dark/80 border border-white/5 rounded-2xl ps-12 pe-16 py-4 text-white text-2xl font-black focus:outline-none focus:border-medical-primary focus:ring-4 focus:ring-medical-primary/10 transition-all placeholder:text-gray-700 shadow-inner"
                                            placeholder="000"
                                          />
                                          <div className="absolute inset-y-0 end-0 pe-4 flex items-center pointer-events-none">
                                            <span className="text-xs font-black text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">{t(unit === "mg/dL" ? "mg_dl" : unit === "g/L" ? "g_l" : "mmol_l")}</span>
                                          </div>
                                        </div>
                                     </div>

                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                       {/* Date Field */}
                                       <div>
                                          <label className="text-[10px] uppercase font-black tracking-widest text-medical-cyan/50 mb-2 block ps-1">{t("date")}</label>
                                          <div className="relative">
                                            <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                                              <Calendar className="w-5 h-5 text-medical-cyan/30" />
                                            </div>
                                            <input 
                                              type="date" 
                                              value={editDate} 
                                              onChange={(e) => setEditDate(e.target.value)}
                                              className="w-full bg-medical-dark/80 border border-white/5 rounded-2xl ps-12 pe-4 py-4 text-gray-200 text-sm font-bold focus:outline-none focus:border-medical-cyan focus:ring-4 focus:ring-medical-cyan/10 transition-all shadow-inner"
                                            />
                                          </div>
                                       </div>

                                       {/* Time Field */}
                                       <div>
                                          <label className="text-[10px] uppercase font-black tracking-widest text-medical-cyan/50 mb-2 block ps-1">{t("time")}</label>
                                          <div className="relative">
                                            <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                                              <Clock className="w-5 h-5 text-medical-cyan/30" />
                                            </div>
                                            <input 
                                              type="time" 
                                              value={editTime} 
                                              onChange={(e) => setEditTime(e.target.value)}
                                              className="w-full bg-medical-dark/80 border border-white/5 rounded-2xl ps-12 pe-4 py-4 text-gray-200 text-sm font-bold focus:outline-none focus:border-medical-cyan focus:ring-4 focus:ring-medical-cyan/10 transition-all shadow-inner"
                                            />
                                          </div>
                                       </div>
                                     </div>
                                   </div>

                                   <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); handleUpdate(reading.id); }} 
                                       className="flex-1 py-4 bg-medical-primary rounded-2xl text-black font-black text-sm uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(0,229,255,0.2)] hover:shadow-[0_15px_25px_rgba(0,229,255,0.3)] hover:-translate-y-0.5 transition-all active:scale-[0.95] flex items-center justify-center gap-2"
                                     >
                                       <Check className="w-5 h-5" strokeWidth={3}/> {t("save_changes")}
                                     </button>
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); setEditingId(null); }} 
                                       className="flex-1 py-4 bg-white/5 rounded-2xl text-gray-400 font-bold text-sm uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                                     >
                                       <X className="w-5 h-5"/> {t("cancel")}
                                     </button>
                                   </div>
                                </div>
                              ) : (
                                <h3 className="text-white font-black text-2xl tracking-tight">
                                  {formatValue(val)} <span className="text-sm text-gray-500 font-bold ml-1">{t(unit === "mg/dL" ? "mg_dl" : unit === "g/L" ? "g_l" : "mmol_l")}</span>
                                </h3>
                              )}
                              <div className="flex items-center gap-3 text-[10px] md:text-xs text-gray-500 mt-1 font-medium flex-wrap">
                                <span className="flex items-center gap-1.5 whitespace-nowrap text-medical-cyan/50"><Clock className="w-3.5 h-3.5" /> {timeStr}</span>
                                {reading.source === 'manual' && <span className="bg-white/5 px-2 py-0.5 rounded-[4px] text-[9px] uppercase tracking-widest text-gray-400 border border-white/5 font-bold">{t("manual")}</span>}
                              </div>
                            </div>

                            {/* Desktop Actions */}
                            <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); startEditing(reading.id, val, reading.created_at); }}
                                className="p-3 rounded-xl bg-medical-cyan/5 border border-medical-cyan/10 text-medical-cyan/50 hover:text-medical-cyan hover:bg-medical-cyan/10 hover:border-medical-cyan/30 transition-all group/edit"
                                title={t("edit")}
                              >
                                <Pencil className="w-5 h-5 group-hover/edit:scale-110 transition-transform" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(reading.id); }}
                                className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all group/delete"
                                title={t("delete")}
                              >
                                <Trash2 className="w-5 h-5 group-hover/delete:scale-110 transition-transform" />
                              </button>
                            </div>
                          </div>

                          {/* Mobile Actions */}
                          <div className="flex md:hidden items-center gap-3 w-full pt-4 border-t border-white/5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEditing(reading.id, val, reading.created_at); }}
                              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-medical-cyan/5 border border-medical-cyan/10 text-medical-cyan/70 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                            >
                              <Pencil className="w-3.5 h-3.5" /> {t("edit")}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(reading.id); }}
                              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500/60 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {t("delete")}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-32 md:bottom-10 left-1/2 -translate-x-1/2 z-[70] w-[92%] sm:w-full sm:max-w-lg"
          >
            <div className="bg-medical-dark/95 backdrop-blur-3xl border border-white/10 p-3 sm:p-5 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7),0_0_20px_rgba(0,229,255,0.05)] flex items-center justify-between gap-2 sm:gap-6 overflow-hidden relative">
              {/* Internal Accent Line */}
              <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-medical-cyan/20 to-transparent" />

              <div className="flex items-center gap-2 sm:gap-5 ml-1 sm:ml-2">
                <div className="relative shrink-0">
                   <div className="absolute inset-0 bg-medical-cyan/10 blur-sm rounded-full animate-pulse" />
                   <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-medical-black border border-medical-cyan/20 text-medical-cyan relative z-10">
                     <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                   </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-sm font-black text-white tracking-tight uppercase italic truncate leading-none">
                    {selectedIds.size} {t("selected")}
                  </span>
                  <span className="hidden xs:block text-[8px] sm:text-[9px] font-black tracking-[0.2em] text-medical-cyan/30 uppercase mt-1 leading-none truncate">
                    {t("readings_ready")}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <button 
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl border border-white/5 text-gray-500 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.25em] transition-all hover:bg-white/5 hover:text-white active:scale-95"
                >
                  {t("cancel")}
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.25em] shadow-[0_10px_20px_rgba(239,68,68,0.3)] hover:shadow-[0_15px_30px_rgba(239,68,68,0.5)] active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2.5 disabled:opacity-50 group/del"
                >
                  {isDeleting ? (
                    <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/del:rotate-12 transition-transform" strokeWidth={3} />
                  )}
                  <span className="whitespace-nowrap">{t("delete")}</span>
                </button>
              </div>
            </div>
          </motion.div>


        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        isLoading={isDeleting}
      />
    </motion.div>
  );
}

