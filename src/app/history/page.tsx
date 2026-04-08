"use client";

import { motion, AnimatePresence } from "framer-motion";
import { History as HistoryIcon, Clock, Activity, Calendar, Trash2, Pencil, Check, X, AlertCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import localforage from "localforage";
import { toast } from "sonner";

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
  const [unit, setUnit] = useState("mg/dL");
  const { t } = useI18n();

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
          .map((r: GlucoseReading) => ({
            ...r,
            value: editedMap[r.id] !== undefined ? editedMap[r.id] : r.value
          }));

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

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("delete_confirm"))) return;

    try {
      const deletedStr = localStorage.getItem("deleted_readings") || "[]";
      const deletedIds = JSON.parse(deletedStr);
      
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem("deleted_readings", JSON.stringify(deletedIds));
      }

      setReadings(prev => prev.filter(r => r.id !== id));
      toast.success("Reading deleted from history");
    } catch (err) {
      toast.error("Failed to delete reading");
      console.error("Virtual delete failed:", err);
    }
  };

  const startEditing = (id: string, value: number) => {
    setEditingId(id);
    setEditValue(value.toString());
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
      // Save to Virtual Edit Overlay
      const editedStr = localStorage.getItem("edited_readings") || "{}";
      const editedMap = JSON.parse(editedStr);
      editedMap[id] = val;
      localStorage.setItem("edited_readings", JSON.stringify(editedMap));

      // Update local state
      setReadings(prev => prev.map(r => r.id === id ? { ...r, value: val } : r));
      setEditingId(null);
      toast.success("Reading successfully updated");
    } catch (err) {
      toast.error("Failed to update reading");
      console.error("Virtual update failed:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-10"
    >
      <div className="flex justify-between items-center bg-gradient-to-r from-medical-dark to-medical-black p-8 rounded-3xl border border-medical-cyan/10 shadow-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t("manage_readings")}</h1>
          <p className="text-medical-cyan/70 font-medium">{t("sync_message")}</p>
        </div>
        <div className="flex gap-4">
           <div className="p-3 rounded-2xl bg-medical-black border border-medical-blue/30 text-medical-cyan shadow-[0_0_15px_-5px_#06b6d4]">
             <HistoryIcon className="w-6 h-6" />
           </div>
        </div>
      </div>

      {loading ? (
        <div className="w-full flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-medical-blue/20 border-t-medical-cyan rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.2)]"></div>
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
        <div className="space-y-4">
          <AnimatePresence mode='popLayout'>
            {readings.map((reading) => {
              const val = Number(reading.value);
              const isHigh = val > 180;
              const isLow = val < 70;
              const dateObj = new Date(reading.created_at);
              const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

              return (
                <motion.div
                  key={reading.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="group relative flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl bg-medical-dark/40 border border-white/5 hover:border-medical-cyan/30 transition-all backdrop-blur-md"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full">
                    <div className="flex items-center gap-4 w-full">
                      <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border ${isHigh ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : isLow ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                        <Activity className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1">
                        {editingId === reading.id ? (
                          <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={editValue} 
                                onChange={(e) => setEditValue(e.target.value)}
                                autoFocus
                                className="w-24 bg-medical-black border border-medical-cyan rounded-lg px-2 py-1 text-white text-xl font-bold focus:outline-none"
                             />
                             <button onClick={() => handleUpdate(reading.id)} className="p-2 bg-medical-cyan rounded-lg text-white hover:bg-medical-accent"><Check className="w-5 h-5"/></button>
                             <button onClick={() => setEditingId(null)} className="p-2 bg-gray-500/20 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                          </div>
                        ) : (
                          <h3 className="text-white font-black text-2xl tracking-tight">
                            {formatValue(val)} <span className="text-sm text-gray-500 font-bold ml-1">{unit}</span>
                          </h3>
                        )}
                        <div className="flex items-center gap-3 text-[10px] md:text-xs text-gray-500 mt-1 font-medium flex-wrap">
                          <span className="flex items-center gap-1.5 whitespace-nowrap"><Calendar className="w-3.5 h-3.5" /> {dateStr}</span>
                          <span className="flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3.5 h-3.5" /> {timeStr}</span>
                          {reading.source === 'manual' && <span className="bg-white/5 px-2 py-0.5 rounded-[4px] text-[9px] uppercase tracking-widest text-gray-400 border border-white/5 font-bold">Manual</span>}
                        </div>
                      </div>

                      {/* Desktop Actions */}
                      <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditing(reading.id, val)}
                          className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          title={t("edit")}
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(reading.id)}
                          className="p-3 rounded-xl bg-red-500/5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title={t("delete")}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex md:hidden items-center gap-3 w-full pt-4 border-t border-white/5">
                      <button 
                        onClick={() => startEditing(reading.id, val)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-gray-300 font-bold text-xs"
                      >
                        <Pencil className="w-4 h-4" /> {t("edit")}
                      </button>
                      <button 
                        onClick={() => handleDelete(reading.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 font-bold text-xs"
                      >
                        <Trash2 className="w-4 h-4" /> {t("delete")}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
