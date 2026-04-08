"use client";

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ReportPDF } from "@/components/ReportPDF";

type Reading = {
  id: string;
  value: number;
  created_at: string;
};

interface ReportDownloadClientProps {
  patientName: string;
  patientEmail: string;
  generatedDate: string;
  readings: Reading[];
  unit?: "mg/dL" | "mmol/L" | "g/L";
  targetMin: number;
  targetMax: number;
  locale: string;
}

export default function ReportDownloadClient({
  patientName,
  patientEmail,
  generatedDate,
  readings,
  unit,
  targetMin,
  targetMax,
  locale,
}: ReportDownloadClientProps) {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Download Glucose Report</h1>
      <PDFDownloadLink
        document={
          <ReportPDF
            patientName={patientName}
            patientEmail={patientEmail}
            generatedDate={generatedDate}
            readings={readings}
            unit={unit}
            targetMin={targetMin}
            targetMax={targetMax}
            locale={locale}
          />
        }
        fileName="glucose_report.pdf"
        style={{
          textDecoration: "none",
          padding: "10px 20px",
          color: "#fff",
          backgroundColor: "#10b981",
          borderRadius: "4px",
        }}
      >
        {({ loading }) => (loading ? "Preparing document..." : "Download PDF")}
      </PDFDownloadLink>
    </div>
  );
}
