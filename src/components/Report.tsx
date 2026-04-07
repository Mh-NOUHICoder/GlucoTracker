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

export default function Report({ userEmail, userName, readings }: ReportProps) {
  const { t, lang, dir } = useI18n();
  const isRTL = dir === "rtl";

  const values = readings.map((r) => Number(r.value));
  const avg = values.length
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;

  const getStatus = (avgValue: number) => {
    if (avgValue === 0) return t("status_no_data");
    if (avgValue < 70) return t("status_low");
    if (avgValue > 180) return t("status_high");
    return t("status_normal");
  };

  const status = getStatus(avg);
  const statusColor = (avg > 0 && avg < 70) || avg > 180 ? "#dc2626" : "#059669";

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
        padding: "20mm",
        backgroundColor: "#ffffff",
        color: "#000000",
        fontFamily: lang === "ar" ? "Arial, sans-serif" : "inherit",
        lineHeight: "1.5",
        textAlign: isRTL ? "right" : "left",
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: "2px solid #000000", paddingBottom: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: "0", fontSize: "28px", fontWeight: "bold", color: "#000000" }}>
            {t("GlucoTrack AI Report")} 
          </h1>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#666666" }}>
            {t("medical_report")}
          </p>
        </div>
        <div style={{ textAlign: isRTL ? "left" : "right" }}>
           <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0ea5e9" }}>DiabLab</div>
        </div>
      </div>

      {/* Info Section */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", flexDirection: isRTL ? "row-reverse" : "row" }}>
        <div style={{ textAlign: isRTL ? "right" : "left" }}>
          <p style={{ margin: "2px 0", fontSize: "14px" }}>
            <strong>{t("patient_account")}:</strong> {userEmail || "N/A"}
          </p>
          <p style={{ margin: "2px 0", fontSize: "14px" }}>
            <strong>{t("patient_name")}:</strong> {userName || "N/A"}
          </p>
        </div>
        <div style={{ textAlign: isRTL ? "left" : "right" }}>
          <p style={{ margin: "2px 0", fontSize: "14px" }}>
            <strong>{t("generated_on")}:</strong> {generatedDate}
          </p>
          <p style={{ margin: "2px 0", fontSize: "14px" }}>
            <strong>{t("readings_captured")}:</strong> {readings.length}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "40px", flexDirection: isRTL ? "row-reverse" : "row" }}>
        <div style={{ flex: 1, padding: "15px", border: "1px solid #000000", textAlign: "center" }}>
          <p style={{ margin: "0", fontSize: "12px", textTransform: "uppercase", fontWeight: "bold", color: "#666666" }}>
            {t("recent_average")}
          </p>
          <h2 style={{ margin: "10px 0 0 0", fontSize: "32px", fontWeight: "black" }}>
            {avg} <span style={{ fontSize: "14px", fontWeight: "normal" }}>mg/dL</span>
          </h2>
        </div>
        <div style={{ flex: 1, padding: "15px", border: "1px solid #000000", textAlign: "center" }}>
          <p style={{ margin: "0", fontSize: "12px", textTransform: "uppercase", fontWeight: "bold", color: "#666666" }}>
            {t("clinical_status")}
          </p>
          <h2 style={{ margin: "10px 0 0 0", fontSize: "32px", fontWeight: "black", color: statusColor }}>
            {status}
          </h2>
        </div>
      </div>

      {/* Table Section */}
      <h3 style={{ fontSize: "18px", borderBottom: "1px solid #cccccc", paddingBottom: "5px", marginBottom: "15px", textAlign: isRTL ? "right" : "left" }}>
        {t("reading_history")}
      </h3>
      {readings.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", direction: isRTL ? "rtl" : "ltr" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={{ border: "1px solid #dddddd", textAlign: isRTL ? "right" : "left", padding: "12px" }}>{t("date_time")}</th>
              <th style={{ border: "1px solid #dddddd", textAlign: isRTL ? "left" : "right", padding: "12px" }}>{t("add_reading")} (mg/dL)</th>
              <th style={{ border: "1px solid #dddddd", textAlign: "center", padding: "12px" }}>{t("range_status")}</th>
            </tr>
          </thead>
          <tbody>
            {readings.slice(0, 25).map((reading, index) => {
              const val = Number(reading.value);
              const rStatus = val < 70 ? t("low") : val > 180 ? t("high") : t("in_range");
              const rColor = val < 70 || val > 180 ? "#dc2626" : "#059669";
              return (
                <tr key={reading.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                  <td style={{ border: "1px solid #dddddd", padding: "10px" }}>
                    {formatDate(reading.created_at)}
                  </td>
                  <td style={{ border: "1px solid #dddddd", padding: "10px", textAlign: isRTL ? "left" : "right", fontWeight: "bold" }}>
                    {reading.value}
                  </td>
                  <td style={{ border: "1px solid #dddddd", padding: "10px", textAlign: "center" }}>
                    <span style={{ 
                      color: rColor,
                      fontSize: "11px",
                      fontWeight: "bold"
                    }}>
                      {rStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: "40px", textAlign: "center", border: "1px dashed #cccccc", color: "#666666" }}>
          {t("no_history")}
        </div>
      )}

      {/* Footer / Notes */}
      <div style={{ marginTop: "50px", paddingTop: "20px", borderTop: "1px solid #000000", textAlign: isRTL ? "right" : "left" }}>
        <p style={{ fontSize: "12px", color: "#666666", fontStyle: "italic" }}>
          <strong>{t("doctor_notes")}:</strong> _________________________________________________________________________________________________
        </p>
        <p style={{ fontSize: "10px", color: "#999999", marginTop: "40px", textAlign: "center" }}>
          {t("medical_disclaimer")}
        </p>
      </div>
    </div>
  );
}
