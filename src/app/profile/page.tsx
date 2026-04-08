"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { 
  User, 
  Camera, 
  Loader2, 
  CheckCircle,
  Mail,
  Shield,
  Calendar,
  LogOut,
  DownloadCloud,
  UploadCloud as UploadIcon
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { toast } from "sonner";

export default function ProfilePage() {
  const { t } = useI18n();
  const { user, isLoaded: clerkLoaded } = useUser();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await user.update({
        firstName,
        lastName
      });
      toast.success(t("profile_updated"));
    } catch (err: unknown) {
      toast.error("Update failed: " + (err as Error).message);
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
    } catch (err: unknown) {
      toast.error("Photo upload failed: " + (err as Error).message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleBackupData = async () => {
    try {
      if (!user) return;
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from('glucose_readings').select('*').eq('user_id', user.id);
      if (error) throw error;
      
      const backup = { version: 1, exportDate: new Date().toISOString(), data };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glucotrack_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully!");
    } catch {
      toast.error("Backup failed. Please try again.");
    }
  };

  const handleRestoreData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user || !e.target.files?.[0]) return;
      const file = e.target.files[0];
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.data || !Array.isArray(backup.data)) throw new Error("Invalid backup format");
      
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('glucose_readings').upsert(backup.data, { onConflict: 'id' });
      if (error) throw error;
      
      const localforage = (await import('localforage')).default;
      await localforage.removeItem(`readings_${user.id}`);
      
      toast.success("Backup restored successfully!");
    } catch (err: unknown) {
      toast.error("Restore failed: " + (err as Error).message);
    }
  };

  if (!clerkLoaded) {
    return (
      <div className="max-w-4xl mx-auto pt-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-medical-cyan animate-spin" />
        <p className="text-gray-500 font-medium">Loading Identity Suite...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-8 pb-20 space-y-8 px-4">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-medical-dark to-medical-black p-8 rounded-3xl border border-medical-cyan/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <User className="w-48 h-48 text-medical-cyan" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
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

           <div className="text-center md:text-left">
              <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
                {user?.fullName || t("profile")}
              </h1>
              <p className="text-medical-cyan/60 font-medium flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4" /> {user?.primaryEmailAddress?.emailAddress}
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Settings Form */}
        <div className="md:col-span-2 space-y-6">
           <div className="bg-medical-dark/40 border border-white/5 p-8 rounded-3xl space-y-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-medical-cyan/10 text-medical-cyan border border-medical-cyan/20">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{t("personal_info")}</h3>
                  <p className="text-xs text-gray-500 font-medium">{t("update_profile")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
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

              <div className="pt-4">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2 px-8 py-4 bg-medical-cyan rounded-2xl text-white font-black text-sm transition-all shadow-lg shadow-medical-cyan/20 disabled:opacity-50 active:scale-95"
                >
                  {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {t("save_changes")}
                </button>
              </div>
           </div>
        </div>

        {/* Sidebar Info Cards */}
        <div className="space-y-6">
           <div className="bg-medical-dark/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-3 text-medical-cyan">
                 <Shield className="w-5 h-5" />
                 <span className="text-sm font-bold uppercase tracking-wider">Account Security</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                 Your account is secured by Clerk. You can manage multi-factor authentication and active sessions in the account security panel.
              </p>
           </div>

           <div className="bg-medical-dark/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-3 text-purple-400">
                 <DownloadCloud className="w-5 h-5" />
                 <span className="text-sm font-bold uppercase tracking-wider">Data Integrations</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                 Safeguard your health history or migrate across devices.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button onClick={handleBackupData} className="w-full flex items-center justify-center gap-2 py-3 bg-medical-cyan/10 hover:bg-medical-cyan/20 text-medical-cyan border border-medical-cyan/30 rounded-xl font-bold text-sm transition-all shadow-md">
                  <DownloadCloud className="w-4 h-4" /> Download Backup
                </button>
                <label className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer">
                  <UploadIcon className="w-4 h-4" /> Restore Backup
                  <input type="file" accept=".json" className="hidden" onChange={handleRestoreData} />
                </label>
              </div>
           </div>

           <div className="bg-medical-dark/40 border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-3 text-green-400">
                 <Calendar className="w-5 h-5" />
                 <span className="text-sm font-bold uppercase tracking-wider">Member Since</span>
              </div>
              <p className="text-lg font-black text-white">
                 {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
           </div>

           <div className="pt-4">
              <SignOutButton>
                 <button className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 group">
                    <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    {t("sign_out")}
                 </button>
              </SignOutButton>
           </div>
        </div>
      </div>
    </div>
  );
}
