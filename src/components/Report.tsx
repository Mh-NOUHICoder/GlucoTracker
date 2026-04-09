"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

interface Reading {
  id: string;
  value: number | string;
  created_at: string;
}

interface ReportProps {
  userEmail?: string;
  userName?: string;
  readings: Reading[];
  unit?: string;
  targetMin?: number;
  targetMax?: number;
}

export default function Report({ userEmail, userName, readings, unit, targetMin, targetMax }: ReportProps) {
  const { t, lang, dir } = useI18n();
  const isRTL = dir === "rtl";

  const formatValue = (val: number) => {
     if (unit === "mmol/L") return Number((val / 18.0182).toFixed(1));
     if (unit === "g/L") return Number((val / 100).toFixed(2));
     return val;
  };

  const values = readings.map((r) => formatValue(Number(r.value)));
  const avg = values.length
    ? (unit === "mg/dL" ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : (values.reduce((a, b) => a + b, 0) / values.length).toFixed(unit === "g/L" ? 2 : 1))
    : 0;

  const displayTargetMin = formatValue(targetMin || 70);
  const displayTargetMax = formatValue(targetMax || 180);

  const getStatus = (avgValue: number) => {
    if (avgValue === 0) return t("status_no_data");
    const numericAvg = Number(avgValue);
    if (numericAvg < displayTargetMin) return t("status_low");
    if (numericAvg > displayTargetMax) return t("status_high");
    return t("status_normal");
  };

  const status = getStatus(Number(avg));
  const statusColor = (Number(avg) > 0 && Number(avg) < displayTargetMin) || Number(avg) > displayTargetMax ? "#dc2626" : "#059669";

  // Locale-aware date formatting
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(lang === "ar" ? "ar-EG" : lang === "fr" ? "fr-FR" : "en-US");
  };

  const generatedDate = new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : lang === "fr" ? "fr-FR" : "en-US");

  return (
    <div
      id="report"
      dir={dir}
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "22mm",
        backgroundColor: "#f5f7fb",
        color: "#0f172a",
        fontFamily: lang === "ar" ? "Arial, sans-serif" : "Inter, system-ui, sans-serif",
        lineHeight: "1.6",
        textAlign: isRTL ? "right" : "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "28px", alignItems: "flex-end" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "100%", background: "linear-gradient(135deg, #0ea5e9, #22d3ee)" }} />
            <span style={{ textTransform: "uppercase", letterSpacing: "1px", fontSize: "11px", color: "#475569", fontWeight: "700" }}>
              {t("medical_report")}
            </span>
          </div>
          <h1 style={{ margin: "0", fontSize: "32px", fontWeight: "800", color: "#0f172a" }}>
            {t("report_title")}
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "14px", color: "#64748b", maxWidth: "640px" }}>
            A modern glucose summary built for quick clinical review and trend insight.
          </p>
        </div>
        <div style={{ minWidth: "160px", padding: "18px 20px", borderRadius: "24px", background: "#0f172a", color: "#ffffff", textAlign: "right", boxShadow: "0 20px 50px rgba(15,23,42,0.12)" }}>
          <div style={{ fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85 }}>
            DiabLab
          </div>
          <div style={{ marginTop: "10px", fontSize: "20px", fontWeight: "800" }}>
            {generatedDate}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ borderRadius: "24px", background: "#ffffff", boxShadow: "0 16px 35px rgba(15,23,42,0.08)", padding: "22px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "10px" }}>
            {t("recent_average")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a" }}>{avg}</div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>{unit || "mg/dL"}</div>
          </div>
        </div>
        <div style={{ borderRadius: "24px", background: "#ffffff", boxShadow: "0 16px 35px rgba(15,23,42,0.08)", padding: "22px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "10px" }}>
            {t("clinical_status")}
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: statusColor }}>{status}</div>
        </div>
        <div style={{ borderRadius: "24px", background: "#ffffff", boxShadow: "0 16px 35px rgba(15,23,42,0.08)", padding: "22px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "10px" }}>
            {t("readings_captured")}
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>{readings.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "32px" }}>
        <div style={{ flex: "1 1 260px", borderRadius: "24px", background: "#ffffff", padding: "22px", boxShadow: "0 16px 35px rgba(15,23,42,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b" }}>{t("patient_account")}</div>
              <div style={{ marginTop: "10px", fontSize: "14px", color: "#0f172a", fontWeight: "700" }}>{userEmail || "N/A"}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "8px" }}>{t("patient_name")}</div>
            <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: "700" }}>{userName || "N/A"}</div>
          </div>
        </div>
        <div style={{ flex: "1 1 260px", borderRadius: "24px", background: "#ffffff", padding: "22px", boxShadow: "0 16px 35px rgba(15,23,42,0.08)" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "8px" }}>{t("generated_on")}</div>
          <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: "700" }}>{generatedDate}</div>
          <div style={{ marginTop: "18px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b", marginBottom: "8px" }}>{t("range_status")}</div>
          <div style={{ fontSize: "14px", color: statusColor, fontWeight: "700" }}>{status}</div>
        </div>
      </div>

      {readings.length > 0 && (
        <div style={{ borderRadius: "28px", background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", padding: "32px", boxShadow: "0 20px 55px rgba(15,23,42,0.08)", marginBottom: "36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: "0", fontSize: "22px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>{t("chart_day_view")}</h3>
              <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#64748b", fontWeight: "500" }}>Glucose trend with clinical reference bands</p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ padding: "10px 14px", borderRadius: "999px", background: "#ecfdf5", color: "#065f46", fontSize: "12px", fontWeight: "700", boxShadow: "0 2px 8px rgba(16,185,129,0.12)" }}>Target: {displayTargetMin}-{displayTargetMax} {unit || "mg/dL"}</span>
              <span style={{ padding: "10px 14px", borderRadius: "999px", background: "#f0f9ff", color: "#0c4a6e", fontSize: "12px", fontWeight: "700", boxShadow: "0 2px 8px rgba(6,182,212,0.12)" }}>Readings: {readings.length}</span>
            </div>
          </div>
          <div style={{ width: "100%", minHeight: "280px", borderRadius: "20px", overflow: "hidden", background: "linear-gradient(135deg, #0f172a 0%, #1a202c 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <svg width="100%" height="300" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="fill-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Background */}
              <rect x="0" y="0" width="1000" height="300" fill="rgba(15,23,42,0.5)" />
              {/* Grid Lines */}
              <line x1="0" y1="60" x2="1000" y2="60" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
              <line x1="0" y1="120" x2="1000" y2="120" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
              <line x1="0" y1="180" x2="1000" y2="180" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
              <line x1="0" y1="240" x2="1000" y2="240" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
              {/* Target Zone */}
              {(() => {
                const recent = [...readings].reverse().slice(0, 30);
                if (recent.length < 1) return null;
                const minVal = formatValue(30);
                const maxVal = formatValue(350);
                const range = maxVal - minVal;
                const targetMinY = 260 - ((displayTargetMin - minVal) / range) * 240;
                const targetMaxY = 260 - ((displayTargetMax - minVal) / range) * 240;
                return (
                  <rect x="0" y={targetMaxY} width="1000" height={targetMinY - targetMaxY} fill="#10b981" fillOpacity="0.12" />
                );
              })()}
              {/* Data Processing */}
              {(() => {
                const recent = [...readings].reverse().slice(0, 30);
                if (recent.length < 2) return null;
                const minVal = formatValue(30);
                const maxVal = formatValue(350);
                const range = maxVal - minVal;
                
                // Build points for the line
                const points = recent.map((r, i) => {
                  const val = formatValue(Number(r.value));
                  const x = (i / (recent.length - 1)) * 1000;
                  const clamped = Math.max(minVal, Math.min(val, maxVal));
                  const y = 260 - ((clamped - minVal) / range) * 240;
                  return { x, y, val };
                });
                
                const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                
                return (
                  <>
                    {/* Filled Area */}
                    <path d={pathD + ` L 1000 260 L 0 260 Z`} fill="url(#fill-gradient)" />
                    {/* Line */}
                    <path d={pathD} fill="none" stroke="url(#line-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Data Points */}
                    {points.map((p, i) => {
                      const color = p.val < displayTargetMin ? "#ef4444" : p.val > displayTargetMax ? "#f97316" : "#10b981";
                      return <circle key={i} cx={p.x} cy={p.y} r="5" fill={color} stroke="#0f172a" strokeWidth="2" opacity="0.9" />;
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      <div style={{ borderRadius: "28px", background: "#ffffff", padding: "36px", boxShadow: "0 20px 55px rgba(15,23,42,0.08)", marginBottom: "36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <div>
            <h3 style={{ margin: "0", fontSize: "22px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>{t("reading_history")}</h3>
            <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b", fontWeight: "500" }}>Most recent glucose measurements</p>
          </div>
          <span style={{ padding: "10px 16px", borderRadius: "999px", background: "#f0f9ff", color: "#0c4a6e", fontSize: "13px", fontWeight: "700", boxShadow: "0 2px 8px rgba(6,182,212,0.12)" }}>
            {readings.length} {t("readings_captured")}
          </span>
        </div>
        {readings.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", direction: isRTL ? "rtl" : "ltr" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "16px", textAlign: isRTL ? "right" : "left", color: "#475569", fontSize: "13px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase" }}>{t("date_time")}</th>
                  <th style={{ padding: "16px", textAlign: isRTL ? "left" : "right", color: "#475569", fontSize: "13px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase" }}>{t("add_reading")}</th>
                  <th style={{ padding: "16px", textAlign: "center", color: "#475569", fontSize: "13px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase" }}>{t("range_status")}</th>
                </tr>
              </thead>
              <tbody>
                {readings.slice(0, 15).map((reading) => {
                  const val = formatValue(Number(reading.value));
                  const rStatus = val < displayTargetMin ? t("low") : val > displayTargetMax ? t("high") : t("in_range");
                  const statusColor = val < displayTargetMin ? "#ef4444" : val > displayTargetMax ? "#f97316" : "#10b981";
                  const statusBg = val < displayTargetMin ? "#fef2f2" : val > displayTargetMax ? "#fef3c7" : "#f0fdf4";
                  return (
                    <tr key={reading.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s" }}>
                      <td style={{ padding: "16px", color: "#1e293b", fontWeight: "500" }}>{formatDate(reading.created_at)}</td>
                      <td style={{ padding: "16px", textAlign: isRTL ? "left" : "right", fontWeight: "700", color: "#0f172a", fontSize: "15px" }}>{val} <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>{unit || "mg/dL"}</span></td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "92px", padding: "8px 12px", borderRadius: "999px", background: statusBg, color: statusColor, fontWeight: "700", fontSize: "12px", boxShadow: `0 2px 6px rgba(${statusColor.includes("#10b981") ? "16, 185, 129" : statusColor.includes("#ef4444") ? "239, 68, 68" : "249, 115, 22"}, 0.12)` }}>
                        {rStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "48px", textAlign: "center", borderRadius: "20px", background: "#f8fafc", color: "#94a3b8" }}>
            <div style={{ fontSize: "16px", fontWeight: "600" }}>{t("no_history")}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "40px", padding: "32px", borderRadius: "28px", background: "linear-gradient(135deg, #0f172a 0%, #1a202c 100%)", color: "#cbd5e1", fontSize: "13px", lineHeight: "1.8", textAlign: isRTL ? "right" : "left", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontWeight: "700", marginBottom: "14px", color: "#f0f4f8", fontSize: "14px" }}>✓ {t("doctor_notes")}:</div>
        <div style={{ height: "100px", padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "16px", border: "1px dashed rgba(148,163,184,0.3)", marginBottom: "20px", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          _____________________________________________________________________
        </div>
        <div style={{ marginTop: "24px", padding: "20px", borderRadius: "16px", background: "rgba(251, 146, 60, 0.1)", borderLeft: "4px solid #f97316", color: "#fed7aa" }}>
          <div style={{ fontWeight: "700", marginBottom: "8px", fontSize: "13px", color: "#fdba74" }}>⚠️ Medical Disclaimer</div>
          <div style={{ fontSize: "12px", lineHeight: "1.6", color: "#fed7aa" }}>
            This report is generated by GlucoTrack AI for informational purposes only. Always consult with a qualified healthcare professional before making medical decisions or adjusting medications. GlucoTrack AI is not a replacement for medical advice.
          </div>
        </div>
      </div>
    </div>
  );
}
