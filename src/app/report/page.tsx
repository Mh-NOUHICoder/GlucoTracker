"use client";
// Next.js page that provides a download link for the PDF report.

import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ReportPDF } from "@/components/ReportPDF";

// Mock data – in a real app this would come from server or context.
const mockReadings = [
  { id: "1", value: 120, created_at: "2024-01-01T08:00:00Z" },
  { id: "2", value: 95, created_at: "2024-01-02T08:00:00Z" },
  { id: "3", value: 150, created_at: "2024-01-03T08:00:00Z" },
  // ...more readings
];

export default function ReportPage() {
  const patientName = "Mohammed NOUHI";
  const patientEmail = "mohammed.nouhi@example.com";
  const generatedDate = new Date().toLocaleDateString();

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Download Glucose Report</h1>
      <PDFDownloadLink
        document={
          <ReportPDF
            patientName={patientName}
            patientEmail={patientEmail}
            generatedDate={generatedDate}
            readings={mockReadings}
            unit="mg/dL"
            targetMin={70}
            targetMax={180}
            locale="en"
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
