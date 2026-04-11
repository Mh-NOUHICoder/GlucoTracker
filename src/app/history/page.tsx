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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
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

      toast.success("Reading deleted successfully");
    } catch (err) {
      toast.error("Failed to delete reading. Restricted access?");
      console.error("Delete failed:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} readings from the database?`)) return;

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
      await localforage.setItem(`readings_${user.id}`, nextReadings);
      
      setSelectedIds(new Set());
      toast.success(`${idsToDelete.length} readings removed successfully`);
    } catch (err) {
      toast.error("Bulk delete failed. Check connection.");
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
      className="container mx-auto px-4 py-6 md:py-10 space-y-8 pb-10"
    >
      <div className="flex justify-between items-center bg-gradient-to-r from-medical-dark to-medical-black p-8 rounded-3xl border border-medical-cyan/10 shadow-2xl">
        <div className="flex items-center gap-6">
          <button 
             onClick={toggleSelectAll}
             className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${selectedIds.size === readings.length && readings.length > 0 ? "bg-medical-primary border-medical-primary shadow-[0_0_15px_#00e5ff]" : "bg-white/5 border-white/10 hover:border-medical-primary/50"}`}
             title={selectedIds.size === readings.length ? "Deselect All" : "Select All"}
          >
             {selectedIds.size === readings.length && readings.length > 0 ? <Check className="w-5 h-5 text-black" strokeWidth={4} /> : <div className="w-4 h-4 rounded-md border-2 border-white/20" />}
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t("manage_readings")}</h1>
            <p className="text-medical-cyan/70 font-medium">{t("sync_message")}</p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="p-3 rounded-2xl bg-medical-black border border-medical-primary/30 text-medical-primary shadow-[0_0_15px_-5px_#00e5ff]">
             <HistoryIcon className="w-6 h-6" />
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
                  onClick={() => toggleSelect(reading.id)}
                  className={`group relative flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl bg-medical-dark shadow-xl border transition-all backdrop-blur-md cursor-pointer ${selectedIds.has(reading.id) ? "border-medical-primary ring-1 ring-medical-primary/20 bg-medical-primary/[0.03]" : "border-white/5 hover:border-medical-primary/30"}`}
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
                          <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={editValue} 
                                onChange={(e) => setEditValue(e.target.value)}
                                autoFocus
                                className="w-24 bg-medical-black border border-medical-primary rounded-lg px-2 py-1 text-white text-xl font-bold focus:outline-none"
                             />
                             <button onClick={() => handleUpdate(reading.id)} className="p-2 bg-medical-primary rounded-lg text-black hover:opacity-90"><Check className="w-5 h-5"/></button>
                             <button onClick={() => setEditingId(null)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
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
      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6"
          >
            <div className="bg-medical-dark/95 backdrop-blur-2xl border border-medical-primary/20 p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 ml-2">
                <div className="w-10 h-10 rounded-2xl bg-medical-primary/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-medical-primary" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{selectedIds.size} Selected</p>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Readings ready</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2.5 rounded-xl border border-white/5 text-gray-400 font-bold text-xs hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center gap-2"
                >
                  {isDeleting ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete From DB
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
