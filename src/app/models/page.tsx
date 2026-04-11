"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  Cpu, 
  CheckCircle, 
  Droplets, 
  Target, 
  RotateCcw, 
  ShieldCheck, 
  User, 
  ChevronRight,
  Database,
  Camera,
  Loader2,
  Bell,
  Clock,
  Droplet
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ConfirmationModal";


export default function ProfileSettingsPage() {
  const { t } = useI18n();
  const { user, isLoaded: clerkLoaded } = useUser();
  const [models, setModels] = useState<{id: string, provider: string, name: string}[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  
  // Settings States
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [unit, setUnit] = useState("mg/dL");
  const [targetMin, setTargetMin] = useState(70);
  const [targetMax, setTargetMax] = useState(180);
  const [activeTab, setActiveTab] = useState("profile");
  const [showConfirm, setShowConfirm] = useState(false);


  // Profile Update States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [notifyGlucose, setNotifyGlucose] = useState(false);
  const [morningTime, setMorningTime] = useState("08:00");
  const [noonTime, setNoonTime] = useState("12:00");
  const [notifyWater, setNotifyWater] = useState(false);
  const [waterInterval, setWaterInterval] = useState(1);
  const [inactivityDays, setInactivityDays] = useState(2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("/api/models");
        const data = await res.json();
        if (data.models) setModels(data.models);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingModels(false);
      }
    };
    
    fetchModels();

    // Load saved preferences
    setSelectedModelId(localStorage.getItem("preferredModelId"));
    setUnit(localStorage.getItem("glucose_unit") || "mg/dL");
    setTargetMin(Number(localStorage.getItem("target_min") || 70));
    setTargetMax(Number(localStorage.getItem("target_max") || 180));

    // Load Reminders
    setNotifyGlucose(localStorage.getItem("notify_glucose") === "true");
    setMorningTime(localStorage.getItem("morning_time") || "08:00");
    setNoonTime(localStorage.getItem("noon_time") || "12:00");
    setNotifyWater(localStorage.getItem("notify_water") === "true");
    setWaterInterval(Number(localStorage.getItem("water_interval") || 1));
    setInactivityDays(Number(localStorage.getItem("inactivity_days") || 2));
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("glucose_unit", unit);
    localStorage.setItem("target_min", targetMin.toString());
    localStorage.setItem("target_max", targetMax.toString());
    if (selectedModelId) localStorage.setItem("preferredModelId", selectedModelId);

    // Save Reminders
    localStorage.setItem("notify_glucose", notifyGlucose.toString());
    localStorage.setItem("morning_time", morningTime);
    localStorage.setItem("noon_time", noonTime);
    localStorage.setItem("notify_water", notifyWater.toString());
    localStorage.setItem("water_interval", waterInterval.toString());
    localStorage.setItem("inactivity_days", inactivityDays.toString());

    toast.success(t("profile_updated"));
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await user.update({
        firstName,
        lastName
      });
      toast.success(t("profile_updated"));
    } catch {
      toast.error(t("update_failed"));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    setIsUploadingPhoto(true);
    try {
      await user.setProfileImage({
        file: e.target.files[0]
      });
      toast.success(t("profile_updated"));
    } catch {
      toast.error(t("photo_failed"));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleModelSelect = (id: string) => {
    setSelectedModelId(id);
    localStorage.setItem("preferredModelId", id);
    const model = models.find(m => m.id === id);
    if (model) localStorage.setItem("preferredModelProvider", model.provider);
  };

  const handleUnitToggle = (val: string) => {
    setUnit(val);
    localStorage.setItem("glucose_unit", val);
  };

  const handleRangeSave = () => {
    localStorage.setItem("target_min", targetMin.toString());
    localStorage.setItem("target_max", targetMax.toString());
    toast.success("Target ranges updated successfully.");
  };

  const clearAllLocalCaches = () => {
    setShowConfirm(false);
    // Clear specific keys
    localStorage.removeItem("deleted_readings");
    localStorage.removeItem("edited_readings");
    
    // Clear all items starting with insight_
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("insight_")) {
        localStorage.removeItem(key);
      }
    });
    
    toast.success("Cleared local caches. Reloading...");
    setTimeout(() => window.location.reload(), 300);
  };


  return (
    <div className="max-w-4xl mx-auto pt-8 pb-20 space-y-8 px-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-medical-dark to-medical-black p-8 rounded-3xl border border-medical-cyan/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <User className="w-32 h-32 text-medical-cyan" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 flex items-center gap-4">
            <Settings className="w-10 h-10 text-medical-cyan" />
            {t("settings")}
          </h1>
          <p className="text-medical-cyan/60 font-medium max-w-md">
            {t("profile_control")}
          </p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="w-full relative">
         <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-medical-black/80 to-transparent pointer-events-none z-20 block md:hidden rounded-r-2xl" />
         <div className="flex bg-medical-dark/30 backdrop-blur-xl p-1.5 rounded-[1.5rem] border border-white/5 gap-1 overflow-x-auto no-scrollbar shadow-inner relative z-10 items-center">
           {[
             { id: "profile", label: t("profile"), icon: User },
             { id: "general", label: t("units"), icon: Target },
             { id: "ai", label: t("ai_engine"), icon: Cpu },
             { id: "alerts", label: t("reminders"), icon: Bell },
             { id: "data", label: t("data_manage"), icon: Database }
           ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center justify-center gap-2 px-5 py-3 min-w-max rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex-1 ${
                    isActive 
                      ? "text-white" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabSettings"
                      className="absolute inset-0 bg-medical-cyan rounded-[1.25rem] shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ zIndex: 0 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    {tab.label}
                  </div>
                </button>
              );
           })}
         </div>
      </div>

      {!clerkLoaded ? (
        <div className="w-full h-64 flex items-center justify-center bg-medical-dark/20 rounded-3xl border border-white/5 animate-pulse">
           <Loader2 className="w-8 h-8 text-medical-cyan animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
             key={activeTab}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             transition={{ duration: 0.2 }}
             className="space-y-6"
          >
            {/* Profile Section */}
            {activeTab === "profile" && (
              <div className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl space-y-8 shadow-xl backdrop-blur-md">
                 <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                       <div className="w-32 h-32 rounded-full border-4 border-medical-cyan/20 overflow-hidden shadow-2xl bg-medical-black">
                          {user?.imageUrl ? (
                             <Image src={user.imageUrl} alt="Profile" width={128} height={128} className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center">
                                <User className="w-12 h-12 text-gray-700" />
                             </div>
                          )}
                       </div>
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         disabled={isUploadingPhoto}
                         className="absolute bottom-0 right-0 p-3 bg-medical-cyan rounded-full text-white shadow-xl hover:scale-110 transition-transform disabled:opacity-50 z-10"
                       >
                         {isUploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                       </button>
                       <input 
                         type="file" 
                         ref={fileInputRef} 
                         onChange={handlePhotoUpload} 
                         className="hidden" 
                         accept="image/*"
                       />
                    </div>
  
                    <div className="flex-1 w-full space-y-4">
                       <div>
                          <h3 className="text-xl font-bold text-white">{t("personal_info")}</h3>
                          <p className="text-xs text-gray-500 font-medium">{t("update_profile")}</p>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t("first_name")}</label>
                             <input 
                               type="text" 
                               value={firstName} 
                               onChange={(e) => setFirstName(e.target.value)}
                               className="w-full bg-medical-black border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-medical-cyan focus:bg-medical-black/80 transition-all outline-none"
                             />
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t("last_name")}</label>
                             <input 
                               type="text" 
                               value={lastName} 
                               onChange={(e) => setLastName(e.target.value)}
                               className="w-full bg-medical-black border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-medical-cyan focus:bg-medical-black/80 transition-all outline-none"
                             />
                          </div>
                       </div>
                       <div className="pt-2">
                         <button 
                           onClick={handleUpdateProfile}
                           disabled={isUpdatingProfile}
                           className="btn-primary !w-auto !px-8 !py-3"
                         >
                            {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            {t("save_changes")}
                         </button>
                       </div>
                     </div>
                  </div>
               </div>
            )}
  
            {/* General Section */}
            {activeTab === "general" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl space-y-6 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Droplets className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{t("unit_pref")}</h3>
                        <p className="text-xs text-gray-500 font-medium">{t("choose_preferred_unit")}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {["mg/dL", "mmol/L", "g/L"].map((u) => (
                        <button
                          key={u}
                          onClick={() => handleUnitToggle(u)}
                          className={`py-4 rounded-2xl font-black text-xl border transition-all ${
                            unit === u 
                              ? "bg-medical-cyan border-medical-cyan text-white shadow-xl shadow-medical-cyan/20" 
                              : "bg-medical-black/50 border-white/10 text-gray-500 hover:border-white/20 hover:bg-medical-black"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
  
                  <div className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl space-y-6 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-medical-cyan/10 text-medical-cyan border border-medical-cyan/20">
                        <Target className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{t("ranges")}</h3>
                        <p className="text-xs text-gray-500 font-medium">{t("target_range_set")}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center gap-4">
                        <label className="text-sm font-bold text-gray-400">{t("min_target")}</label>
                        <input 
                          type="number" 
                          value={targetMin} 
                          onChange={(e) => setTargetMin(Number(e.target.value))}
                          className="w-24 bg-medical-black border border-white/10 rounded-xl px-4 py-2 text-white font-black text-right focus:border-medical-cyan outline-none transition-all"
                        />
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <label className="text-sm font-bold text-gray-400">{t("max_target")}</label>
                        <input 
                          type="number" 
                          value={targetMax} 
                          onChange={(e) => setTargetMax(Number(e.target.value))}
                          className="w-24 bg-medical-black border border-white/10 rounded-xl px-4 py-2 text-white font-black text-right focus:border-medical-cyan outline-none transition-all"
                        />
                      </div>
                      <button 
                        onClick={handleRangeSave}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-medical-cyan" />
                        {t("save_changes")}
                      </button>
                    </div>
                  </div>
              </div>
            )}
  
            {/* AI Section */}
            {activeTab === "ai" && (
              <div className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t("models_title")}</h3>
                      <p className="text-xs text-gray-500 font-medium">{t("models_desc")}</p>
                    </div>
                  </div>
  
                  <div className="grid gap-3">
                    {loadingModels ? (
                      [1,2,3].map(i => <div key={i} className="h-20 bg-medical-black/50 rounded-2xl animate-pulse" />)
                    ) : models.length > 0 ? (
                      models.map((m) => {
                        const isSelected = selectedModelId === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleModelSelect(m.id)}
                            className={`w-full text-left p-5 rounded-2xl flex items-center justify-between border transition-all group ${
                              isSelected 
                                ? "border-medical-cyan bg-medical-cyan/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
                                : "border-white/5 bg-medical-black/20 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                               <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-medical-cyan animate-pulse shadow-[0_0_8px_#06b6d4]" : "bg-gray-700"}`} />
                               <div>
                                 <h4 className="font-bold text-white group-hover:text-medical-cyan transition-colors">{m.name}</h4>
                                 <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{m.provider}</span>
                               </div>
                            </div>
                            {isSelected && <CheckCircle className="w-5 h-5 text-medical-cyan" />}
                          </button>
                        )
                      })
                    ) : (
                      <div className="p-10 text-center bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-sm italic">
                        No vision models found. Check your API keys in environment variables.
                      </div>
                    )}
                  </div>
              </div>
            )}
  
            {/* Reminders Section */}
            {activeTab === "alerts" && (
              <div className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl space-y-10 shadow-xl backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Bell className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white">{t("smart_reminders")}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium">{t("manage_notifications")}</p>
                    </div>
                  </div>
                  <button 
                     onClick={() => {
                       try {
                         const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                         if (AudioContextClass) {
                           const ctx = new AudioContextClass();
                           const osc = ctx.createOscillator();
                           const gainNode = ctx.createGain();
                           osc.type = "sine";
                           osc.frequency.setValueAtTime(880, ctx.currentTime);
                           osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
                           gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                           gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                           osc.connect(gainNode);
                           gainNode.connect(ctx.destination);
                           osc.start();
                           osc.stop(ctx.currentTime + 0.5);
                         }
                       } catch (e) {
                         console.error(e);
                       }
                       if ("Notification" in window) {
                         if (Notification.permission === "granted") {
                           navigator.serviceWorker.ready.then((registration) => {
                             registration.showNotification(t("gluco_reminder_title") || "Test Notification", {
                               body: "This is a test notification. 🔔",
                               icon: "/glucotracker.png",
                               badge: "/glucotracker.png",
                               silent: false,
                               vibrate: [200, 100, 200]
                             } as NotificationOptions);
                           }).catch(() => {
                             new Notification(t("gluco_reminder_title") || "Test Notification", { body: "This is a test notification. 🔔", icon: "/glucotracker.png", silent: false });
                           });
                         } else if (Notification.permission !== "denied") {
                           Notification.requestPermission().then((permission) => {
                             if (permission === 'granted') toast.success("Permission granted! Click again to test.");
                           });
                         } else {
                           toast.error("Notification permission denied.");
                         }
                       }
                     }}
                     className="sm:mx-0 w-full sm:w-auto px-4 py-3 sm:py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                     <Bell className="w-4 h-4" />
                     Test
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Glucose Alerts */}
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white mb-1">{t("glucose_check_alert")}</div>
                        <div className="flex items-center gap-3 bg-medical-black/50 px-3 py-1.5 rounded-xl border border-white/5">
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t("remind_every")}</span>
                           <select 
                              value={inactivityDays} 
                              onChange={(e) => setInactivityDays(Number(e.target.value))}
                              className="bg-transparent text-medical-cyan font-black text-xs outline-none cursor-pointer"
                           >
                              <option value={1}>1 {t("day")}</option>
                              <option value={2}>2 {t("days") || "days"}</option>
                              <option value={3}>3 {t("days") || "days"}</option>
                              <option value={7}>7 {t("days") || "days"}</option>
                           </select>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input type="checkbox" checked={notifyGlucose} onChange={(e) => setNotifyGlucose(e.target.checked)} className="sr-only peer" />
                        <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-medical-cyan/30 peer-checked:after:bg-medical-cyan shadow-inner"></div>
                      </label>
                    </div>

                    {notifyGlucose && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5"
                      >
                        <div className="space-y-2">
                           <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                             <Clock className="w-4 h-4 text-medical-cyan" /> {t("morning_alert")}
                           </label>
                           <input 
                             type="time" 
                             value={morningTime} 
                             onChange={(e) => setMorningTime(e.target.value)}
                             className="w-full bg-medical-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:border-medical-cyan outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                             <Clock className="w-4 h-4 text-medical-cyan" /> {t("noon_alert")}
                           </label>
                           <input 
                             type="time" 
                             value={noonTime} 
                             onChange={(e) => setNoonTime(e.target.value)}
                             className="w-full bg-medical-black border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:border-medical-cyan outline-none transition-all"
                           />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Hydration Alerts */}
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-white flex items-center gap-3">
                          <Droplet className="w-6 h-6 text-blue-400" /> {t("hydration_reminder")}
                        </div>
                        <div className="text-sm text-gray-500">{t("hydration_desc")}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input type="checkbox" checked={notifyWater} onChange={(e) => setNotifyWater(e.target.checked)} className="sr-only peer" />
                        <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500/30 peer-checked:after:bg-blue-400 shadow-inner"></div>
                      </label>
                    </div>

                    {notifyWater && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="flex items-center gap-4 bg-medical-black/80 p-6 rounded-2xl border border-white/5"
                      >
                        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{t("remind_every")}</span>
                        <select 
                           value={waterInterval} 
                           onChange={(e) => setWaterInterval(Number(e.target.value))}
                           className="bg-medical-dark border border-white/10 rounded-xl px-4 py-2 text-white font-black text-sm outline-none focus:border-blue-400 transition-all"
                        >
                           <option value={1}>1 {t("hour")}</option>
                           <option value={2}>2 {t("hours") || "hours"}</option>
                           <option value={3}>3 {t("hours") || "hours"}</option>
                           <option value={4}>4 {t("hours") || "hours"}</option>
                        </select>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <button 
                    onClick={handleSaveSettings}
                    className="btn-premium !w-auto !px-10 !py-5"
                  >
                     {t("save_changes")}
                  </button>
                </div>
              </div>
            )}
  
            {/* Data Section */}
            {activeTab === "data" && (
              <div className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl space-y-6 max-w-2xl mx-auto w-full shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t("data_manage")}</h3>
                      <p className="text-xs text-gray-500 font-medium">{t("clear_local_data")}</p>
                    </div>
                  </div>
  
                  <div className="space-y-3">
                     <button 
                       onClick={() => setShowConfirm(true)}
                       className="w-full group flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all font-bold text-sm text-red-400 hover:text-red-300 shadow-sm"
                     >
                       <span className="flex items-center gap-3"><RotateCcw className="w-4 h-4" /> {t("clear_local_data")}</span>
                       <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </button>
                  </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={clearAllLocalCaches}
        title={t("clear_data_title") || "Clear All Data?"}
        message={t("clear_data_message") || "This will clear all manual edits, hidden records, and AI insight caches. Continue?"}
        variant="danger"
      />
    </div>
  );
}

