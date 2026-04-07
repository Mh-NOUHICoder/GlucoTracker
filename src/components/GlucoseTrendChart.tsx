"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";

interface Reading {
  id: string;
  value: number | string;
  created_at: string;
}

interface GoldChartProps {
  data: Reading[];
  unit?: string;
  targetMin?: number;
  targetMax?: number;
  hideTooltips?: boolean;
  isLight?: boolean;
}

export default function GlucoseTrendChart({ data, unit = "mg/dL", targetMin = 70, targetMax = 180, hideTooltips = false, isLight = false }: GoldChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Responsive Dimensions
  const width = 800;
  const height = isMobile ? 500 : 350; // Taller on mobile to avoid "smallness"
  const paddingX = isMobile ? 65 : 50; // Increased to 65 for mobile to fit labels
  const paddingY = isMobile ? 40 : 50;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Process data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sorted = [...data]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-100);

    const values = sorted.map(d => {
        const raw = Number(d.value);
        return unit === "mmol/L" ? Number((raw / 18.0182).toFixed(1)) : raw;
    });

    const maxVal = Math.max(...values, unit === "mmol/L" ? 12 : 200) + (unit === "mmol/L" ? 1 : 20);
    const minVal = Math.max(0, Math.min(...values, unit === "mmol/L" ? 2 : 40) - (unit === "mmol/L" ? 1 : 20));
    const range = maxVal - minVal;

    return sorted.map((d, i) => {
      const val = unit === "mmol/L" ? Number((Number(d.value) / 18.0182).toFixed(1)) : Number(d.value);
      const x = paddingX + (i / (sorted.length - 1 || 1)) * chartWidth;
      const y = paddingY + chartHeight - ((val - minVal) / (range || 1)) * chartHeight;
      return { ...d, x, y, value: val };
    });
  }, [data, chartWidth, chartHeight, paddingX, paddingY, unit]);

  const linePath = useMemo(() => {
    if (chartData.length < 2) return "";
    let path = `M ${chartData[0].x} ${chartData[0].y}`;
    for (let i = 0; i < chartData.length - 1; i++) {
        const p0 = chartData[i];
        const p1 = chartData[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 3;
        const cp2x = p0.x + (2 * (p1.x - p0.x)) / 3;
        path += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [chartData]);

  const areaPath = useMemo(() => {
    if (chartData.length < 2) return "";
    const baseLine = height - paddingY;
    return `${linePath} L ${chartData[chartData.length - 1].x} ${baseLine} L ${chartData[0].x} ${baseLine} Z`;
  }, [chartData, linePath, height, paddingY]);

  if (chartData.length === 0) return null;

  const displayTargetMin = unit === "mmol/L" ? Number((targetMin / 18.0182).toFixed(1)) : targetMin;
  const displayTargetMax = unit === "mmol/L" ? Number((targetMax / 18.0182).toFixed(1)) : targetMax;

  return (
    <div className="relative w-full min-h-[450px] md:min-h-[400px] flex items-center justify-center overflow-hidden">
      {!isLight && <div className="absolute inset-0 bg-radial-gradient from-medical-cyan/5 to-transparent pointer-events-none" />}

      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full overflow-visible select-none transition-all duration-500"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isLight ? "#2563eb" : "#06b6d4"} stopOpacity={isLight ? "0.15" : "0.35"} />
            <stop offset="100%" stopColor={isLight ? "#2563eb" : "#06b6d4"} stopOpacity="0" />
          </linearGradient>
          
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>

        {/* Dynamic Grid Lines */}
        {[displayTargetMin, (displayTargetMin + displayTargetMax) / 2, displayTargetMax].map((v, i) => {
            const values = chartData.map(d => d.value);
            const maxVal = Math.max(...values, unit === "mmol/L" ? 12 : 200) + (unit === "mmol/L" ? 1 : 20);
            const minVal = Math.max(0, Math.min(...values, unit === "mmol/L" ? 2 : 40) - (unit === "mmol/L" ? 1 : 20));
            const range = maxVal - minVal;
            const y = paddingY + chartHeight - ((v - minVal) / (range || 1)) * chartHeight;
            if (y < paddingY || y > height - paddingY) return null;
            const isBound = v === displayTargetMin || v === displayTargetMax;
            
            return (
                <g key={i}>
                    <line 
                        x1={paddingX} x2={width - paddingX} y1={y} y2={y} 
                        stroke={isBound ? (isLight ? "#f87171" : "rgba(6, 182, 212, 0.5)") : (isLight ? "#e5e7eb" : "rgba(255, 255, 255, 0.08)")} 
                        strokeWidth={isBound ? 2 : 1}
                        strokeDasharray={isBound ? "8 6" : ""}
                    />
                    <text 
                        x={paddingX - 12} y={y + 6} 
                        className="font-bold fill-gray-500"
                        style={{ fontSize: isMobile ? '20px' : '15px' }}
                        textAnchor="end"
                    >
                        {v}
                    </text>
                </g>
            );
        })}

        <motion.path 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            d={areaPath} 
            fill="url(#chartGradient)" 
        />

        <motion.path 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            d={linePath} 
            stroke={isLight ? "#2563eb" : "url(#lineGradient)"} 
            strokeWidth={isMobile ? 7 : 5} 
            fill="none"
            strokeLinecap="round"
            filter={isLight ? "" : "url(#glow)"}
        />

        {chartData.map((d, i) => (
            <g key={i} onMouseEnter={() => !hideTooltips && setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <motion.circle 
                    cx={d.x} cy={d.y} 
                    initial={{ r: 0 }}
                    animate={{ r: (hoveredIndex === i && !hideTooltips) ? (isMobile ? 12 : 9) : (isMobile ? 8 : 5) }}
                    fill={(hoveredIndex === i && !hideTooltips) ? (isLight ? "#2563eb" : "#ffffff") : (isLight ? "#2563eb" : "#06b6d4")}
                    stroke={isLight ? "#ffffff" : "#0a111a"}
                    strokeWidth={isMobile ? 4 : 2}
                    className="cursor-pointer"
                />
                <AnimatePresence>
                  {hoveredIndex === i && !hideTooltips && (
                    <motion.foreignObject 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      x={d.x - 60} y={d.y - 90} width="120" height="80"
                    >
                        <div className="bg-medical-dark/95 backdrop-blur-xl border border-medical-cyan/50 rounded-[1.25rem] p-3 text-center shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                            <div className="text-2xl font-black text-white leading-none tracking-tighter">{d.value}</div>
                            <div className="text-[10px] font-black text-medical-cyan uppercase tracking-widest mt-1.5">{unit}</div>
                        </div>
                    </motion.foreignObject>
                  )}
                </AnimatePresence>
            </g>
        ))}
      </svg>
      
      {chartData.length > 0 && !isLight && (
         <motion.div 
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           className="absolute w-8 h-8 rounded-full bg-medical-cyan/30 animate-ping pointer-events-none"
           style={{ 
             left: `${(chartData[chartData.length-1].x / width) * 100}%`, 
             top: `${(chartData[chartData.length-1].y / height) * 100}%`,
             transform: 'translate(-50%, -50%)'
           }}
         />
      )}
    </div>
  );
}
