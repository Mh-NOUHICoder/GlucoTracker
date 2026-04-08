// src/components/ReportAdvancedPage.tsx
"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

interface Reading {
  id: string;
  value: number | string;
  created_at: string;
}

interface ReportAdvancedPageProps {
  userEmail?: string;
  userName?: string;
  readings: Reading[];
  unit?: "mg/dL" | "mmol/L" | "g/L";
  targetMin?: number;
  targetMax?: number;
}

// Helper: Format values based on unit
const formatValue = (val: number, unit?: string) => {
  if (unit === "mmol/L") return Number((val / 18.0182).toFixed(1));
  if (unit === "g/L") return Number((val / 100).toFixed(2));
  return val;
};

// Helper: Get status and color
const getStatusColor = (value: number, min: number, max: number) => {
  if (value < min) return { label: "LOW", color: "#f59e0b", bgColor: "#fef3c7" };
  if (value > max) return { label: "HIGH", color: "#ef4444", bgColor: "#fee2e2" };
  return { label: "OPTIMAL", color: "#10b981", bgColor: "#d1fae5" };
};

export default function ReportAdvancedPage({
  userEmail,
  userName,
  readings,
  unit = "g/L",
  targetMin = 0.7,
  targetMax = 1.8,
}: ReportAdvancedPageProps) {
  const { t, lang, dir } = useI18n();
  const isRTL = dir === "rtl";

  const values = readings.map((r) => formatValue(Number(r.value), unit));
  const avg = values.length
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100
    : 0;

  // A1C estimation
  const rawValues = readings.map((r) => Number(r.value));
  const rawAvg = rawValues.length ? rawValues.reduce((a, b) => a + b, 0) / rawValues.length : 0;
  const a1c = rawValues.length ? ((rawAvg + 46.7) / 28.7).toFixed(1) : "--";

  const displayTargetMin = formatValue(targetMin, unit);
  const displayTargetMax = formatValue(targetMax, unit);

  const inRangeCount = values.filter((v) => v >= displayTargetMin && v <= displayTargetMax).length;
  const timeInRangePct = values.length ? Math.round((inRangeCount / values.length) * 100) : 0;
  const lowEvents = values.filter((v) => v < displayTargetMin).length;
  const highEvents = values.filter((v) => v > displayTargetMax).length;

  const generatedDate = new Date().toLocaleDateString(
    lang === "ar" ? "ar-EG" : lang === "fr" ? "fr-FR" : "en-US"
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(
      lang === "ar" ? "ar-EG" : lang === "fr" ? "fr-FR" : "en-US"
    );
  };

  return (
    <div
      id="report-advanced"
      dir={dir}
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "22mm",
        backgroundColor: "#0a0e27",
        color: "#f0f4f8",
        fontFamily: lang === "ar" ? "Arial, sans-serif" : "'Inter', system-ui, sans-serif",
        lineHeight: "1.6",
        textAlign: isRTL ? "right" : "left",
      }}
    >
      {/* Hero Section */}
      <div
        style={{
          background: "#1a1f3a",
          borderRadius: "20px",
          padding: "24px",
          marginBottom: "28px",
          border: "1px solid #2d3b5f",
          display: isRTL ? "flex-reverse" : "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "#22d3ee",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "12px",
              fontWeight: "bold",
            }}
          >
            {t("medical_report")}
          </div>
          <h1
            style={{
              margin: "0 0 12px 0",
              fontSize: "32px",
              fontWeight: "800",
              color: "#f0f4f8",
            }}
          >
            GlucoTrack AI
          </h1>
          <p
            style={{
              margin: "0",
              fontSize: "13px",
              color: "#a0aec0",
              maxWidth: "500px",
              lineHeight: "1.6",
            }}
          >
            Advanced glucose monitoring and metabolic trend analysis for personalized health
            optimization.
          </p>
        </div>
        <div
          style={{
            minWidth: "160px",
            padding: "16px",
            backgroundColor: "#151b34",
            borderRadius: "16px",
            border: "1px solid #2d3b5f",
            textAlign: isRTL ? "left" : "right",
          }}
        >
          <div style={{ fontSize: "12px", color: "#22d3ee", fontWeight: "bold" }}>
            {generatedDate}
          </div>
          <div style={{ fontSize: "11px", color: "#a0aec0", marginTop: "8px" }}>
            {t("patient_name")}: {userName || "N/A"}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: t("recent_average"), value: avg.toFixed(2), unit },
          { label: "Est. A1C", value: a1c, unit: "%" },
          { label: "Time in Range", value: timeInRangePct, unit: "%" },
          { label: "Low Events", value: lowEvents, unit: "Events" },
        ].map((metric, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "#151b34",
              border: "1px solid #2d3b5f",
              borderRadius: "16px",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "9px", color: "#a0aec0", marginBottom: "10px" }}>
              {metric.label}
            </div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#22d3ee" }}>
              {metric.value}
              <span style={{ fontSize: "11px", color: "#7c8ba3", marginLeft: "4px" }}>
                {metric.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Patient & Status Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ backgroundColor: "#151b34", border: "1px solid #2d3b5f", borderRadius: "16px", padding: "18px" }}>
          <div style={{ fontSize: "10px", color: "#a0aec0", marginBottom: "8px" }}>
            {t("patient_account")}
          </div>
          <div style={{ fontSize: "13px", color: "#f0f4f8", fontWeight: "600" }}>
            {userEmail || "N/A"}
          </div>
          <div style={{ fontSize: "10px", color: "#a0aec0", marginTop: "12px", marginBottom: "4px" }}>
            {t("patient_name")}
          </div>
          <div style={{ fontSize: "13px", color: "#f0f4f8", fontWeight: "600" }}>
            {userName || "N/A"}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "#151b34",
            border: "1px solid #2d3b5f",
            borderRadius: "16px",
            padding: "18px",
          }}
        >
          <div style={{ fontSize: "10px", color: "#a0aec0", marginBottom: "8px" }}>
            {t("range_status")}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ padding: "6px 12px", borderRadius: "999px", background: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7", fontSize: "10px", fontWeight: "bold" }}>
              {inRangeCount} {t("in_range")}
            </span>
            <span style={{ padding: "6px 12px", borderRadius: "999px", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", fontSize: "10px", fontWeight: "bold" }}>
              {highEvents} {t("high")}
            </span>
            <span style={{ padding: "6px 12px", borderRadius: "999px", background: "rgba(245, 158, 11, 0.2)", color: "#fcd34d", fontSize: "10px", fontWeight: "bold" }}>
              {lowEvents} {t("low")}
            </span>
          </div>
        </div>
      </div>

      {/* Time in Range Distribution Chart (Text-based) */}
      <div style={{ backgroundColor: "#1a1f3a", border: "1px solid #2d3b5f", borderRadius: "20px", padding: "22px", marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", color: "#f0f4f8", fontWeight: "bold", marginBottom: "18px" }}>
          GLUCOSE CONTROL DISTRIBUTION
        </div>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, #10b981 0deg, #10b981 " + timeInRangePct * 3.6 + "deg, #2d3b5f " + timeInRangePct * 3.6 + "deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#22d3ee" }}>
                {timeInRangePct}%
              </div>
            </div>
            <div style={{ fontSize: "9px", color: "#a0aec0", fontWeight: "bold" }}>
              {t("in_range").toUpperCase()}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>
              {inRangeCount}
            </div>
            <div style={{ fontSize: "9px", color: "#a0aec0", marginTop: "6px" }}>
              {t("readings_captured")}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}>
              {highEvents}
            </div>
            <div style={{ fontSize: "9px", color: "#a0aec0", marginTop: "6px" }}>
              {t("high")} {t("readings_captured")}
            </div>
          </div>
        </div>
      </div>

      {/* Reading History Table */}
      <div style={{ backgroundColor: "#151b34", border: "1px solid #2d3b5f", borderRadius: "16px", overflow: "hidden", marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            backgroundColor: "#1a1f3a",
            paddingTop: "14px",
            paddingBottom: "14px",
            paddingLeft: "16px",
            paddingRight: "16px",
            borderBottom: "1px solid #2d3b5f",
            gap: "16px",
            justifyContent: isRTL ? "flex-end" : "flex-start",
          }}
        >
          <span style={{ flex: 2, fontSize: "9px", color: "#22d3ee", fontWeight: "bold" }}>
            {t("date_time")}
          </span>
          <span style={{ flex: 1, fontSize: "9px", color: "#22d3ee", fontWeight: "bold", textAlign: "right" }}>
            {t("add_reading")}
          </span>
          <span style={{ flex: 1, fontSize: "9px", color: "#22d3ee", fontWeight: "bold", textAlign: "center" }}>
            {t("range_status")}
          </span>
        </div>
        {readings.slice(0, 15).map((reading, idx) => {
          const val = formatValue(Number(reading.value), unit);
          const status = getStatusColor(val, displayTargetMin, displayTargetMax);
          return (
            <div
              key={reading.id}
              style={{
                display: "flex",
                backgroundColor: idx % 2 === 0 ? "#111827" : "#0d1023",
                paddingTop: "14px",
                paddingBottom: "14px",
                paddingLeft: "16px",
                paddingRight: "16px",
                borderBottom: "1px solid #2d3b5f",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <span style={{ flex: 2, fontSize: "10px", color: "#a0aec0" }}>
                {formatDate(reading.created_at)}
              </span>
              <span style={{ flex: 1, fontSize: "10px", color: "#f0f4f8", fontWeight: "600", textAlign: "right" }}>
                {val}
              </span>
              <div style={{ flex: 1, textAlign: "center" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    backgroundColor: status.bgColor,
                    color: status.color,
                    fontSize: "9px",
                    fontWeight: "bold",
                  }}
                >
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #2d3b5f" }}>
        <div style={{ fontSize: "8px", color: "#a0aec0", marginBottom: "16px", lineHeight: "1.6" }}>
          <strong>{t("medical_disclaimer")}:</strong> This report is generated by GlucoTrack AI for informational purposes only. It should not be used as a substitute for professional medical advice. Always consult with your healthcare provider before making any medical decisions.
        </div>
      </div>
    </div>
  );
}
