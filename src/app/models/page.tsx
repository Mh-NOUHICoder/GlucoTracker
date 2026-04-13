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
  Droplet,
  Plus,
  Minus
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
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const [unit, setUnit] = useState("mg/dL");
  const [targetMin, setTargetMin] = useState(70);
  const [targetMax, setTargetMax] = useState(180);
  const [activeTab, setActiveTab] = useState("profile");

  // Load active tab from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem("settings_active_tab");
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem("settings_active_tab", tabId);
  };

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
  const [waterUnit, setWaterUnit] = useState("hours");
  const [inactivityDays, setInactivityDays] = useState(2);
  const [showDaysMenu, setShowDaysMenu] = useState(false);
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
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
    setSelectedModelName(localStorage.getItem("preferredModelName"));
    setUnit(localStorage.getItem("glucose_unit") || "mg/dL");
    setTargetMin(Number(localStorage.getItem("target_min") || 70));
    setTargetMax(Number(localStorage.getItem("target_max") || 180));

    // Load Reminders
    setNotifyGlucose(localStorage.getItem("notify_glucose") === "true");
    setMorningTime(localStorage.getItem("morning_time") || "08:00");
    setNoonTime(localStorage.getItem("noon_time") || "12:00");
    setNotifyWater(localStorage.getItem("notify_water") === "true");
    setWaterInterval(Number(localStorage.getItem("water_interval") || 1));
    setWaterUnit(localStorage.getItem("water_unit") || "hours");
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
    localStorage.setItem("water_unit", waterUnit);
    localStorage.setItem("inactivity_days", inactivityDays.toString());

    window.dispatchEvent(new Event("settings-update"));
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
    if (model) {
      localStorage.setItem("preferredModelProvider", model.provider);
      localStorage.setItem("preferredModelName", model.name);
      setSelectedModelName(model.name);
    }
    window.dispatchEvent(new Event("settings-update"));
  };

  const handleUnitToggle = (val: string) => {
    setUnit(val);
    localStorage.setItem("glucose_unit", val);
    window.dispatchEvent(new Event("settings-update"));
  };

  const handleRangeSave = () => {
    localStorage.setItem("target_min", targetMin.toString());
    localStorage.setItem("target_max", targetMax.toString());
    window.dispatchEvent(new Event("settings-update"));
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
                  onClick={() => handleTabChange(tab.id)}
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
                  <div 
                    className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl space-y-6 shadow-xl backdrop-blur-md relative"
                    style={{ zIndex: showUnitMenu ? 50 : 1 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Droplets className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{t("unit_pref")}</h3>
                        <p className="text-xs text-gray-500 font-medium">{t("choose_preferred_unit")}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-4">
                        <div className="relative w-full">
                           <button 
                             onClick={() => setShowUnitMenu(!showUnitMenu)}
                             className="w-full flex items-center justify-between bg-medical-black/50 hover:bg-medical-black/80 px-6 py-4 rounded-2xl border border-white/5 transition-all group shadow-inner"
                           >
                             <div className="flex items-center gap-4">
                               <div className="p-3 rounded-xl bg-medical-cyan/10 text-medical-cyan group-hover:bg-medical-cyan group-hover:text-white transition-all shadow-lg">
                                 <Droplets className="w-5 h-5" />
                               </div>
                               <div className="flex flex-col items-start">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-300">{t("unit_pref")}</span>
                                 <span className="text-xl font-black text-white">{unit}</span>
                               </div>
                             </div>
                             <div className={`p-1 rounded-lg transition-transform ${showUnitMenu ? 'rotate-180' : ''}`}>
                               <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-medical-cyan rotate-90" />
                             </div>
                           </button>

                           <AnimatePresence>
                             {showUnitMenu && (
                               <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                 className="absolute left-0 right-0 mt-3 p-2 bg-medical-black/98 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-[100] overflow-hidden"
                               >
                                 <div className="grid grid-cols-1 gap-1">
                                   {["mg/dL", "mmol/L", "g/L"].map((u) => (
                                     <button
                                       key={u}
                                       onClick={() => {
                                         handleUnitToggle(u);
                                         setShowUnitMenu(false);
                                       }}
                                       className={`flex items-center justify-between px-5 py-4 rounded-xl transition-all ${
                                         unit === u 
                                           ? "bg-medical-cyan text-white shadow-lg shadow-medical-cyan/30" 
                                           : "text-gray-400 hover:text-white hover:bg-white/10"
                                       }`}
                                     >
                                       <span className="text-lg font-black">{u}</span>
                                       {unit === u && <CheckCircle className="w-5 h-5" />}
                                     </button>
                                   ))}
                                 </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                        </div>
                      </div>
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
              <div 
                className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl shadow-xl backdrop-blur-md relative"
                style={{ zIndex: showModelMenu ? 50 : 1 }}
              >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{t("models_title")}</h3>
                      <p className="text-xs text-gray-500 font-medium">{t("models_desc")}</p>
                    </div>
                  </div>
  
                  <div className="relative w-full">
                     <button 
                       onClick={() => setShowModelMenu(!showModelMenu)}
                       className="w-full flex items-center justify-between bg-medical-black/50 hover:bg-medical-black/80 px-6 py-5 rounded-2xl border border-white/5 transition-all group shadow-inner"
                     >
                       <div className="flex items-center gap-5">
                          <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-lg border border-purple-500/20">
                            <Cpu className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">{t("ai_engine")}</span>
                             <div className="flex items-center gap-3">
                               <span className="text-xl font-black text-white">
                                 {models.find(m => m.id === selectedModelId)?.name || selectedModelName || t("select_model") || "Select Model"}
                               </span>
                               {selectedModelId && (
                                 <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                   {models.find(m => m.id === selectedModelId)?.provider || localStorage.getItem("preferredModelProvider") || "api"}
                                 </span>
                               )}
                            </div>
                          </div>
                       </div>
                       <div className={`p-1.5 rounded-lg transition-transform ${showModelMenu ? 'rotate-180' : ''}`}>
                          <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-purple-400 rotate-90" />
                       </div>
                     </button>

                     <AnimatePresence>
                       {showModelMenu && (
                         <motion.div
                           initial={{ opacity: 0, y: 15, scale: 0.98 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 15, scale: 0.98 }}
                           className="absolute left-0 right-0 mt-4 p-2 bg-medical-black/98 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden max-h-[400px] overflow-y-auto no-scrollbar"
                         >
                           <div className="grid grid-cols-1 gap-1.5">
                             {loadingModels ? (
                               [1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse mx-2 my-1" />)
                             ) : models.length > 0 ? (
                               models.map((m) => {
                                 const isSelected = selectedModelId === m.id;
                                 return (
                                   <button
                                     key={m.id}
                                     onClick={() => {
                                       handleModelSelect(m.id);
                                       setShowModelMenu(false);
                                     }}
                                     className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all group/item ${
                                       isSelected 
                                         ? "bg-purple-500 text-white shadow-xl shadow-purple-500/20" 
                                         : "text-gray-400 hover:text-white hover:bg-white/5"
                                     }`}
                                   >
                                     <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-white animate-pulse" : "bg-gray-700"}`} />
                                        <div>
                                          <div className={`font-black tracking-tight ${isSelected ? "text-white" : "text-gray-200"}`}>{m.name}</div>
                                          <span className={`text-[9px] uppercase tracking-widest font-bold ${isSelected ? "text-purple-100" : "text-gray-500"}`}>{m.provider}</span>
                                        </div>
                                     </div>
                                     {isSelected && <CheckCircle className="w-5 h-5 text-white" />}
                                   </button>
                                 )
                               })
                             ) : (
                               <div className="p-8 text-center text-red-400 text-xs italic">
                                 No vision models found.
                               </div>
                             )}
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
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
                        if (!("Notification" in window)) {
                          toast.error("Not supported in this browser");
                          return;
                        }

                        if (Notification.permission === "denied") {
                          toast.error("Permission denied. Enable in settings.");
                          return;
                        }

                        const sendTest = () => {
                           toast.info("Sending test alert...");
                           const options = {
                             body: "High-visibility test alert. Digital Health Check! \uD83D\uDD14",
                             icon: "/glucotracker.png",
                             badge: "/glucotracker.png",
                             vibrate: [500, 110, 500, 110, 450, 110, 200],
                             requireInteraction: true,
                             tag: "test_notif",
                             renotify: true
                           } as any;

                           if (navigator.serviceWorker.controller) {
                              navigator.serviceWorker.ready.then(reg => {
                                 reg.showNotification("DiabLab Test", options);
                                 toast.success("Push Notification Sent!");
                              }).catch(() => {
                                 new Notification("DiabLab Test", options);
                                 toast.success("Standard Notification Sent!");
                              });
                           } else {
                              new Notification("DiabLab Test", options);
                              toast.success("Standard Notification Sent!");
                           }
                        };

                        if (Notification.permission === "default") {
                          Notification.requestPermission().then(p => {
                            if (p === "granted") sendTest();
                            else toast.error("Permission was not granted.");
                          });
                        } else {
                          sendTest();
                        }
                     }}
                     className="sm:mx-0 w-full sm:w-auto px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                     <Bell className="w-4 h-4" />
                     Test Notification
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Glucose Alerts */}
                  <div 
                    className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 space-y-8 shadow-xl relative"
                    style={{ zIndex: showDaysMenu ? 50 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-6 flex-1">
                        <div className="text-xl font-bold text-white flex items-center gap-3">
                          <Bell className="w-5 h-5 text-medical-cyan" /> {t("glucose_check_alert")}
                        </div>
                        
                        <div className="space-y-4">
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60 ml-px flex items-center gap-2">
                             <RotateCcw className="w-3 h-3" /> {t("remind_every")}
                           </span>
                           
                           {/* Modern Creative Dropdown */}
                           <div className="relative w-max">
                              <button 
                                onClick={() => setShowDaysMenu(!showDaysMenu)}
                                className="flex items-center gap-4 bg-medical-black/50 hover:bg-medical-black/80 px-5 py-3 rounded-2xl border border-white/5 transition-all group"
                              >
                                <div className="flex flex-col items-start">
                                  <span className="text-2xl font-black text-medical-cyan tabular-nums leading-none">
                                    {inactivityDays}
                                  </span>
                                  <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400 mt-1">
                                    {inactivityDays === 1 ? t("day") : t("days")}
                                  </span>
                                </div>
                                <div className={`p-1.5 rounded-lg bg-white/5 group-hover:bg-medical-cyan/20 transition-all ${showDaysMenu ? 'rotate-180' : ''}`}>
                                   <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-medical-cyan rotate-90" />
                                </div>
                              </button>

                              <AnimatePresence>
                                {showDaysMenu && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute left-0 mt-3 p-2 bg-medical-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 min-w-[160px] grid grid-cols-1 gap-1"
                                  >
                                    {[1, 2, 3, 7].map((d) => (
                                      <button
                                        key={d}
                                        onClick={() => {
                                          setInactivityDays(d);
                                          setShowDaysMenu(false);
                                        }}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                                          inactivityDays === d 
                                            ? "bg-medical-cyan/10 text-medical-cyan" 
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-lg font-black">{d}</span>
                                          <span className="text-[10px] font-bold uppercase tracking-widest">
                                            {d === 1 ? t("day") : t("days")}
                                          </span>
                                        </div>
                                        {inactivityDays === d && <CheckCircle className="w-4 h-4" />}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group pt-1">
                        <input type="checkbox" checked={notifyGlucose} onChange={(e) => setNotifyGlucose(e.target.checked)} className="sr-only peer" />
                        <div className="w-16 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-400 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-medical-cyan/30 peer-checked:after:bg-medical-cyan shadow-inner"></div>
                      </label>
                    </div>

                    {notifyGlucose && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5"
                      >
                        <div className="space-y-3 p-4 rounded-2xl bg-medical-black/20 border border-white/5">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                             <Clock className="w-4 h-4 text-medical-cyan" /> {t("morning_alert")}
                           </label>
                           <input 
                             type="time" 
                             value={morningTime} 
                             onChange={(e) => setMorningTime(e.target.value)}
                             className="w-full bg-medical-black/60 border border-white/10 rounded-xl px-4 py-3 text-lg text-white font-black focus:border-medical-cyan outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-3 p-4 rounded-2xl bg-medical-black/20 border border-white/5">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                             <Clock className="w-4 h-4 text-medical-cyan" /> {t("noon_alert")}
                           </label>
                           <input 
                             type="time" 
                             value={noonTime} 
                             onChange={(e) => setNoonTime(e.target.value)}
                             className="w-full bg-medical-black/60 border border-white/10 rounded-xl px-4 py-3 text-lg text-white font-black focus:border-medical-cyan outline-none transition-all"
                           />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Hydration Alerts */}
                  <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 space-y-8 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="text-xl font-bold text-white flex items-center gap-3">
                          <Droplet className="w-6 h-6 text-blue-400" /> {t("hydration_reminder")}
                        </div>
                        <div className="text-sm text-gray-500 font-medium">{t("hydration_desc")}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input type="checkbox" checked={notifyWater} onChange={(e) => setNotifyWater(e.target.checked)} className="sr-only peer" />
                        <div className="w-16 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-400 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500/30 peer-checked:after:bg-blue-400 shadow-inner"></div>
                      </label>
                    </div>

                    {notifyWater && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-medical-black/40 p-6 rounded-[2rem] border border-white/5 shadow-inner"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{t("remind_every")}</span>
                          <div className="text-white font-bold flex items-center gap-2">
                             <span className="text-2xl text-blue-400">{waterInterval}</span>
                             <span className="text-gray-400 capitalize text-sm">
                               {waterUnit === "hours" 
                                 ? (waterInterval === 1 ? t("hour") : t("hours")) 
                                 : t("minutes")}
                             </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Stepper Control */}
                          <div className="flex items-center bg-medical-black rounded-xl border border-white/10 p-1">
                            <button 
                              onClick={() => setWaterInterval(Math.max(1, waterInterval - 1))}
                              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <div className="w-10 text-center text-white font-black text-sm select-none">
                              {waterInterval}
                            </div>
                            <button 
                              onClick={() => setWaterInterval(waterInterval + 1)}
                              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                      
                          {/* Unit Segmented Control */}
                          <div className="flex bg-medical-black rounded-xl border border-white/10 p-1 gap-1">
                            {["minutes", "hours"].map((unit) => (
                              <button
                                key={unit}
                                onClick={() => setWaterUnit(unit)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                  waterUnit === unit 
                                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                                    : "text-gray-500 hover:text-gray-300"
                                }`}
                              >
                                {t(unit)}
                              </button>
                            ))}
                          </div>
                        </div>
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
