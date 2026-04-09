"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  Search, 
  Bluetooth, 
  CheckCircle2, 
  ArrowLeft, 
  Settings2, 
  Cpu,
  QrCode,
  Keyboard,
  Zap,
  ZapOff,
  Camera
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { convertGlucose, GlucoseUnit } from "@/lib/units";
import { Html5Qrcode } from "html5-qrcode";

// --- Types ---
interface Device {
  id: string;
  name: string;
  brand: string;
  image: string;
  isPro: boolean;
  color: string;
}

type PairingMethod = "choice" | "qr" | "manual";

// --- Constants ---
const DEVICES: Device[] = [
  // Accu-Chek Models
  { id: "accu-chek-guide", name: "Accu-Chek Guide", brand: "Roche", image: "/devices/accu-chek.png", isPro: true, color: "#06b6d4" },
  { id: "accu-chek-guide-me", name: "Accu-Chek Guide Me", brand: "Roche", image: "/devices/accu-chek.png", isPro: false, color: "#06b6d4" },
  { id: "accu-chek-instant", name: "Accu-Chek Instant", brand: "Roche", image: "/devices/accu-chek.png", isPro: true, color: "#06b6d4" },
  { id: "accu-chek-performa", name: "Accu-Chek Performa Connect", brand: "Roche", image: "/devices/accu-chek.png", isPro: true, color: "#06b6d4" },
  
  // Contour Models
  { id: "contour-next-one", name: "Contour Next One", brand: "Ascensia", image: "/devices/contour.png", isPro: true, color: "#10b981" },
  { id: "contour-next-ez", name: "Contour Next EZ", brand: "Ascensia", image: "/devices/contour.png", isPro: false, color: "#10b981" },
  
  // OneTouch Models
  { id: "onetouch-verio-reflect", name: "OneTouch Verio Reflect", brand: "LifeScan", image: "/devices/onetouch.png", isPro: true, color: "#3b82f6" },
  { id: "onetouch-verio-flex", name: "OneTouch Verio Flex", brand: "LifeScan", image: "/devices/onetouch.png", isPro: false, color: "#3b82f6" },
  
  // FreeStyle Models
  { id: "freestyle-libre-2", name: "FreeStyle Libre 2", brand: "Abbott", image: "/devices/freestyle.png", isPro: true, color: "#8b5cf6" },
  { id: "freestyle-libre-3", name: "FreeStyle Libre 3", brand: "Abbott", image: "/devices/freestyle.png", isPro: true, color: "#8b5cf6" },

  // CGM & Other Brands
  { id: "dexcom-g6", name: "Dexcom G6", brand: "Dexcom", image: "/devices/dexcom.png", isPro: true, color: "#4ade80" },
  { id: "dexcom-g7", name: "Dexcom G7", brand: "Dexcom", image: "/devices/dexcom.png", isPro: true, color: "#4ade80" },
  { id: "beurer-gl-44", name: "Beurer GL 44", brand: "Beurer", image: "/devices/accu-chek.png", isPro: false, color: "#94a3b8" },
];

const DEVICE_SPECS: Record<string, { time: string; sample: string; memory: string; battery: string }> = {
  "accu-chek-guide": { time: "4s", sample: "0.6 μL", memory: "720 readings", battery: "2x CR2032" },
  "accu-chek-guide-me": { time: "4s", sample: "0.6 μL", memory: "720 readings", battery: "2x CR2032" },
  "accu-chek-instant": { time: "4s", sample: "0.6 μL", memory: "720 readings", battery: "2x CR2032" },
  "accu-chek-performa": { time: "5s", sample: "0.6 μL", memory: "500 readings", battery: "1x CR2032" },
  "contour-next-one": { time: "5s", sample: "0.6 μL", memory: "800 readings", battery: "2x CR2032" },
  "contour-next-ez": { time: "5s", sample: "0.6 μL", memory: "480 readings", battery: "2x CR2032" },
  "onetouch-verio-reflect": { time: "5s", sample: "0.4 μL", memory: "750 readings", battery: "2x CR2032" },
  "onetouch-verio-flex": { time: "5s", sample: "0.4 μL", memory: "500 readings", battery: "1x CR2032" },
  "freestyle-libre-2": { time: "Real-time", sample: "Sensor-based", memory: "90 days", battery: "Rechargeable" },
  "freestyle-libre-3": { time: "Real-time", sample: "Sensor-based", memory: "90 days", battery: "Rechargeable" },
  "dexcom-g6": { time: "5 mins", sample: "Continuous", memory: "Lifetime", battery: "90-day Trans" },
  "dexcom-g7": { time: "5 mins", sample: "Continuous", memory: "Lifetime", battery: "Built-in" },
  "beurer-gl-44": { time: "5s", sample: "0.6 μL", memory: "480 readings", battery: "2x CR2032" },
};

// --- Components ---

export default function ConnectionsPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pin, setPin] = useState("");
  const [pairingMethod, setPairingMethod] = useState<PairingMethod>("choice");
  const [savedDevices, setSavedDevices] = useState<Device[]>([]);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isConnected, setIsConnected] = useState(true);
  const [lastReading, setLastReading] = useState(112);
  const [isSyncing, setIsSyncing] = useState(false);

  // Simulation: Bluetooth Data Stream
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 4) {
      interval = setInterval(() => {
        // Slowly drain battery
        setBatteryLevel(prev => Math.max(prev - (Math.random() > 0.8 ? 1 : 0), 12));
        
        // Randomly simulate a brief signal drop
        if (Math.random() > 0.98) {
          setIsConnected(false);
          setTimeout(() => setIsConnected(true), 2000);
        }

        // Randomly simulate a new test strip insertion (Data Ingest)
        if (Math.random() > 0.85 && isConnected) {
            setIsSyncing(true);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            setTimeout(() => {
                setLastReading(Math.floor(Math.random() * (180 - 70 + 1)) + 70);
                setIsSyncing(false);
            }, 800);
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [step, isConnected]);

  useEffect(() => {
    const saved = localStorage.getItem("connected_meters");
    if (saved) {
      try {
        setSavedDevices(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved devices", e);
      }
    }
  }, []);

  const filteredDevices = useMemo(() => {
    return DEVICES.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const prevStep = () => {
    if (step === 3 && pairingMethod !== "choice") {
      setPairingMethod("choice");
    } else {
      setStep(s => Math.max(s - 1, 0));
    }
  };

  const handleDisconnect = (deviceId: string) => {
    const updated = savedDevices.filter(d => d.id !== deviceId);
    setSavedDevices(updated);
    localStorage.setItem("connected_meters", JSON.stringify(updated));
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice(null);
      setStep(0);
    }
  };

  const simulateSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      nextStep();
    }, 3000);
  };

  // --- Step 1: Device Selection ---
  const Step1 = () => (
    <div className="space-y-6">
      {savedDevices.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">{t("past_connections") || "Past Connections"}</h2>
          <div className="grid gap-3">
            {savedDevices.map((device) => (
              <motion.div
                key={`saved-${device.id}`}
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-4 p-3 rounded-2xl border border-medical-cyan/20 bg-medical-cyan/5 backdrop-blur-xl transition-all relative group"
              >
                <div 
                  onClick={() => { setSelectedDevice(device); setStep(4); }}
                  className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative cursor-pointer"
                >
                  <Image src={device.image} alt={device.name} width={48} height={48} className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-medical-cyan/10" />
                </div>
                <div 
                  onClick={() => { setSelectedDevice(device); setStep(4); }}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-semibold text-white text-sm">{device.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="text-emerald-500 w-3 h-3" />
                    <p className="text-[10px] text-medical-cyan font-bold uppercase tracking-tighter">Connected</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDisconnect(device.id); }}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-xl transition-all text-red-500"
                >
                  <ZapOff className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input 
          type="text" 
          placeholder={t("search_devices")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#111827]/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-medical-cyan transition-colors text-white placeholder:text-gray-500"
        />
      </div>

      <div className="grid gap-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-10">
        {filteredDevices.map((device) => (
          <motion.div
            key={device.id}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setSelectedDevice(device); nextStep(); }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl cursor-pointer transition-all"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative">
              <Image src={device.image} alt={device.name} fill className="object-cover opacity-80" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{device.name}</h3>
                {device.isPro && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-medical-cyan/20 text-medical-cyan border border-medical-cyan/30">
                    {t("pro_badge")}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{device.brand}</p>
            </div>
            <ChevronRight className="text-gray-600 w-5 h-5" />
          </motion.div>
        ))}
      </div>
    </div>
  );

  // --- Step 2: Connection Intent ---
  const Step2 = () => (
    <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative w-48 h-48">
        <div className="absolute inset-0 bg-medical-cyan/10 blur-3xl rounded-full" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
        >
          {selectedDevice && (
            <Image 
              src={selectedDevice.image} 
              alt={selectedDevice.name} 
              fill 
              className="object-cover" 
            />
          )}
        </motion.div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">{selectedDevice?.name}</h2>
        <p className="text-gray-400">{t("device_details")}</p>
      </div>

      <div className="w-full space-y-3">
        <button 
          onClick={nextStep}
          className="w-full py-4 bg-medical-cyan text-black font-bold rounded-2xl shadow-lg shadow-medical-cyan/25 hover:opacity-90 transition-all active:scale-[0.98]"
        >
          {t("connect_now")}
        </button>
        <button 
          onClick={prevStep}
          className="w-full py-4 bg-white/5 text-gray-400 font-medium rounded-2xl hover:bg-white/10 transition-all"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );

  // --- Step 3: Instructional Guide ---
  const Step3 = () => (
    <div className="space-y-8">
      <div className="space-y-6">
        <InstructionItem icon={<Settings2 className="w-5 h-5 text-medical-cyan" />} text={t("turn_off_meter")} step={1} />
        <InstructionItem icon={<Bluetooth className="w-5 h-5 text-medical-cyan" />} text={t("long_press_bt")} step={2} />
      </div>

      <div className="flex flex-col items-center justify-center pt-8 space-y-6">
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute -inset-8 bg-medical-cyan rounded-full blur-2xl"
          />
          <div className="relative bg-medical-cyan/10 p-6 rounded-full border border-medical-cyan/20">
            <Bluetooth className={`w-12 h-12 text-medical-cyan ${isSearching ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-white font-medium">
            {isSearching ? t("looking_for_devices") : t("how_to_pair")}
          </p>
          <p className="text-sm text-gray-500">
            {isSearching ? "Ensuring Bluetooth visibility..." : "Ready to discover your meter"}
          </p>
        </div>

        {!isSearching && (
          <button 
            onClick={simulateSearch}
            className="w-full py-4 bg-medical-cyan/10 text-medical-cyan border border-medical-cyan/20 font-bold rounded-2xl hover:bg-medical-cyan/20 transition-all"
          >
            {t("start_analyzing")}
          </button>
        )}
      </div>
    </div>
  );

  // --- Step 4: Secure Pairing ---
  const Step4 = () => {
    return (
      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {pairingMethod === "choice" && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-white">{t("enter_pin")}</h2>
                <p className="text-gray-400 text-sm">Choose your preferred pairing method</p>
              </div>

              <button 
                onClick={() => setPairingMethod("qr")}
                className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center gap-4 hover:bg-white/[0.06] hover:border-medical-cyan/30 transition-all"
              >
                <div className="bg-medical-cyan/20 p-4 rounded-2xl">
                  <QrCode className="w-8 h-8 text-medical-cyan" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-white">{t("scan_qr")}</h3>
                  <p className="text-sm text-gray-500">Scanning the back of the device</p>
                </div>
              </button>

              <button 
                onClick={() => setPairingMethod("manual")}
                className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center gap-4 hover:bg-white/[0.06] transition-all"
              >
                <div className="bg-white/5 p-4 rounded-2xl">
                  <Keyboard className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-white">{t("enter_manual")}</h3>
                  <p className="text-sm text-gray-500">Manual 6-digit PIN entry</p>
                </div>
              </button>
            </motion.div>
          )}

          {pairingMethod === "qr" && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <QRScanner onResult={() => nextStep()} onFallback={() => setPairingMethod("manual")} />
            </motion.div>
          )}

          {pairingMethod === "manual" && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">{t("enter_pin")}</h2>
                <p className="text-gray-400 text-sm">{t("pin_help")}</p>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-[#111827] border border-white/10 rounded-xl flex items-center justify-center text-2xl font-bold text-medical-cyan">
                    {pin[i] || ""}
                    {!pin[i] && i === pin.length && (
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-0.5 h-8 bg-medical-cyan" />
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <motion.button
                    key={num}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => pin.length < 6 && setPin(p => p + num)}
                    className="py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-xl font-bold text-white hover:bg-white/[0.07] transition-all"
                  >
                    {num}
                  </motion.button>
                ))}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPin(p => p.slice(0, -1))}
                  className="col-span-2 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-xl font-bold text-gray-500 hover:bg-white/[0.07] transition-all"
                >
                  {lang === 'ar' ? "مسح" : "Clear"}
                </motion.button>
              </div>

              <button 
                disabled={pin.length < 6}
                onClick={nextStep}
                className="w-full py-4 bg-medical-cyan text-black font-bold rounded-2xl shadow-lg shadow-medical-cyan/25 hover:opacity-90 disabled:opacity-30 transition-all"
              >
                {t("save_changes")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // --- Step 5: Success State ---
  const Step5 = () => {
    const [unit, setUnit] = useState<GlucoseUnit>("mg/dL");
    const specs = selectedDevice ? DEVICE_SPECS[selectedDevice.id] : null;

    useEffect(() => {
      const saved = localStorage.getItem("glucose_unit") as GlucoseUnit;
      if (saved) setUnit(saved);

      // Save to past connections
      if (selectedDevice) {
        const currentSaved = localStorage.getItem("connected_meters");
        let devices: Device[] = [];
        if (currentSaved) {
            try {
                devices = JSON.parse(currentSaved);
            } catch {
                // Ignore parse errors
            }
        }
        
        // Avoid duplicates
        if (!devices.find(d => d.id === selectedDevice.id)) {
            const newDevices = [selectedDevice, ...devices].slice(0, 5); // Keep last 5
            localStorage.setItem("connected_meters", JSON.stringify(newDevices));
        }
      }
    }, []);

    const converted = convertGlucose(lastReading, unit);

    return (
      <div className="flex flex-col items-center justify-center text-center space-y-8 py-4">
        <div className="relative">
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className={`relative z-10 p-6 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-500 ${isSyncing ? 'bg-medical-cyan animate-pulse' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}
          >
            {isSyncing ? <Bluetooth className="w-16 h-16 text-white" /> : <CheckCircle2 className="w-16 h-16 text-white" />}
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -inset-10 bg-emerald-500/20 blur-3xl rounded-full"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tight">
            {isSyncing ? "Ingesting Data..." : t("success_connected")}
          </h2>
          <p className="text-gray-400 text-sm max-w-[280px] mx-auto">
             {isSyncing ? "Receiving clinical packet from meter..." : `Your ${selectedDevice?.name} is now active and transmitting clinical data.`}
          </p>
        </div>

        {/* Meter Details Visual Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 p-6"
        >
          <AnimatePresence>
            {isSyncing && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-medical-cyan/10 backdrop-blur-sm z-30 flex items-center justify-center"
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-1">
                            {[0,1,2].map(i => (
                                <motion.div 
                                    key={i}
                                    animate={{ height: [4, 12, 4] }}
                                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                    className="w-1 bg-medical-cyan rounded-full"
                                />
                            ))}
                        </div>
                        <p className="text-[10px] font-bold text-medical-cyan uppercase tracking-widest">New Test Detected</p>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Cpu className="w-32 h-32 text-white" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/20 relative">
                  {selectedDevice && <Image src={selectedDevice.image} alt="" fill className="object-cover" />}
               </div>
               <div className="text-left">
                  <h4 className="text-white font-bold">{selectedDevice?.brand} Precision</h4>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-3 rounded-full bg-emerald-500/60" />)}
                    <span className="text-[10px] text-gray-500 ml-1 font-mono uppercase tracking-tighter">Signal Optimized</span>
                  </div>
               </div>
            </div>

            {specs && (
              <div className="grid grid-cols-2 gap-3">
                <SpecItem label="Test Time" value={specs.time} />
                <SpecItem label="Sample Size" value={specs.sample} />
                <SpecItem label="Storage" value={specs.memory} />
                <motion.div 
                   animate={{ opacity: isConnected ? 1 : 0.5 }}
                   className="bg-black/20 rounded-2xl p-3 border border-white/5 text-left"
                >
                  <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Power Status</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white leading-none">{isConnected ? `${batteryLevel}%` : "---"}</p>
                    <div className="w-6 h-3 border border-white/20 rounded-[2px] p-[1px] relative">
                       <motion.div 
                          animate={{ 
                             width: isConnected ? `${batteryLevel}%` : "0%",
                             backgroundColor: batteryLevel > 20 ? "#10b981" : "#ef4444"
                          }}
                          className="h-full rounded-[1px]" 
                       />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
            
            <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">
                    <span>Live Calibration</span>
                    <motion.span 
                       animate={{ 
                          color: isConnected ? "#10b981" : "#ef4444",
                          textShadow: isConnected ? "0 0 10px rgba(16,185,129,0.5)" : "none"
                       }}
                    >
                       {isConnected ? "Active" : "Offline"}
                    </motion.span>
                </div>
                <div className="flex items-baseline gap-2 relative">
                    {!isConnected && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-20">
                            <p className="text-[10px] font-bold text-white uppercase tracking-tighter">Connection Lost...</p>
                        </div>
                    )}
                    <motion.span 
                        key={lastReading}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-4xl font-black text-white"
                    >
                        {converted}
                    </motion.span>
                    <span className="text-sm font-medium text-gray-500 uppercase">{unit === 'mg/dL' ? t('mg_dl') : t('g_l')}</span>
                </div>
            </div>
          </div>
        </motion.div>

        <div className="w-full pt-4 grid grid-cols-2 gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="py-4 bg-white text-black font-black rounded-2xl shadow-xl hover:bg-gray-100 transition-all active:scale-[0.98]"
          >
            {t("done")}
          </button>
          <button 
            onClick={() => handleDisconnect(selectedDevice?.id || "")}
            className="py-4 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-2xl hover:bg-red-500/20 transition-all active:scale-[0.98]"
          >
            {t("disconnect") || "Disconnect"}
          </button>
        </div>
      </div>
    );
  };

  const SpecItem = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-black/20 rounded-2xl p-3 border border-white/5 text-left">
      <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white leading-none">{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050a0f] text-white selection:bg-medical-cyan/30">
      {/* Header & Progress */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#050a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => step === 0 ? router.back() : prevStep()}
            className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">{t("connections")}</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 w-full bg-white/5 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-medical-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 pt-24 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="min-h-[70vh]"
          >
            {step === 0 && <Step1 />}
            {step === 1 && <Step2 />}
            {step === 2 && <Step3 />}
            {step === 3 && <Step4 />}
            {step === 4 && <Step5 />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Background Ornaments */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-80 h-80 bg-medical-cyan/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-medical-blue/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}

// --- Specialized QR Scanner Component ---

function QRScanner({ onResult, onFallback }: { onResult: (res: string) => void, onFallback: () => void }) {
  const { t } = useI18n();
  const [flashlight, setFlashlight] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    let isMounted = true;

    const startScanner = async () => {
      try {
        if (!isMounted) return;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // Success logic
            if (scannerRef.current && scannerRef.current.getState() === 2) {
                await scannerRef.current.stop();
            }
            setIsValidated(true);
            if (navigator.vibrate) navigator.vibrate(200);
            setTimeout(() => onResult(decodedText), 500);
          },
          () => {} // Silent ignore
        );
      } catch (err) {
        console.error("Scanner start error:", err);
        if (isMounted) onFallback();
      }
    };

    startScanner();

    // 10s fallback timeout
    timeoutRef.current = setTimeout(async () => {
        if (!isValidated && isMounted) {
            if (scannerRef.current && scannerRef.current.getState() === 2) {
                await scannerRef.current.stop().catch(() => {});
            }
            onFallback();
        }
    }, 12000); // 12s to be generous

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.getState() === 2) {
        scannerRef.current.stop().catch(() => {});
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onResult, onFallback, isValidated]);

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    try {
      const mode = !flashlight;
      setFlashlight(mode);
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: mode } as MediaTrackConstraints]
      });
    } catch (e) {
      console.warn("Torch not supported", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{t("scan_qr")}</h2>
        <p className="text-gray-400 text-sm">{t("align_qr")}</p>
      </div>

      <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-black">
        <div id="qr-reader" className="w-full h-full" />
        
        {/* Viewfinder Overlay */}
        <div className="absolute inset-0 pointer-events-none">
           <div className={`absolute inset-0 border-[40px] border-black/60 transition-colors duration-500 ${isValidated ? 'border-emerald-500/20' : ''}`} />
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border-2 rounded-3xl transition-all duration-300 ${isValidated ? 'border-emerald-500 scale-105' : 'border-medical-cyan/50'}`}>
              {!isValidated && (
                 <motion.div 
                    animate={{ top: ["5%", "95%", "5%"] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-medical-cyan to-transparent shadow-[0_0_15px_#06b6d4]"
                 />
              )}
           </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
             <button 
                onClick={toggleFlash}
                className="p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all"
             >
                {flashlight ? <Zap className="w-6 h-6 text-yellow-400" /> : <ZapOff className="w-6 h-6 text-gray-400" />}
             </button>
             <button 
                onClick={onFallback}
                className="p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all"
             >
                <Keyboard className="w-6 h-6 text-gray-400" />
             </button>
        </div>

        {/* Status */}
        <div className="absolute top-6 left-0 right-0 flex justify-center">
            <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-medical-cyan/20 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-medical-cyan animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-300">{t("scanning")}</span>
            </div>
        </div>
      </div>

      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3">
        <Camera className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 italic">
           Position the device’s back label within the frame. Detection is automatic.
        </p>
      </div>
    </div>
  );
}

function InstructionItem({ icon, text, step }: { icon: React.ReactNode, text: string, step: number }) {
  return (
    <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-medical-cyan/10 border border-medical-cyan/20 flex items-center justify-center font-bold text-medical-cyan">
        {step}
      </div>
      <div className="flex-1 flex items-center">
        <p className="text-gray-200 font-medium">{text}</p>
      </div>
      <div className="flex-shrink-0 flex items-center">
        {icon}
      </div>
    </div>
  );
}
