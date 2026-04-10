"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Camera,
  HardDrive,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  CloudUpload,
  X,
  Info,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { convertGlucose, GlucoseUnit, getUnitLabel } from "@/lib/units";
import { Html5Qrcode } from "html5-qrcode";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import localforage from "localforage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Device {
  id: string;
  name: string;
  brand: string;
  image: string;
  color: string;
}

interface MeterReading {
  id: string; // localID for selection tracking
  value: number; // always stored in mg/dL
  timestamp: string; // ISO string
  isSaved?: boolean; // true once committed to DB
}

type PairingMethod = "choice" | "qr" | "manual";
type MemoryView   = "idle" | "loading" | "ready" | "saving" | "saved";
type BtStatus     = "idle" | "checking" | "on" | "off" | "unsupported";

// ─── Device Catalog ───────────────────────────────────────────────────────────

const DEVICES: Device[] = [
  { id: "accu-chek-guide",    name: "Accu-Chek Guide",           brand: "Roche",    image: "/devices/accu-chek/images/guide.png",    color: "#06b6d4" },
  { id: "accu-chek-guide-me", name: "Accu-Chek Guide Me",        brand: "Roche",    image: "/devices/accu-chek/images/guide-me.png", color: "#06b6d4" },
  { id: "accu-chek-instant",  name: "Accu-Chek Instant",         brand: "Roche",    image: "/devices/accu-chek/images/instant.png",  color: "#06b6d4" },
  { id: "accu-chek-performa", name: "Accu-Chek Performa Connect", brand: "Roche",   image: "/devices/accu-chek/images/aviva.png",    color: "#06b6d4" },
  { id: "contour-next-one",   name: "Contour Next One",          brand: "Ascensia", image: "/devices/contour/images/logo.png",       color: "#10b981" },
  { id: "contour-next-ez",    name: "Contour Next EZ",           brand: "Ascensia", image: "/devices/contour/images/logo.png",       color: "#10b981" },
  { id: "onetouch-verio-reflect", name: "OneTouch Verio Reflect", brand: "LifeScan", image: "/devices/onetouch/images/logo.png",     color: "#3b82f6" },
  { id: "onetouch-verio-flex",    name: "OneTouch Verio Flex",   brand: "LifeScan", image: "/devices/onetouch/images/logo.png",      color: "#3b82f6" },
  { id: "freestyle-libre-2",  name: "FreeStyle Libre 2",         brand: "Abbott",   image: "/devices/freestyle/images/logo.png",     color: "#8b5cf6" },
  { id: "freestyle-libre-3",  name: "FreeStyle Libre 3",         brand: "Abbott",   image: "/devices/freestyle/images/logo.png",     color: "#8b5cf6" },
  { id: "dexcom-g6",          name: "Dexcom G6",                 brand: "Dexcom",   image: "/devices/dexcom/images/logo.png",        color: "#4ade80" },
  { id: "dexcom-g7",          name: "Dexcom G7",                 brand: "Dexcom",   image: "/devices/dexcom/images/logo.png",        color: "#4ade80" },
  { id: "beurer-gl-44",       name: "Beurer GL 44",              brand: "Beurer",   image: "/devices/accu-chek/images/logo.png",     color: "#94a3b8" },
];

const DEVICE_SPECS: Record<string, { time: string; sample: string; memory: string; battery: string }> = {
  "accu-chek-guide":        { time: "4s",        sample: "0.6 μL",       memory: "720 readings", battery: "2x CR2032"    },
  "accu-chek-guide-me":     { time: "4s",        sample: "0.6 μL",       memory: "720 readings", battery: "2x CR2032"    },
  "accu-chek-instant":      { time: "4s",        sample: "0.6 μL",       memory: "720 readings", battery: "2x CR2032"    },
  "accu-chek-performa":     { time: "5s",        sample: "0.6 μL",       memory: "500 readings", battery: "1x CR2032"    },
  "contour-next-one":       { time: "5s",        sample: "0.6 μL",       memory: "800 readings", battery: "2x CR2032"    },
  "contour-next-ez":        { time: "5s",        sample: "0.6 μL",       memory: "480 readings", battery: "2x CR2032"    },
  "onetouch-verio-reflect": { time: "5s",        sample: "0.4 μL",       memory: "750 readings", battery: "2x CR2032"    },
  "onetouch-verio-flex":    { time: "5s",        sample: "0.4 μL",       memory: "500 readings", battery: "1x CR2032"    },
  "freestyle-libre-2":      { time: "Real-time", sample: "Sensor-based", memory: "90 days",      battery: "Rechargeable" },
  "freestyle-libre-3":      { time: "Real-time", sample: "Sensor-based", memory: "90 days",      battery: "Rechargeable" },
  "dexcom-g6":              { time: "5 mins",    sample: "Continuous",   memory: "Lifetime",     battery: "90-day Trans" },
  "dexcom-g7":              { time: "5 mins",    sample: "Continuous",   memory: "Lifetime",     battery: "Built-in"     },
  "beurer-gl-44":           { time: "5s",        sample: "0.6 μL",       memory: "480 readings", battery: "2x CR2032"    },
};

// ─── Glucose status helper ────────────────────────────────────────────────────

function glucoseStatus(mgdl: number): { label: string; color: string; icon: React.ReactNode } {
  if (mgdl < 70)  return { label: "Low",    color: "#ef4444", icon: <TrendingDown className="w-3.5 h-3.5" /> };
  if (mgdl > 180) return { label: "High",   color: "#f59e0b", icon: <TrendingUp   className="w-3.5 h-3.5" /> };
  return           { label: "Normal", color: "#10b981", icon: <Minus          className="w-3.5 h-3.5" /> };
}

// ─── Real Bluetooth Parsers (IEEE 11073-20601) ────────────────────────────────
function parseSFloat(data: number): number {
  const exponent = (data >> 12) & 0x0F;
  const mantissa = data & 0x0FFF;
  // Handle 2's complement
  const signedExponent = exponent > 7 ? exponent - 16 : exponent;
  const signedMantissa = mantissa > 2047 ? mantissa - 4096 : mantissa;
  return signedMantissa * Math.pow(10, signedExponent);
}

function parseGlucoseMeasurement(data: DataView): MeterReading {
  const flags = data.getUint8(0);
  let offset = 1;

  // Seq number
  const sequenceNumber = data.getUint16(offset, true); offset += 2;

  // Time (7 bytes)
  const year = data.getUint16(offset, true); offset += 2;
  const month = data.getUint8(offset++) - 1;
  const day = data.getUint8(offset++);
  const hours = data.getUint8(offset++);
  const minutes = data.getUint8(offset++);
  const seconds = data.getUint8(offset++);
  const timestamp = new Date(year, month, day, hours, minutes, seconds);

  // Time Offset (optional)
  if (flags & 0x01) offset += 2;

  // Concentration (optional)
  let value = 0;
  if (flags & 0x02) {
    const rawVal = data.getUint16(offset, true); offset += 2;
    const unitFlag = flags & 0x04; // 0 = kg/L (we'll convert to mg/dL), 1 = mol/L
    const sfloat = parseSFloat(rawVal);
    
    if (unitFlag) {
      // mol/L -> mmol/L -> mg/dL
      value = Math.round(sfloat * 1000 * 18.0182);
    } else {
      // kg/L -> mg/dL (1 kg/L = 100000 mg/dL)
      value = Math.round(sfloat * 100000);
    }
  }

  return {
    id: `ble-${sequenceNumber}-${timestamp.getTime()}`,
    value,
    timestamp: timestamp.toISOString(),
    isSaved: false
  };
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const { t, lang } = useI18n();
  const { user } = useUser();
  const router = useRouter();

  // ── wizard state ──
  const [step, setStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pin, setPin] = useState("");
  const [pairingMethod, setPairingMethod] = useState<PairingMethod>("choice");
  const [savedDevices, setSavedDevices] = useState<Device[]>([]);

  // ── live connection state ──
  const [batteryLevel] = useState(87);
  const [lastReading, setLastReading] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unit, setUnit] = useState<GlucoseUnit>("mg/dL");

  // ── bluetooth detection state ──
  const [btStatus, setBtStatus] = useState<BtStatus>("idle");
  const btListenerRef = useRef<(() => void) | null>(null);

  // ── meter memory state ──
  const [memoryView, setMemoryView] = useState<MemoryView>("idle");
  const [meterMemory, setMeterMemory] = useState<MeterReading[]>([]);
  const [selectedReadings, setSelectedReadings] = useState<Set<string>>(new Set());
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── init ──
  useEffect(() => {
    const saved = localStorage.getItem("glucose_unit") as GlucoseUnit;
    if (saved) setUnit(saved);
    const savedM = localStorage.getItem("connected_meters");
    if (savedM) {
      try { setSavedDevices(JSON.parse(savedM)); } catch { /* ignore */ }
    }
  }, []);

  // ── persist saved devices list every time it changes ──
  useEffect(() => {
    localStorage.setItem("connected_meters", JSON.stringify(savedDevices));
  }, [savedDevices]);

  const filteredDevices = useMemo(() =>
    DEVICES.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]);

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const nextStep = useCallback(() => setStep(s => Math.min(s + 1, totalSteps - 1)), []);
  const prevStep = useCallback(() => {
    if (step === 3 && pairingMethod !== "choice") {
      setPairingMethod("choice");
    } else {
      setStep(s => Math.max(s - 1, 0));
    }
  }, [step, pairingMethod]);

  const handleDisconnect = (deviceId: string) => {
    setSavedDevices(prev => prev.filter(d => d.id !== deviceId));
    if (selectedDevice?.id === deviceId) { setSelectedDevice(null); setStep(0); }
  };

  const simulateSearch = () => {
    setIsSearching(true);
    setTimeout(() => { setIsSearching(false); nextStep(); }, 3000);
  };

  // ─── Bluetooth availability check ─────────────────────────────────────────────
  // Local type shim — avoids @types/web-bluetooth dependency
  interface BluetoothDevice extends EventTarget {
    gatt: {
      connect(): Promise<BluetoothRemoteGATTServer>;
    };
  }
  interface BluetoothRemoteGATTServer {
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    startNotifications(): Promise<void>;
    value?: DataView;
  }
  interface BluetoothNavigator extends Navigator {
    bluetooth: {
      getAvailability(): Promise<boolean>;
      requestDevice(options: { filters?: { services?: string[]; namePrefix?: string }[]; optionalServices?: string[] }): Promise<BluetoothDevice>;
    } & EventTarget;
  }

  const checkBluetooth = useCallback(async () => {
    setBtStatus("checking");

    // Clean up any previous listener
    if (btListenerRef.current) {
      btListenerRef.current();
      btListenerRef.current = null;
    }

    const nav = navigator as BluetoothNavigator;

    // Web Bluetooth API not supported (Firefox, iOS Safari, etc.)
    if (typeof navigator === "undefined" || !nav.bluetooth) {
      setBtStatus("unsupported");
      return;
    }

    try {
      const available = await nav.bluetooth.getAvailability();

      if (available) {
        setBtStatus("on");
        // Small delay so user sees the "on" state briefly, then advance
        setTimeout(() => nextStep(), 800);
      } else {
        setBtStatus("off");

        // Listen for when user enables Bluetooth — auto-advance
        const handler = () => {
          nav.bluetooth.getAvailability().then((isAvailable: boolean) => {
            if (isAvailable) {
              setBtStatus("on");
              setTimeout(() => nextStep(), 600);
            }
          });
        };

        nav.bluetooth.addEventListener("availabilitychanged", handler);

        // Store cleanup function
        btListenerRef.current = () => {
          nav.bluetooth.removeEventListener("availabilitychanged", handler);
        };
      }
    } catch {
      // getAvailability() may throw in some environments — treat as unsupported
      setBtStatus("unsupported");
    }
  }, [nextStep]);

  // Cleanup BT listener when leaving this step
  useEffect(() => {
    if (step !== 1) {
      if (btListenerRef.current) {
        btListenerRef.current();
        btListenerRef.current = null;
      }
      if (step !== 1) setBtStatus("idle");
    }
  }, [step]);

  // ─── Meter Memory: fetch latest reading from Supabase on success screen ──────
  const fetchLatestFromDB = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const { data } = await supabase
        .from("glucose_readings")
        .select("value, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setLastReading(data.value);
    } catch { /* silent */ } finally {
      setIsSyncing(false);
    }
  }, [user]);

  // ─── Realistic Meter Memory Simulation ───────────────────────────────────────
  const generateRealisticReadings = useCallback((count = 15): MeterReading[] => {
    const readings: MeterReading[] = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      // Days subtracted from now
      const date = new Date(now.getTime());
      date.setDate(date.getDate() - Math.floor(i / 3)); // ~3 readings per day
      
      // Distributed times (morning, afternoon, night)
      const slot = i % 3;
      if (slot === 0) date.setHours(7 + Math.floor(Math.random() * 2), 15 + Math.floor(Math.random() * 40));
      else if (slot === 1) date.setHours(13 + Math.floor(Math.random() * 2), 10 + Math.floor(Math.random() * 30));
      else date.setHours(20 + Math.floor(Math.random() * 2), 5 + Math.floor(Math.random() * 50));

      const baseValue = slot === 2 ? 160 : slot === 0 ? 110 : 130;
      const variation = Math.floor(Math.random() * 60) - 30;

      readings.push({
        id: `device-${date.getTime()}`,
        value: baseValue + variation,
        timestamp: date.toISOString(),
        isSaved: false
      });
    }
    return readings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, []);

  // ─── Meter Memory: Real Discovery vs Demo ─────────────────────────────────────
  const discoveryMode = useRef<"real" | "demo">("demo");

  const collectMeterMemory = useCallback(async (mode: "real" | "demo" = "demo") => {
    discoveryMode.current = mode;
    setMemoryView("loading");
    setMeterMemory([]);
    setSaveError(null);

    if (mode === "demo") {
      // Premium Simulation
      await new Promise(r => setTimeout(r, 2200));
      const readings = generateRealisticReadings(20);
      setMeterMemory(readings);
      setSelectedReadings(new Set(readings.map(r => r.id)));
      setMemoryView("ready");
    } else {
      // ── REAL WEB BLUETOOTH SYNC ──
      const nav = navigator as BluetoothNavigator;
      if (!nav.bluetooth) {
         setSaveError("Web Bluetooth not supported");
         setMemoryView("idle");
         return;
      }

      try {
        const device = await nav.bluetooth.requestDevice({
          filters: [{ services: ["glucose"] }],
          optionalServices: ["battery_service", "device_information"]
        });

        // Connect to GATT
        const server = await device.gatt.connect();
        
        // Discovery Service
        const service = await server.getPrimaryService("glucose");
        
        // Get Measurement Characteristic
        const characteristic = await service.getCharacteristic("glucose_measurement");
        
        // Listen for data
        await characteristic.startNotifications();
        
        characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          if (!target.value) return;
          const reading = parseGlucoseMeasurement(target.value);
          setMeterMemory(prev => {
            if (prev.find(r => r.id === reading.id)) return prev;
            return [reading, ...prev];
          });
        });

        // ── Advance Logic ── 
        // We wait for the first incoming packet or a short timeout
        // (Real meters sometimes need a button press on the device to send records)
        await new Promise(r => setTimeout(r, 5000)); 

        setMemoryView("ready");

      } catch (err: unknown) {
        console.error("BT ERROR", err);
        const error = err as Error;
        if (error.name === "NotFoundError") {
          setMemoryView("idle"); 
        } else {
          setSaveError("Connection failed: " + error.message);
          setMemoryView("idle");
        }
      }
    }
  }, [generateRealisticReadings]);

  // ─── Save selected readings to Supabase ───────────────────────────────────────
  const saveSelectedToDatabase = useCallback(async () => {
    if (!user || selectedReadings.size === 0) return;
    setMemoryView("saving");
    setSaveProgress(0);
    setSaveError(null);

    const toSave = meterMemory.filter(r => selectedReadings.has(r.id));
    let savedCount = 0;

    for (const reading of toSave) {
      try {
        const { error } = await supabase.from("glucose_readings").insert({
          user_id: user.id,
          value: reading.value,
          notes: discoveryMode.current === "real" ? `Real Sync — ${selectedDevice?.name}` : "Meter Demo Sync",
          source: "bluetooth",
          is_valid: true,
          created_at: reading.timestamp,
        });
        if (!error) {
          savedCount++;
          setMeterMemory(prev => prev.map(r => r.id === reading.id ? { ...r, isSaved: true } : r));
        }
      } catch (err) {
        console.error("Save error", err);
      }
      setSaveProgress(Math.round((savedCount / toSave.length) * 100));
    }

    // Invalidate dashboard caches
    const timeRanges = ["7d", "1m", "3m", "1y", "all"];
    await Promise.all(timeRanges.map(range =>
      localforage.removeItem(`dashboard_readings_${user.id}_${range}`)
    ));

    setMemoryView("saved");
  }, [user, selectedReadings, meterMemory, selectedDevice]);

  const toggleReading = (id: string) => {
    setSelectedReadings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedReadings.size === meterMemory.length) {
      setSelectedReadings(new Set());
    } else {
      setSelectedReadings(new Set(meterMemory.map(r => r.id)));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Step 0: Device Selection ──────────────────────────────────────────────────
  const Step0 = () => (
    <div className="space-y-6">
      {savedDevices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Past Connections</h2>
          <div className="grid gap-3">
            {savedDevices.map(device => (
              <motion.div
                key={`saved-${device.id}`}
                whileHover={{ scale: 1.01 }}
                className="flex items-center gap-4 p-3 rounded-2xl border border-medical-cyan/20 bg-medical-cyan/5 backdrop-blur-xl relative group"
              >
                <div onClick={() => { setSelectedDevice(device); setStep(4); }}
                  className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative cursor-pointer">
                  <Image src={device.image} alt={device.name} width={48} height={48} className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-medical-cyan/10" />
                </div>
                <div onClick={() => { setSelectedDevice(device); setStep(4); }} className="flex-1 cursor-pointer">
                  <h3 className="font-semibold text-white text-sm">{device.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Connected</p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDisconnect(device.id); }}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-xl transition-all text-red-500"
                >
                  <ZapOff className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
          <div className="h-px w-full bg-white/5 my-2" />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder={t("search_devices")}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#111827]/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-medical-cyan transition-colors text-white placeholder:text-gray-500"
        />
      </div>

      <div className="grid gap-3 max-h-[55vh] overflow-y-auto no-scrollbar pb-10">
        {filteredDevices.map(device => (
          <motion.div
            key={device.id}
            whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.04)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setSelectedDevice(device); nextStep(); }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] cursor-pointer transition-all"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative">
              <Image src={device.image} alt={device.name} fill className="object-cover opacity-80" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white text-sm">{device.name}</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{device.brand}</p>
            </div>
            <ChevronRight className="text-gray-600 w-5 h-5 flex-shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ── Step 1: Connection Intent + Bluetooth Gate ────────────────────────────────
  const Step1 = () => {
    const specs = selectedDevice ? DEVICE_SPECS[selectedDevice.id] : null;

    return (
      <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Device image */}
        <div className="relative w-44 h-44">
          <div className="absolute inset-0 blur-3xl rounded-full" style={{ background: `${selectedDevice?.color}18` }} />
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
          >
            {selectedDevice && <Image src={selectedDevice.image} alt={selectedDevice.name} fill className="object-cover" />}
          </motion.div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{selectedDevice?.name}</h2>
          <p className="text-gray-400 text-sm">{selectedDevice?.brand} · Ready to pair</p>
        </div>

        {specs && (
          <div className="w-full grid grid-cols-2 gap-3">
            {[
              { label: "Test Time",   value: specs.time    },
              { label: "Sample Size", value: specs.sample  },
              { label: "Memory",      value: specs.memory  },
              { label: "Battery",     value: specs.battery },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-left">
                <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-bold text-white leading-none">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Bluetooth Status Gate ───────────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* idle / on → normal connect button */}
          {(btStatus === "idle" || btStatus === "on") && (
            <motion.div
              key="connect-btn"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="w-full space-y-3"
            >
              {btStatus === "on" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Bluetooth is ON · Connecting…</span>
                </motion.div>
              )}
              <button
                onClick={checkBluetooth}
                disabled={btStatus === "on"}
                className="w-full py-4 bg-medical-cyan text-black font-black rounded-2xl shadow-lg shadow-medical-cyan/25 hover:opacity-90 transition-all active:scale-[0.98] uppercase tracking-widest text-sm disabled:opacity-60"
              >
                {t("connect_now")}
              </button>
              <button onClick={prevStep} className="w-full py-3 bg-white/5 text-gray-400 font-medium rounded-2xl hover:bg-white/10 transition-all text-sm">
                {t("cancel")}
              </button>
            </motion.div>
          )}

          {/* checking → spinner */}
          {btStatus === "checking" && (
            <motion.div
              key="checking"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center gap-4 py-6"
            >
              <div className="relative w-16 h-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-medical-cyan"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bluetooth className="w-6 h-6 text-medical-cyan" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-bold text-sm">Checking Bluetooth…</p>
                <p className="text-gray-500 text-xs">Detecting radio status on your device</p>
              </div>
            </motion.div>
          )}

          {/* off → actionable error card */}
          {btStatus === "off" && (
            <motion.div
              key="bt-off"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full space-y-4"
            >
              {/* Status card */}
              <div className="w-full p-5 rounded-3xl border border-red-500/25 bg-red-500/8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                    <Bluetooth className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-red-300">Bluetooth is OFF</p>
                    <p className="text-[10px] text-red-500/70 mt-0.5">Enable it to connect your meter</p>
                  </div>
                  {/* Pulsing dot */}
                  <div className="ml-auto flex-shrink-0">
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"
                    />
                  </div>
                </div>

                {/* How to enable */}
                <div className="space-y-2 text-left">
                  <p className="text-[9px] uppercase tracking-widest text-gray-600 font-black mb-2">How to enable</p>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-medical-cyan font-black mt-0.5">📱</span>
                    <p className="text-[11px] text-gray-400"><span className="text-white font-semibold">Mobile:</span> Pull down the status bar → tap the Bluetooth icon</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-medical-cyan font-black mt-0.5">💻</span>
                    <p className="text-[11px] text-gray-400"><span className="text-white font-semibold">Desktop:</span> Settings → Bluetooth → turn on the toggle</p>
                  </div>
                </div>

                {/* Auto-detect pill */}
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-medical-cyan flex-shrink-0"
                  />
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Waiting for Bluetooth · Will auto-detect when enabled</p>
                </div>
              </div>

              {/* Retry + cancel */}
              <button
                onClick={checkBluetooth}
                className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all text-sm uppercase tracking-widest"
              >
                Check Again
              </button>
              <button onClick={prevStep} className="w-full py-3 text-gray-600 font-medium text-sm hover:text-gray-400 transition-all">
                {t("cancel")}
              </button>
            </motion.div>
          )}

          {/* unsupported → graceful warning, still allow proceeding */}
          {btStatus === "unsupported" && (
            <motion.div
              key="bt-unsupported"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full space-y-4"
            >
              <div className="w-full p-4 rounded-2xl border border-amber-500/20 bg-amber-500/8 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-bold text-amber-300">Bluetooth detection not available</p>
                  <p className="text-[11px] text-amber-500/70 mt-1">Your browser doesn&apos;t support the Web Bluetooth API. Please ensure Bluetooth is enabled on your device before continuing.</p>
                </div>
              </div>
              <button
                onClick={nextStep}
                className="w-full py-4 bg-medical-cyan text-black font-black rounded-2xl shadow-lg shadow-medical-cyan/25 hover:opacity-90 transition-all uppercase tracking-widest text-sm"
              >
                Continue Anyway
              </button>
              <button onClick={prevStep} className="w-full py-3 bg-white/5 text-gray-400 font-medium rounded-2xl hover:bg-white/10 transition-all text-sm">
                {t("cancel")}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    );
  };

  // ── Step 2: Instructional Guide ────────────────────────────────────────────────
  const Step2 = () => (
    <div className="space-y-8">
      <div className="space-y-4">
        <InstructionItem icon={<Settings2 className="w-5 h-5 text-medical-cyan" />} text={t("turn_off_meter")} step={1} />
        <InstructionItem icon={<Bluetooth className="w-5 h-5 text-medical-cyan" />} text={t("long_press_bt")} step={2} />
      </div>

      <div className="flex flex-col items-center justify-center pt-4 space-y-6">
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.08, 0.25, 0.08] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute -inset-8 bg-medical-cyan rounded-full blur-2xl"
          />
          <div className="relative bg-medical-cyan/10 p-7 rounded-full border border-medical-cyan/20">
            <Bluetooth className={`w-12 h-12 text-medical-cyan ${isSearching ? "animate-pulse" : ""}`} />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-white font-semibold">{isSearching ? t("looking_for_devices") : t("how_to_pair")}</p>
          <p className="text-sm text-gray-500">
            {isSearching ? "Scanning for BLE devices…" : "Ready to discover your meter"}
          </p>
        </div>

        {!isSearching && (
          <button
            onClick={simulateSearch}
            className="w-full py-4 bg-medical-cyan/10 text-medical-cyan border border-medical-cyan/20 font-bold rounded-2xl hover:bg-medical-cyan/20 transition-all uppercase tracking-widest text-sm"
          >
            {t("start_analyzing")}
          </button>
        )}

        {isSearching && (
          <div className="flex gap-1.5 items-end h-8">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                animate={{ height: [6, 28, 6] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                className="w-1.5 bg-medical-cyan rounded-full shadow-[0_0_10px_#06b6d4]"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 3: Secure Pairing ─────────────────────────────────────────────────────
  const Step3 = () => (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {pairingMethod === "choice" && (
          <motion.div key="choice" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-white">{t("enter_pin")}</h2>
              <p className="text-gray-400 text-sm">Choose your preferred pairing method</p>
            </div>

            <button
              onClick={() => setPairingMethod("qr")}
              className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center gap-4 hover:bg-white/[0.06] hover:border-medical-cyan/30 transition-all"
            >
              <div className="bg-medical-cyan/20 p-4 rounded-2xl"><QrCode className="w-8 h-8 text-medical-cyan" /></div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-white">{t("scan_qr")}</h3>
                <p className="text-sm text-gray-500">Scan the back label of the device</p>
              </div>
            </button>

            <button
              onClick={() => setPairingMethod("manual")}
              className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center gap-4 hover:bg-white/[0.06] transition-all"
            >
              <div className="bg-white/5 p-4 rounded-2xl"><Keyboard className="w-8 h-8 text-gray-400" /></div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-white">{t("enter_manual")}</h3>
                <p className="text-sm text-gray-500">Manual 6-digit PIN entry</p>
              </div>
            </button>
          </motion.div>
        )}

        {pairingMethod === "qr" && (
          <motion.div key="qr" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <QRScanner onResult={nextStep} onFallback={() => setPairingMethod("manual")} />
          </motion.div>
        )}

        {pairingMethod === "manual" && (
          <motion.div key="manual" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
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
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
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
                {lang === "ar" ? "مسح" : "Clear"}
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

  // ── Step 4: Success + Memory Collection ──────────────────────────────────────
  const Step4 = () => {
    // Register device in local store on mount
    useEffect(() => {
      if (selectedDevice) {
        setSavedDevices(prev => {
          if (prev.find(d => d.id === selectedDevice.id)) return prev;
          return [selectedDevice, ...prev].slice(0, 5);
        });
      }
      fetchLatestFromDB();
    }, []);

    return (
      <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-500">

        {/* ── Connection Badge ─────────────────────────────────────────────── */}
        <div className="relative w-full flex flex-col items-center pt-2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-56 bg-emerald-500/8 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`relative z-20 w-20 h-20 rounded-[1.6rem] flex items-center justify-center shadow-2xl ${isSyncing ? "bg-medical-cyan animate-pulse" : "bg-gradient-to-br from-emerald-400 to-emerald-600"}`}
            >
              {isSyncing ? <Bluetooth className="w-9 h-9 text-white" /> : <CheckCircle2 className="w-9 h-9 text-white" />}
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 border-2 border-emerald-500/30 rounded-[2.2rem] z-10"
            />
          </div>
          <div className="mt-6 text-center">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic -skew-x-3">
              {isSyncing ? "Linking…" : "Synced & Active"}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-emerald-400/80 font-bold uppercase tracking-widest text-[10px]">
                {selectedDevice?.name} · Secure Protocol
              </p>
            </div>
          </div>
        </div>

        {/* ── Live Glucose Card ────────────────────────────────────────────── */}
        <div className="w-full glass-card-premium rounded-[2.5rem] overflow-hidden border border-white/10">
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 relative bg-black/40">
                {selectedDevice && <Image src={selectedDevice.image} alt="" fill className="object-contain p-1.5" />}
              </div>
              <div>
                <h3 className="text-white font-bold text-sm uppercase tracking-tight leading-none">{selectedDevice?.brand}</h3>
                <p className="text-gray-500 text-[10px] mt-0.5">Protocol: READY</p>
              </div>
            </div>
            {/* Battery */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-black text-gray-600 tracking-widest">PWR</span>
              <div className="w-9 h-4 border border-white/20 rounded-[3px] p-0.5 relative">
                <motion.div
                  animate={{ width: `${batteryLevel}%`, backgroundColor: batteryLevel > 40 ? "#10b981" : "#ef4444" }}
                  className="h-full rounded-[1px]"
                />
              </div>
              <span className="text-xs font-bold text-white">{batteryLevel}%</span>
            </div>
          </div>

          {/* Value */}
          <div className="px-6 py-8 text-center relative overflow-hidden">
            {isSyncing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30">
                <div className="flex gap-1.5 items-end mb-3 h-8">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div key={i} animate={{ height: [4, 28, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1.5 bg-medical-cyan rounded-full shadow-[0_0_10px_#06b6d4]" />
                  ))}
                </div>
                <p className="text-[10px] font-black text-medical-cyan uppercase tracking-widest">Reading Last Record…</p>
              </div>
            )}
            <div className="inline-flex items-baseline gap-2">
              <motion.span
                key={lastReading ?? "null"}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-6xl font-black text-white tracking-tighter italic"
              >
                {lastReading ? convertGlucose(lastReading, unit) : "---"}
              </motion.span>
              <span className="text-lg font-bold text-emerald-500/60 uppercase">{unit === "mg/dL" ? "mg/dL" : getUnitLabel(unit, t)}</span>
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Live Protocol</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">ISO-15197</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Meter Memory Section ─────────────────────────────────────────── */}
        <MemorySection
          memoryView={memoryView}
          meterMemory={meterMemory}
          selectedReadings={selectedReadings}
          saveProgress={saveProgress}
          saveError={saveError}
          unit={unit}
          onCollect={(mode) => collectMeterMemory(mode)}
          onToggle={toggleReading}
          onToggleAll={toggleSelectAll}
          onSave={saveSelectedToDatabase}
          onReset={() => { setMemoryView("idle"); setMeterMemory([]); setSelectedReadings(new Set()); }}
        />

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="w-full flex flex-col gap-3 pb-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-5 bg-emerald-500 text-black font-black uppercase tracking-widest text-sm rounded-[2rem] shadow-[0_16px_40px_rgba(16,185,129,0.3)] hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            {t("done")} · Complete
          </button>
          <button
            onClick={() => handleDisconnect(selectedDevice?.id ?? "")}
            className="w-full py-3.5 text-red-500/60 font-black text-xs uppercase tracking-[0.3em] hover:text-red-500 transition-all"
          >
            {t("disconnect") || "Secure Disconnect"}
          </button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050a0f] text-white selection:bg-medical-cyan/30">
      {/* Sticky Header & Progress */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#050a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => step === 0 ? router.back() : prevStep()}
            className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </button>
          <h1 className="text-base font-bold tracking-tight">{t("connections")}</h1>
          <div className="w-10" />
        </div>
        <div className="h-0.5 w-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${progress}%` }}
            className="h-full bg-medical-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          />
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 pt-24 pb-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}
            className="w-full"
          >
            {step === 0 && <Step0 />}
            {step === 1 && <Step1 />}
            {step === 2 && <Step2 />}
            {step === 3 && <Step3 />}
            {step === 4 && <Step4 />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-80 h-80 bg-medical-cyan/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-medical-blue/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}

// ─── Memory Section Component ─────────────────────────────────────────────────

interface MemorySectionProps {
  memoryView: MemoryView;
  meterMemory: MeterReading[];
  selectedReadings: Set<string>;
  saveProgress: number;
  saveError: string | null;
  unit: GlucoseUnit;
  onCollect: (mode: "real" | "demo") => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onSave: () => void;
  onReset: () => void;
}

function MemorySection({
  memoryView, meterMemory, selectedReadings, saveProgress, saveError,
  unit, onCollect, onToggle, onToggleAll, onSave, onReset,
}: MemorySectionProps) {
  const allSelected = meterMemory.length > 0 && selectedReadings.size === meterMemory.length;
  const savedCount = meterMemory.filter(r => r.isSaved).length;

  return (
    <div className="w-full space-y-4">
      {/* ── Idle: CTA Buttons ────────────────────────────────────────────────── */}
      {memoryView === "idle" && (
        <motion.div
           initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
           className="grid grid-cols-1 gap-3"
        >
          {/* Real Discovery */}
          <button
            onClick={() => onCollect("real")}
            className="w-full p-5 rounded-3xl border border-medical-cyan/30 bg-medical-cyan/10 hover:bg-medical-cyan/20 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-medical-cyan/10 blur-2xl rounded-full -mr-12 -mt-12" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-medical-cyan/20 border border-medical-cyan/30 flex items-center justify-center flex-shrink-0">
                <Bluetooth className="w-6 h-6 text-medical-cyan animate-pulse" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-bold text-white text-sm">Real Meter Discovery</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Connect to hardware via Web Bluetooth</p>
              </div>
              <ChevronRight className="w-5 h-5 text-medical-cyan" />
            </div>
          </button>

          {/* Demo Simulation */}
          <button
            onClick={() => onCollect("demo")}
            className="w-full p-4 rounded-3xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Cpu className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-gray-300 text-xs">Demo Simulation</h3>
                <p className="text-[9px] text-gray-500">Preview with realistic randomized data</p>
              </div>
            </div>
          </button>
        </motion.div>
      )}

      {/* ── Loading: Syncing Animation ──────────────────────────────────────── */}
      {memoryView === "loading" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full p-8 rounded-3xl border border-medical-cyan/20 bg-medical-cyan/5 flex flex-col items-center gap-5"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-full border-2 border-transparent border-t-medical-cyan"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-medical-cyan" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-white font-bold text-sm">Reading Device Memory…</p>
            <p className="text-gray-500 text-xs">Transferring readings via BLE</p>
          </div>
          <div className="flex gap-1 items-end h-5">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <motion.div key={i} animate={{ height: [3, 20, 3] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.08 }}
                className="w-1 bg-medical-cyan/60 rounded-full" />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Ready / Saving / Saved: Data Table ─────────────────────────────── */}
      {(memoryView === "ready" || memoryView === "saving" || memoryView === "saved") && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl border border-white/10 bg-[#0a1219]/80 backdrop-blur-2xl overflow-hidden"
        >
          {/* Table Header */}
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-medical-cyan" />
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wide">Device Memory</h4>
                <p className="text-[9px] text-gray-500 mt-0.5">{meterMemory.length} readings collected</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {memoryView === "saved" && (
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                  {savedCount} Saved
                </span>
              )}
              <button onClick={onReset} className="p-1.5 rounded-lg hover:bg-white/5 transition-all text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Column Labels */}
          <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/5 grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center">
            {/* Select All */}
            <button
              onClick={onToggleAll}
              disabled={memoryView !== "ready"}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${allSelected ? "bg-medical-cyan border-medical-cyan" : "border-white/20 hover:border-medical-cyan/50"} disabled:opacity-40`}
            >
              {allSelected && <CheckCircle2 className="w-3 h-3 text-black" strokeWidth={3} />}
            </button>
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Value · Status</span>
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Time</span>
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Date</span>
          </div>

          {/* Readings List */}
          <div className="max-h-72 overflow-y-auto no-scrollbar divide-y divide-white/[0.04]">
            {meterMemory.map((reading, idx) => {
              const status = glucoseStatus(reading.value);
              const dt = new Date(reading.timestamp);
              const timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const dateStr = dt.toLocaleDateString([], { month: "short", day: "numeric" });
              const isSelected = selectedReadings.has(reading.id);

              return (
                <motion.div
                  key={reading.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.025 }}
                  onClick={() => memoryView === "ready" && onToggle(reading.id)}
                  className={`px-5 py-3 grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center transition-all ${memoryView === "ready" ? "cursor-pointer hover:bg-white/[0.04]" : ""} ${isSelected && !reading.isSaved ? "bg-medical-cyan/5" : ""} ${reading.isSaved ? "opacity-60" : ""}`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${reading.isSaved ? "bg-emerald-500/20 border-emerald-500/40" : isSelected ? "bg-medical-cyan border-medical-cyan" : "border-white/15"}`}>
                    {(isSelected || reading.isSaved) && (
                      <CheckCircle2 className={`w-3 h-3 ${reading.isSaved ? "text-emerald-400" : "text-black"}`} strokeWidth={3} />
                    )}
                  </div>

                  {/* Value + Status */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-0.5 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                    <div>
                      <p className="text-white font-black text-sm leading-none">
                        {convertGlucose(reading.value, unit)}{" "}
                        <span className="text-[9px] text-gray-500 font-bold not-italic uppercase">{unit === "mg/dL" ? "mg/dL" : "mmol"}</span>
                      </p>
                      <div className="flex items-center gap-1 mt-0.5" style={{ color: status.color }}>
                        {status.icon}
                        <span className="text-[9px] font-bold uppercase tracking-wider">{status.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Time */}
                  <span className="text-[10px] font-bold text-gray-400 tabular-nums">{timeStr}</span>

                  {/* Date */}
                  <span className="text-[10px] font-bold text-gray-500 tabular-nums">{dateStr}</span>
                </motion.div>
              );
            })}
          </div>

          {/* Footer: Save Bar ────────────────────────────────── */}
          <div className="px-5 py-4 border-t border-white/5 space-y-3">
            {/* Error */}
            {saveError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-[10px] text-red-400">{saveError}</p>
              </div>
            )}

            {/* Saving progress */}
            {memoryView === "saving" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className="text-medical-cyan">Uploading to database…</span>
                  <span className="text-white">{saveProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${saveProgress}%` }}
                    className="h-full bg-medical-cyan rounded-full shadow-[0_0_8px_#06b6d4]"
                  />
                </div>
              </div>
            )}

            {/* Saved success */}
            {memoryView === "saved" && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-300">{savedCount} readings saved!</p>
                  <p className="text-[9px] text-emerald-500/70 mt-0.5 uppercase tracking-wider">Dashboard cache refreshed</p>
                </div>
              </div>
            )}

            {/* Action button */}
            {memoryView === "ready" && (
              <button
                onClick={onSave}
                disabled={selectedReadings.size === 0}
                className="w-full py-4 bg-gradient-to-r from-medical-cyan to-emerald-400 text-black font-black rounded-2xl shadow-lg shadow-medical-cyan/20 hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
              >
                <CloudUpload className="w-5 h-5" />
                Save {selectedReadings.size} Reading{selectedReadings.size !== 1 ? "s" : ""} to Database
              </button>
            )}

            {memoryView === "saving" && (
              <button disabled className="w-full py-4 bg-medical-cyan/30 text-medical-cyan font-black rounded-2xl flex items-center justify-center gap-2 text-sm uppercase tracking-widest opacity-60">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                  <Cpu className="w-5 h-5" />
                </motion.div>
                Saving…
              </button>
            )}

            {/* Info note */}
            {(memoryView === "ready" || memoryView === "saved") && (
              <div className="flex items-start gap-2 text-[9px] text-gray-600">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Readings are stored in UTC and displayed in your local timezone. Duplicate entries are skipped by the server.</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── QR Scanner Component ─────────────────────────────────────────────────────

function QRScanner({ onResult, onFallback }: { onResult: (res: string) => void; onFallback: () => void }) {
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
            if (scannerRef.current && scannerRef.current.getState() === 2) {
              await scannerRef.current.stop();
            }
            setIsValidated(true);
            if (navigator.vibrate) navigator.vibrate(200);
            setTimeout(() => onResult(decodedText), 500);
          },
          () => {}
        );
      } catch (err) {
        console.error("Scanner start error:", err);
        if (isMounted) onFallback();
      }
    };

    startScanner();
    timeoutRef.current = setTimeout(async () => {
      if (!isValidated && isMounted) {
        if (scannerRef.current && scannerRef.current.getState() === 2) {
          await scannerRef.current.stop().catch(() => {});
        }
        onFallback();
      }
    }, 12000);

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
      await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: mode } as MediaTrackConstraints] });
    } catch (e) { console.warn("Torch not supported", e); }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{t("scan_qr")}</h2>
        <p className="text-gray-400 text-sm">{t("align_qr")}</p>
      </div>

      <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-black">
        <div id="qr-reader" className="w-full h-full" />
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute inset-0 border-[40px] border-black/60 transition-colors duration-500 ${isValidated ? "border-emerald-500/20" : ""}`} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border-2 rounded-3xl transition-all duration-300 ${isValidated ? "border-emerald-500 scale-105" : "border-medical-cyan/50"}`}>
            {!isValidated && (
              <motion.div
                animate={{ top: ["5%", "95%", "5%"] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-medical-cyan to-transparent shadow-[0_0_15px_#06b6d4]"
              />
            )}
          </div>
        </div>
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
          <button onClick={toggleFlash} className="p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all">
            {flashlight ? <Zap className="w-6 h-6 text-yellow-400" /> : <ZapOff className="w-6 h-6 text-gray-400" />}
          </button>
          <button onClick={onFallback} className="p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all">
            <Keyboard className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-medical-cyan/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-medical-cyan animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-300">{t("scanning")}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3">
        <Camera className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 italic">Position the device&apos;s back label within the frame. Detection is automatic.</p>
      </div>
    </div>
  );
}

// ─── InstructionItem ──────────────────────────────────────────────────────────

function InstructionItem({ icon, text, step }: { icon: React.ReactNode; text: string; step: number }) {
  return (
    <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-medical-cyan/10 border border-medical-cyan/20 flex items-center justify-center font-bold text-medical-cyan">
        {step}
      </div>
      <div className="flex-1 flex items-center">
        <p className="text-gray-200 font-medium">{text}</p>
      </div>
      <div className="flex-shrink-0 flex items-center">{icon}</div>
    </div>
  );
}
