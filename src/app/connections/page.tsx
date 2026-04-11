"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Search,
  Bluetooth,
  CheckCircle2,
  ArrowLeft,
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
  Smartphone,
  Trash2,
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

// ─── Senior TypeScript Bluetooth Interfaces ───────────────────────────────────
interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}
interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
  connected: boolean;
  device: BluetoothDevice;
}
interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
}
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;
  readValue(): Promise<DataView>;
  value?: DataView;
}
interface BluetoothNavigator extends Navigator {
  bluetooth: {
    getAvailability(): Promise<boolean>;
    requestDevice(options: { 
      filters?: { services?: (string | number)[]; namePrefix?: string }[]; 
      optionalServices?: (string | number)[];
    }): Promise<BluetoothDevice>;
  } & EventTarget;
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const { t, lang, dir } = useI18n();
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
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [lastReading, setLastReading] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null);
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
  const [discoveredDevices, setDiscoveredDevices] = useState<(Device & { signal: number })[]>([]);
  const [selectedDiscoveredDevice, setSelectedDiscoveredDevice] = useState<Device | null>(null);

  // ── New Professional Settings ──
  const [autoCollect, setAutoCollect] = useState(true);
  const [keepHistory, setKeepHistory] = useState(false);

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

  const totalSteps = 6;

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

  const handleRealDiscovery = async () => {
    setIsSearching(true);
    setDiscoveredDevices([]);
    
    const nav = navigator as BluetoothNavigator;
    if (!nav.bluetooth) {
      // Fallback to simulation if Bluetooth is missing
      simulateSearch();
      return;
    }

    try {
      // Trigger the REAL browser picker
      const device = await nav.bluetooth.requestDevice({
        // Standard filters for glucose meters (GATT Blood Glucose Service)
        filters: [
          { services: [0x1808] },
          { namePrefix: "Accu-Chek" },
          { namePrefix: "Contour" },
          { namePrefix: "OneTouch" }
        ],
        optionalServices: [0x180F, "device_information"]
      });

      // Once they pick a device
      const catalogMatch = DEVICES.find(d => 
        device.name?.toLowerCase().includes(d.name.toLowerCase()) || 
        device.name?.toLowerCase().includes(d.brand.toLowerCase()) ||
        selectedDevice?.id === d.id
      );

      const discovered: Device & { signal: number } = {
        id: device.id,
        name: device.name?.replace(/^meter\+/i, "Meter ") || "Unknown Device", // Cleaner name
        brand: catalogMatch?.brand || "GATT Meter",
        image: catalogMatch?.image || (selectedDevice?.image || "/devices/accu-chek/images/logo.png"),
        color: catalogMatch?.color || "#94a3b8",
        signal: 100
      };

      setDiscoveredDevices([discovered]);
      setSelectedDiscoveredDevice(discovered);
      setBleDevice(device);
      setIsSearching(false);
      
      // Advance to pairing/confirmation
      nextStep();
    } catch (err) {
      console.error("Discovery error:", err);
      setIsSearching(false);
      // Don't advance if they cancelled the picker
    }
  };

  const simulateSearch = () => {
    setIsSearching(true);
    setDiscoveredDevices([]);
    
    // Prioritize showing the selected device plus some neighbors for realism
    const found = [
      selectedDevice || DEVICES[0], 
      DEVICES[4], 
      DEVICES[2]
    ].filter(Boolean) as Device[];
    
    found.forEach((dev, i) => {
      setTimeout(() => {
        // Random signal between -90 and -50
        const dbm = -50 - Math.floor(Math.random() * 40);
        setDiscoveredDevices(prev => [...prev, { ...dev, signal: dbm }]);
      }, 800 + (i * 1000));
    });

    setTimeout(() => { 
      setIsSearching(false); 
      // DO NOT clear and DO NOT nextStep() - user must select
    }, 4500);
  };

  // ─── Bluetooth availability check ─────────────────────────────────────────────
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

  // Graceful BLE Disconnect on unmount
  useEffect(() => {
    return () => {
      if (bleDevice?.gatt?.connected) {
        bleDevice.gatt.disconnect();
      }
    };
  }, [bleDevice]);

  // ─── Save individual reading (Immediate Sync) ────────────────────────────────
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

    // "Feel Good" Automation: Auto-redirect to dashboard after save success
    setTimeout(() => {
      router.push("/dashboard");
    }, 2500);
  }, [user, selectedReadings, meterMemory, selectedDevice, router]);


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
         setSaveError("Bluetooth not supported/enabled in this browser");
         setMemoryView("idle");
         return;
      }

      try {
        let device = bleDevice;
        
        if (!device) {
          device = await nav.bluetooth.requestDevice({
            filters: [{ services: [0x1808] }],
            optionalServices: [0x180F, "device_information"]
          });
          setBleDevice(device);
        }

        const onDisconnect = () => {
          setBtStatus("idle");
          setMemoryView("idle");
          setBleDevice(null);
        };

        device.addEventListener("gattserverdisconnected", onDisconnect);

        const server = await device.gatt!.connect();
        
        // If we are in the wizard flow (Step 3), jump straight to Success/Live (Step 5)
        // Skipping manual PIN Step 4 because OS handles it
        if (step === 3) {
          setStep(5);
        }

        const service = await server.getPrimaryService(0x1808);
        const char = await service.getCharacteristic(0x2A18);
        
        await char.startNotifications();
        
        char.addEventListener("characteristicvaluechanged", (event: Event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          if (target.value) {
            const reading = parseGlucoseMeasurement(target.value);
            
            // Show big number instantly for UX
            setLastReading(reading.value);
            
            // Add to review list, but DO NOT save to DB yet (user control)
            setMeterMemory(prev => {
              if (prev.find(r => r.id === reading.id)) return prev;
              const next = [reading, ...prev];
              // Keep view manageable
              return next.slice(0, 50);
            });
            
            // Pre-select for the user so they only need one click to save
            setSelectedReadings(prev => new Set([...prev, reading.id]));
          }
        });

        // Optional Battery
        try {
          const batt = await server.getPrimaryService(0x180F);
          const levelChar = await batt.getCharacteristic(0x2A19);
          const val = await levelChar.readValue();
          setBatteryLevel(val.getUint8(0));
        } catch { /* ignore battery fail */ }

        setMemoryView("ready");

        // Automation: If auto-collect is on, trigger save immediately after connection
        if (autoCollect) {
          // Give it a small heartbeat for UI feel before saving
          setTimeout(() => {
            saveSelectedToDatabase();
          }, 1500);
        }
      } catch (err) {
        console.error("BLE FAIL", err);
        setMemoryView("idle");
        setSaveError(err instanceof Error ? err.message : "Connection failed");
      }
    }
  }, [generateRealisticReadings, bleDevice, step, autoCollect, saveSelectedToDatabase]);


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
    <div className="space-y-4">
      {savedDevices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Past Connections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {savedDevices.map(device => (
              <motion.div
                key={`saved-${device.id}`}
                whileHover={{ scale: 1.01 }}
                className="flex items-center gap-4 p-3 rounded-2xl border border-medical-cyan/20 bg-medical-cyan/5 backdrop-blur-xl relative group"
              >
                <div onClick={() => { setSelectedDevice(device); setStep(4); }}
                  className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative cursor-pointer">
                  <Image src={device.image} alt={device.name} width={48} height={48} className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-medical-primary/10" />
                </div>
                <div onClick={() => { setSelectedDevice(device); setStep(4); }} className="flex-1 cursor-pointer">
                  <h3 className="font-semibold text-white text-sm">{device.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-medical-primary animate-pulse" />
                    <p className="text-[10px] text-medical-primary font-bold uppercase tracking-wider">Connected</p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDisconnect(device.id); }}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-xl transition-all text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
          <div className="h-px w-full bg-white/5 my-2" />
        </div>
      )}

      <div className="relative">
        <Search className={`absolute ${dir === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5`} />
        <input
          type="text"
          dir={dir}
          placeholder={t("search_devices")}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full bg-[#111827]/50 border border-white/10 rounded-2xl py-3 ${dir === "rtl" ? "pr-12 pl-4" : "pl-12 pr-4"} outline-none focus:border-medical-cyan transition-colors text-white placeholder:text-gray-500`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-12 px-0.5">
        {filteredDevices.map(device => (
          <motion.div
            key={device.id}
            whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.04)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setSelectedDevice(device); nextStep(); }}
            className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 py-3 px-4 rounded-2xl border border-white/5 bg-white/[0.02] cursor-pointer transition-all hover:bg-medical-cyan/5 hover:border-medical-cyan/20"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative">
              <Image src={device.image} alt={device.name} fill className="object-cover opacity-80" />
            </div>
            <div className={`flex-1 ${dir === "rtl" ? "text-right" : "text-left"} min-w-0`}>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white text-xs sm:text-sm truncate w-full">{device.name}</h3>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{device.brand}</p>
            </div>
            {dir === "rtl" ? (
              <ArrowLeft className="text-gray-600 w-5 h-5 flex-shrink-0" />
            ) : (
              <ChevronRight className="text-gray-600 w-5 h-5 flex-shrink-0" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ── Step 1: Connection Intent + Bluetooth Gate ────────────────────────────────
  const Step1 = () => {
    const specs = selectedDevice ? DEVICE_SPECS[selectedDevice.id] : null;

    return (
      <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

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
                className="btn-primary"
              >
                {t("connect_now")}
              </button>
              <button onClick={prevStep} className="btn-secondary">
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
                className="btn-primary"
              >
                Check Again
              </button>
              <button onClick={prevStep} className="btn-secondary">
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
              <div className="w-full p-5 rounded-3xl border border-medical-cyan/25 bg-medical-cyan/8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-medical-cyan/15 flex items-center justify-center flex-shrink-0">
                    <Bluetooth className="w-5 h-5 text-medical-cyan" />
                  </div>
                  <div className={`text-left ${dir === "rtl" ? "text-right" : "text-left"}`}>
                    <p className="text-sm font-bold text-medical-cyan/90">Bluetooth detection not available</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Check your connection settings</p>
                  </div>
                </div>
              </div>
              <button
                onClick={nextStep}
                className="btn-primary"
              >
                Continue Anyway
              </button>
              <button onClick={prevStep} className="btn-secondary">
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
    <div className="space-y-8 min-h-[70vh] flex flex-col items-center justify-between py-6">
      
      {/* ── Scanning Header ── */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">
          {isSearching ? "Looking for compatible sensors..." : "Sensors Discovery"}
        </h2>
      </div>

      {/* ── Radar Visual ── */}
      <div className="relative flex-1 flex items-center justify-center w-full max-w-xs mx-auto">
        <AnimatePresence>
          {isSearching && (
            <>
              {/* Concentric Pulses */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`pulse-${i}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 2.2, opacity: [0, 0.4, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 1,
                    ease: "easeOut"
                  }}
                  className="absolute w-24 h-24 border border-medical-cyan/30 rounded-full"
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Central Device Mockup */}
        <div className="relative z-10 p-6 rounded-[2.5rem] bg-black/40 border border-white/10 shadow-2xl">
          <div className="w-16 h-28 border-2 border-white/20 rounded-[1.2rem] flex flex-col items-center justify-center p-2">
            <div className="w-8 h-1 bg-white/10 rounded-full mb-auto" />
            <Smartphone className={`w-8 h-8 text-white/40 ${isSearching ? "animate-pulse" : ""}`} />
            <Search className="w-3 h-3 text-medical-cyan absolute" strokeWidth={3} />
            <div className="w-2 h-2 rounded-full border border-white/10 mt-auto" />
          </div>
        </div>
      </div>

      {/* ── Status & Instructions ── */}
      <div className="w-full space-y-8">
        <div className="text-center space-y-3 px-6">
          <p className="text-sm text-gray-400 leading-relaxed">
            Make sure <span className="text-white font-semibold">Bluetooth</span> is turned on and the app has permission to access it
          </p>
        </div>

        {/* ── Found Devices List ── */}
        <div className="space-y-3 px-2">
          <AnimatePresence>
            {discoveredDevices.map((device) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setSelectedDiscoveredDevice(device);
                  nextStep();
                }}
                className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4 cursor-pointer hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-medical-cyan/10 flex items-center justify-center">
                  <Image src={device.image} alt="" width={32} height={32} className="object-contain p-1" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-bold text-sm">{device.name}</p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {device.brand} • Signal: {device.signal > -65 ? "strong" : device.signal > -80 ? "good" : "poor"} ({device.signal} dBm)
                  </p>
                </div>
                <div className="flex items-end gap-0.5 h-3">
                  {[1, 2, 3].map(bar => (
                    <div 
                      key={bar} 
                      className={`w-1 rounded-full ${bar <= (device.signal > -65 ? 3 : device.signal > -80 ? 2 : 1) ? "bg-medical-cyan shadow-[0_0_8px_#06b6d4]" : "bg-white/10"}`} 
                      style={{ height: `${33 * bar}%` }} 
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Action Buttons ── */}
        {!isSearching && discoveredDevices.length === 0 && (
          <div className="px-6 space-y-4">
            <button
              onClick={handleRealDiscovery}
              className="w-full py-4 bg-medical-cyan text-black font-black rounded-2xl shadow-lg transition-all uppercase tracking-widest text-sm"
            >
              Start Scanning
            </button>
          </div>
        )}

        <div className="text-center space-y-3 pt-4">
          <p className="text-[11px] text-gray-500">If your device is not discovered - please try adding it manually</p>
          <button
            onClick={nextStep}
            className="w-full max-w-[200px] h-12 mx-auto bg-medical-primary text-black font-extrabold rounded-full text-xs shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            Manually
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 3: Connection Confirmation ───────────────────────────────────────────
  const Step3 = () => {
    const activeDevice = selectedDiscoveredDevice || selectedDevice;
    
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
        
          {/* ── Device Image Hero ── */}
        <div className="flex justify-center mb-8">
          <div className="relative w-40 h-40">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 w-full h-full"
            >
              {activeDevice && (
                <Image 
                  src={activeDevice.image} 
                  alt={activeDevice.name} 
                  fill 
                  className="object-contain drop-shadow-[0_20px_50px_rgba(255,255,255,0.1)]" 
                />
              )}
            </motion.div>
          </div>
        </div>

        {/* ── Specs Table Card ── */}
        <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5 mb-4">
          <div className="p-4 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Device name</label>
              <div className="bg-black/20 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-white">{activeDevice?.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Vendor</span>
                <span className="text-medical-primary font-bold">{activeDevice?.brand}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Model</span>
                <span className="text-white font-medium">{activeDevice?.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Bluetooth name</span>
                <span className="text-white font-mono text-xs">{activeDevice?.name || "Ready"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Status</span>
                <span className="text-white font-medium">Ready to collect data</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Production Toggles ── */}
        <div className="space-y-3 mb-8">
          {/* Toggle 1 */}
          <div className="bg-[#1c1c1e] rounded-2xl p-4 border border-white/5 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-white">Collect data automatically</h4>
              <p className="text-[10px] text-gray-500">App has to be in the foreground with screen unlocked.</p>
            </div>
            <button 
              onClick={() => setAutoCollect(!autoCollect)}
              className={`w-12 h-6 rounded-full transition-colors relative ${autoCollect ? "bg-medical-primary shadow-[0_0_10px_#00e5ff]" : "bg-white/10"}`}
            >
              <motion.div 
                animate={{ x: autoCollect ? 26 : 4 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>

          {/* Toggle 2 */}
          <div className="bg-[#1c1c1e] rounded-2xl p-4 border border-white/5 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Keep history on device</h4>
            <button 
              onClick={() => setKeepHistory(!keepHistory)}
              className={`w-12 h-6 rounded-full transition-colors relative ${keepHistory ? "bg-medical-primary shadow-[0_0_10px_#00e5ff]" : "bg-white/10"}`}
            >
              <motion.div 
                animate={{ x: keepHistory ? 26 : 4 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>
        </div>

        {/* ── Main Action ── */}
        <button
          onClick={() => {
            // Respecting "Keep history on device" preference
            console.log(`Setting persistence: ${keepHistory ? 'HISTORY PRESERVED' : 'HISTORY REMOVED ON SYNC'}`);
            localStorage.setItem(`device_settings_${activeDevice?.id}`, JSON.stringify({ autoCollect, keepHistory }));
            collectMeterMemory("real");
          }}
          className="btn-primary"
        >
          Collect Data
        </button>
      </div>
    );
  };

  // ── Step 4: Secure Pairing ─────────────────────────────────────────────────────
  const Step4 = () => (
    <div className="space-y-6">
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
              className="btn-primary disabled:opacity-30"
            >
              {t("save_changes")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ── Step 5: Success + Memory Collection ──────────────────────────────────────
  const Step5 = () => {
    // Register device in local store on mount
    useEffect(() => {
      const activeDev = selectedDiscoveredDevice || selectedDevice;
      if (activeDev) {
        setSavedDevices(prev => {
          if (prev.find(d => d.id === activeDev.id)) return prev;
          return [activeDev, ...prev].slice(0, 5);
        });
      }
      fetchLatestFromDB();
    }, []);

    const activeDevice = selectedDiscoveredDevice || selectedDevice;

    return (
      <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-500">

        {/* ── Connection Badge ─────────────────────────────────────────────── */}
        <div className="relative w-full flex flex-col items-center pt-2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-56 bg-emerald-500/8 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`relative z-20 w-20 h-20 rounded-[1.6rem] flex items-center justify-center shadow-2xl ${isSyncing ? "bg-medical-primary animate-pulse shadow-[0_0_30px_#00e5ff]" : "bg-gradient-to-br from-medical-primary to-medical-primary-light"}`}
            >
              {isSyncing ? <Bluetooth className="w-9 h-9 text-black" /> : <CheckCircle2 className="w-9 h-9 text-black" />}
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 border-2 border-medical-primary/30 rounded-[2.2rem] z-10"
            />
          </div>
          <div className="mt-6 text-center">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic -skew-x-3">
              {isSyncing ? "Linking…" : "Synced & Active"}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-emerald-400/80 font-bold uppercase tracking-widest text-[10px]">
                {activeDevice?.name} · Secure Protocol
              </p>
            </div>
          </div>
        </div>

        {/* ── Live Glucose Card ────────────────────────────────────────────── */}
        <div className="w-full relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-medical-primary/20 to-medical-cyan/20 blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          <div className="relative w-full glass-card-premium rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 relative bg-black/60 p-1 flex items-center justify-center">
                  {activeDevice && (
                    <Image 
                      src={activeDevice.image} 
                      alt="" 
                      width={40} 
                      height={40} 
                      className="object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]" 
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-black text-xs uppercase tracking-[0.15em] leading-none">{activeDevice?.brand}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1 h-1 rounded-full bg-medical-cyan shadow-[0_0_5px_#06b6d4]" />
                    <p className="text-medical-cyan font-bold text-[9px] uppercase tracking-widest">Protocol Active</p>
                  </div>
                </div>
              </div>
              
              {/* Battery & Signal */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-1">
                   <div className="w-8 h-3.5 border border-white/20 rounded-[3px] p-0.5 relative">
                    <motion.div
                      animate={{ width: `${batteryLevel}%`, backgroundColor: batteryLevel > 40 ? "#10b981" : "#ef4444" }}
                      className="h-full rounded-[1px] shadow-[0_0_5px_rgba(16,185,129,0.3)]"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 tracking-tighter">{batteryLevel}%</span>
                </div>
              </div>
            </div>

            {/* Value Display */}
            <div className="px-6 py-10 text-center relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-medical-primary/10 blur-[50px] rounded-full pointer-events-none" />
              
              <div className="inline-flex items-baseline gap-2 relative z-10">
                <motion.span
                  key={lastReading ?? "null"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-7xl font-black text-white tracking-tighter italic drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                  {lastReading ? convertGlucose(lastReading, unit) : "---"}
                </motion.span>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black text-emerald-400/80 uppercase tracking-tighter -mt-1">{unit === "mg/dL" ? "mg/dL" : getUnitLabel(unit, t)}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Live</span>
                  </div>
                </div>
              </div>

              {/* Status Tags */}
              <div className="flex justify-center gap-2 mt-6">
                <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <Bluetooth className="w-3 h-3 text-medical-cyan" />
                  <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">BLE Stream</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">SECURE LINK</span>
                </div>
              </div>
            </div>

            {/* Sub-footer Message */}
            {isSyncing && (
              <div className="px-6 py-3 bg-medical-primary/10 flex items-center justify-center gap-3">
                <motion.div 
                  animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 border-2 border-transparent border-t-medical-primary rounded-full" 
                />
                <span className="text-[10px] font-black text-medical-primary uppercase tracking-[0.2em]">Synchronizing local cache...</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Meter Memory Section ─────────────────────────────────────────── */}
        <MemorySection
          discoveryMode={discoveryMode.current}
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
            className="btn-primary"
          >
            <CheckCircle2 className="w-5 h-5" />
            {t("done")} · Complete
          </button>
          <button
            onClick={() => handleDisconnect(activeDevice?.id ?? "")}
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
    <div className="bg-[#050505] text-white relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-medical-cyan/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-medical-primary/5 blur-[100px] rounded-full -ml-48 -mb-48 pointer-events-none" />

      <div className="w-full px-4 md:px-10 lg:px-16 space-y-4 relative z-10">
        {/* Header with Progress */}
        <div className="space-y-4 pt-0">
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              className={`p-2 -ml-2 rounded-xl hover:bg-white/5 transition-all text-gray-500 hover:text-white ${step === 0 && "opacity-0 cursor-default"}`}
              disabled={step === 0}
            >
              {dir === "rtl" ? <ChevronRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-1.5">
                {t("step_x_of_y").replace("{x}", (step + 1).toString()).replace("{y}", totalSteps.toString())}
              </span>
              <div className="flex gap-1.5">
                {[...Array(totalSteps)].map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === step ? "w-6 bg-medical-cyan shadow-[0_0_8px_#00e5ff]" : i < step ? "w-2 bg-emerald-500/50" : "w-1.5 bg-white/10"}`} />
                ))}
              </div>
            </div>
            <button onClick={() => router.push("/dashboard")} className="p-2 -mr-2 text-gray-500 hover:text-white transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Dynamic Step View */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "circOut" }}
          >
            {step === 0 && <Step0 />}
            {step === 1 && <Step1 />}
            {step === 2 && <Step2 />}
            {step === 3 && <Step3 />}
            {step === 4 && <Step4 />}
            {step === 5 && <Step5 />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}


interface MemorySectionProps {
  discoveryMode: "real" | "demo";
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
  discoveryMode, memoryView, meterMemory, selectedReadings, saveProgress, saveError,
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
              <div className="w-12 h-12 rounded-2xl bg-medical-primary/20 border border-medical-primary/30 flex items-center justify-center flex-shrink-0">
                <Bluetooth className="w-6 h-6 text-medical-primary animate-pulse" />
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
          <div className="px-5 py-4 border-b border-white/5 space-y-3">
            {discoveryMode === "demo" && (
              <div className="px-3 py-2 rounded-xl bg-medical-cyan/10 border border-medical-cyan/20 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-medical-cyan" />
                <p className="text-[10px] text-medical-cyan/80 font-bold uppercase tracking-tight">Review Simulation Data · Accuracy Check Required</p>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <HardDrive className={`w-4 h-4 ${discoveryMode === "real" ? "text-medical-primary" : "text-gray-500"}`} />
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white uppercase tracking-wide truncate">
                    {discoveryMode === "real" ? "Live Meter Feed" : "Simulated Memory"}
                  </h4>
                  <p className="text-[9px] text-gray-500 mt-0.5 whitespace-nowrap">{meterMemory.length} readings ready</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {memoryView === "saved" && savedCount > 0 && (
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                    {savedCount} Saved
                  </span>
                )}
                <button onClick={onToggleAll} className="px-2.5 py-1.5 rounded-lg border border-white/10 text-[9px] font-black uppercase text-gray-400 hover:text-white transition-colors whitespace-nowrap">
                  {allSelected ? "Deselect" : "Select All"}
                </button>
                <button onClick={onReset} className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-gray-500 hover:text-red-400" title="Clear All">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Column Labels */}
          <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/5 grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center">
            {/* Select All */}
            <button
              onClick={onToggleAll}
              disabled={memoryView !== "ready"}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${allSelected ? "bg-medical-primary border-medical-primary shadow-[0_0_10px_#00e5ff]" : "border-white/20 hover:border-medical-primary/50"} disabled:opacity-40`}
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
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${reading.isSaved ? "bg-emerald-500/20 border-emerald-500/40" : isSelected ? "bg-medical-primary border-medical-primary shadow-[0_0_10px_#00e5ff]" : "border-white/15"}`}>
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
                className="btn-primary shadow-[0_10px_30px_rgba(0,229,255,0.2)]"
              >
                <CloudUpload className="w-5 h-5" />
                Save {selectedReadings.size} Reading{selectedReadings.size !== 1 ? "s" : ""}
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


