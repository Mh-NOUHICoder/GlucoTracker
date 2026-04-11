"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Camera, Image as ImageIcon, X, Zap, Loader2, CheckCircle, Edit, Droplets } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import localforage from "localforage";

// Helper function to resize image file or video stream to avoid Payload Too Large
const resizeImage = (source: HTMLImageElement | HTMLVideoElement, width: number, height: number): string => {
  const canvas = document.createElement("canvas");
  const MAX_DIMENSION = 800; // Optimal for OpenAI to keep payload small but legible
  
  let newWidth = width;
  let newHeight = height;

  if (width > height && width > MAX_DIMENSION) {
    newWidth = MAX_DIMENSION;
    newHeight = Math.floor((height * MAX_DIMENSION) / width);
  } else if (height > width && height > MAX_DIMENSION) {
    newHeight = MAX_DIMENSION;
    newWidth = Math.floor((width * MAX_DIMENSION) / height);
  }

  canvas.width = newWidth;
  canvas.height = newHeight;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0, newWidth, newHeight);
  }
  
  return canvas.toDataURL("image/jpeg", 0.7); // 70% quality keeps it very lightweight
};

export default function UploadButton() {
  const { user } = useUser();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ value: number, unit: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasUnsavedAnalysis, setHasUnsavedAnalysis] = useState(false);

  // Automatically save if user logs in after receiving a reading
  useEffect(() => {
    if (user && hasUnsavedAnalysis && analysisResult && !isSaved) {
      const saveToDatabase = async () => {
        try {
          const { error: sbError } = await supabase.from("glucose_readings").insert({
            user_id: user.id,
            value: analysisResult.value,
            notes: analysisResult.unit,
            source: "ai_vision",
            is_valid: true
          });
          if (!sbError) {
            console.log("Successfully securely saved reading post-login!");
            setIsSaved(true);
            setHasUnsavedAnalysis(false);
          }
        } catch (sbErr) {
          console.error("Supabase Exception:", sbErr);
        }
      };
      saveToDatabase();
    }
  }, [user, hasUnsavedAnalysis, analysisResult, isSaved]);

  // File upload logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new window.Image();
      img.onload = () => {
        const resizedBase64 = resizeImage(img, img.width, img.height);
        setPreviewImage(resizedBase64);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    }
  };

  // Ensure video stream connects after React mounts the <video> tag
  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const startCamera = useCallback(async () => {
    try {
      // First attempt: explicitly request back camera for mobile devices
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      setPreviewImage(null);
      setAnalysisResult(null);
    } catch (err) {
      console.warn("Back camera failed or not found, trying default webcam...", err);
      try {
        // Fallback: request literally any available camera (usually desktop front webcam)
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setStream(mediaStream);
        setIsCameraActive(true);
        setPreviewImage(null);
        setAnalysisResult(null);
      } catch (fallbackErr) {
        console.error("Error accessing any camera:", fallbackErr);
        toast.error("Could not access camera. Please check your browser permissions.");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const resizedBase64 = resizeImage(video, video.videoWidth, video.videoHeight);
      setPreviewImage(resizedBase64);
      stopCamera();
    }
  };

  const resetCapture = () => {
    setPreviewImage(null);
    setAnalysisResult(null);
    setIsSaved(false);
    setHasUnsavedAnalysis(false);
  };

  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualUnit, setManualUnit] = useState("mg/dL");

  const analyzeImage = async () => {
    if (!previewImage) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const preferredModelId = localStorage.getItem("preferredModelId");
      const preferredProvider = localStorage.getItem("preferredModelProvider");
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: previewImage,
          preferredModelId,
          preferredProvider
        }),
      });

      const textData = await response.text();
      let data;
      
      try {
        data = JSON.parse(textData);
      } catch {
        throw new Error("Server returned an invalid JSON response.");
      }
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      setAnalysisResult(data.data);
      handleSave(data.data.value, data.data.unit);
      
    } catch (err: unknown) {
      console.error(err);
      // If AI fails, offer manual entry
      setIsManualEntry(true);
      toast.error(t("ai_error_manual"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = () => {
    let val = parseFloat(manualValue);
    if (isNaN(val)) return toast.error(t("invalid_number"));
    
    let unit = manualUnit;
    // Normalize g/L to mg/dL
    if (unit === "g/L") {
       val = val * 100;
       unit = "mg/dL";
    }

    const result = { value: val, unit: unit };
    setAnalysisResult(result);
    handleSave(val, unit);
    setIsManualEntry(false);
  };

  const handleSave = async (value: number, unit: string) => {
    if (user) {
      try {
        const { error: sbError } = await supabase.from("glucose_readings").insert({
          user_id: user.id,
          value: value,
          notes: unit,
          source: isManualEntry ? "manual" : "ai_vision",
          is_valid: true
        });
        if (!sbError) {
          setIsSaved(true);
          setHasUnsavedAnalysis(false);
          // Invalidate dashboard caches to ensure fresh AI analysis and chart data
          if (user) {
            const timeRanges = ["7d", "1m", "3m", "1y", "all"];
            for (const range of timeRanges) {
              await localforage.removeItem(`dashboard_readings_${user.id}_${range}`);
            }
          }
        }
      } catch (sbErr) {
        console.error("Supabase Exception:", sbErr);
      }
    } else {
      setHasUnsavedAnalysis(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">
        {!isCameraActive && !previewImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full flex flex-col gap-4"
          >
            <motion.button
              onClick={startCamera}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group w-full aspect-[4/3] md:aspect-video rounded-3xl overflow-hidden border border-medical-cyan/40 bg-medical-dark/80 p-6 md:p-12 flex flex-col items-center justify-center gap-4 shadow-[0_0_40px_-15px_rgba(6,182,212,0.3)] backdrop-blur-md transition-all hover:border-medical-cyan hover:shadow-[0_0_50px_-10px_rgba(6,182,212,0.4)] mb-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-medical-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 w-20 h-20 rounded-full bg-medical-cyan/10 flex items-center justify-center group-hover:bg-medical-cyan/20 transition-colors border border-medical-cyan/30">
                <Camera className="w-10 h-10 text-medical-cyan" />
              </div>
              
              <div className="relative z-10 text-center space-y-1">
                <h3 className="text-2xl font-bold text-white">{t("open_camera")}</h3>
                <p className="text-gray-400">{t("open_camera_desc")}</p>
              </div>
            </motion.button>
            
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary !bg-medical-dark/50 !border-medical-blue/30 hover:!bg-medical-blue/10 mb-3"
            >
              <ImageIcon className="w-5 h-5 text-medical-blue" />
              <span className="font-medium">{t("upload_gallery")}</span>
            </motion.button>

            <motion.button
              onClick={() => setIsManualEntry(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary !bg-medical-cyan/5 !border-medical-cyan/20 !text-medical-cyan hover:!bg-medical-cyan/10"
            >
              <Edit className="w-5 h-5" />
              <span className="font-medium">{t("enter_manually")}</span>
            </motion.button>
          </motion.div>
        )}

        {isManualEntry && !previewImage && !analysisResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManualEntry(false)}
              className="absolute inset-0 bg-medical-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 100 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative w-full max-w-md p-6 sm:p-10 rounded-[3rem] bg-gradient-to-b from-medical-dark/95 to-medical-black border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] flex flex-col items-center"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-medical-cyan/5 via-transparent to-medical-blue/5 rounded-[3rem] pointer-events-none" />
              
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-medical-cyan/20 blur-2xl rounded-full" />
                <div className="relative w-20 h-20 rounded-[2rem] bg-medical-cyan p-[1px]">
                  <div className="w-full h-full rounded-[2rem] bg-medical-dark flex items-center justify-center">
                    <Droplets className="w-10 h-10 text-medical-cyan" />
                  </div>
                </div>
              </div>
              
              <div className="text-center space-y-2 mb-10 w-full px-4">
                <h3 className="text-3xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-medical-cyan/50 break-words line-clamp-2">
                  {t("manual_entry_title")}
                </h3>
                <p className="text-medical-cyan/50 font-bold uppercase tracking-[0.2em] text-[10px]">
                  {t("enter_manually_desc")}
                </p>
              </div>

              <div className="w-full space-y-8 mb-10">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-medical-cyan/20 to-medical-blue/20 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                  <input 
                    type="number" 
                    value={manualValue} 
                    onChange={(e) => setManualValue(e.target.value)}
                    placeholder="120"
                    autoFocus
                    className="relative w-full h-24 bg-medical-black/80 border border-white/10 rounded-[2rem] px-8 text-white font-black text-5xl text-center focus:outline-none focus:border-medical-cyan/50 transition-all placeholder:text-white/10 shadow-inner"
                  />
                </div>

                {/* Modern Segmented Unit Selector */}
                <div className="bg-medical-black/60 p-1.5 rounded-2xl border border-white/5 flex gap-1 relative overflow-hidden">
                  {["mg/dL", "mmol/L", "g/L"].map((u) => (
                    <button
                      key={u}
                      onClick={() => setManualUnit(u)}
                      className="relative flex-1 py-3 rounded-xl transition-all duration-300 z-10"
                    >
                      {manualUnit === u && (
                        <motion.div
                          layoutId="activeUnit"
                          className="absolute inset-0 bg-medical-cyan shadow-[0_0_15px_rgba(0,229,255,0.4)] rounded-xl"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className={`relative z-20 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${
                        manualUnit === u ? "text-black" : "text-gray-500 hover:text-gray-300"
                      }`}>
                        {u}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col w-full gap-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleManualSubmit}
                  className="btn-premium"
                >
                  {t("save_reading")}
                </motion.button>
                <button 
                  onClick={() => setIsManualEntry(false)} 
                  className="w-full py-2 text-gray-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isCameraActive && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full relative aspect-[3/4] sm:aspect-video rounded-3xl overflow-hidden border border-medical-cyan/50 shadow-2xl bg-black"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full border-[20px] border-black/30 flex items-center justify-center">
                 <div className="w-3/4 h-1/2 border-2 border-medical-cyan/50 rounded-xl relative">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-medical-cyan" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-medical-cyan" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-medical-cyan" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-medical-cyan" />
                 </div>
              </div>
            </div>

            <button 
              onClick={stopCamera}
              className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-red-500/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-medical-cyan/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-medical-cyan shadow-[0_0_20px_rgba(6,182,212,0.6)]" />
              </button>
            </div>
          </motion.div>
        )}

        {previewImage && !isCameraActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="w-full space-y-6"
          >
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-medical-blue/30 shadow-2xl bg-black group">
              <Image 
                src={previewImage} 
                alt={t("captured_reading")} 
                width={800}
                height={600}
                className={`w-full h-full object-contain transition-all ${isAnalyzing || isManualEntry ? 'brightness-50 blur-sm' : ''}`}
                unoptimized
              />
              {!isAnalyzing && !isManualEntry && (
                <button 
                  onClick={resetCapture}
                  className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              {isAnalyzing && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-medical-cyan animate-spin mb-4" />
                    <p className="text-white font-medium">{t("extracting_data")}</p>
                 </div>
              )}
              {isManualEntry && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                    <h4 className="text-white font-bold mb-4">{t("ai_limit_manual")}</h4>
                    <div className="flex gap-4 mb-6">
                       <input 
                         type="number" 
                         value={manualValue} 
                         onChange={(e) => setManualValue(e.target.value)}
                         placeholder="120"
                         className="w-24 bg-black border border-medical-cyan/50 rounded-xl px-4 py-3 text-white font-bold text-xl text-center focus:outline-none focus:border-medical-cyan"
                       />
                       <select 
                         value={manualUnit} 
                         onChange={(e) => setManualUnit(e.target.value)}
                         className="bg-black border border-medical-cyan/30 rounded-xl px-4 py-3 text-white font-bold focus:outline-none"
                       >
                          <option value="mg/dL">mg/dL</option>
                          <option value="mmol/L">mmol/L</option>
                          <option value="g/L">g/L</option>
                       </select>
                    </div>
                    <button 
                      onClick={handleManualSubmit}
                      className="px-8 py-3 bg-medical-cyan text-white font-bold rounded-xl shadow-lg hover:bg-medical-accent transition-colors"
                    >
                      {t("save_reading")}
                    </button>
                    <button onClick={() => setIsManualEntry(false)} className="mt-4 text-xs text-gray-400 hover:text-white underline italic">{t("cancel")}</button>
                 </div>
              )}
            </div>
            
            {!analysisResult && !isManualEntry ? (
              <motion.button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-premium !text-lg !py-4"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> {t("analyzing")}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" /> {t("analyze_reading")}
                  </>
                )}
              </motion.button>
            ) : analysisResult ? (
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="p-6 rounded-2xl border border-green-500/30 bg-green-500/10 flex flex-col items-center gap-2 text-center"
               >
                 <CheckCircle className="w-10 h-10 text-green-400 mb-2" />
                 <h4 className="text-gray-300 font-medium">{t("reading_extracted")}</h4>
                 <div className="text-4xl font-bold text-white tracking-tight flex items-baseline gap-2">
                    {analysisResult.value} <span className="text-lg text-gray-400">{analysisResult.unit}</span>
                 </div>
                 
                 {isSaved ? (
                   <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-medical-cyan/10 border border-medical-cyan/20 rounded-full">
                     <div className="w-1.5 h-1.5 rounded-full bg-medical-cyan shadow-[0_0_8px_#06b6d4]"></div>
                     <span className="text-xs font-medium text-medical-cyan">{t("saved_to_db")}</span>
                   </div>
                 ) : hasUnsavedAnalysis && !user ? (
                   <div className="mt-4">
                     <SignInButton mode="modal">
                        <button className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-medical-blue to-medical-cyan rounded-xl text-white font-medium hover:opacity-90 shadow-lg shadow-medical-blue/20 transition-all text-xs sm:text-sm">
                          {t("sign_in_to_save")}
                        </button>
                     </SignInButton>
                   </div>
                 ) : null}

                 <button onClick={resetCapture} className="mt-5 text-sm text-green-400 hover:text-green-300 underline underline-offset-4 transition-colors">{t("capture_another")}</button>
               </motion.div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
