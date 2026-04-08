// src/components/PDFDownloadBtnAdvanced.tsx
"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Loader2, FileDown } from "lucide-react";
import { ReportPDFAdvanced } from "@/components/ReportPDFAdvanced";

interface PDFDownloadBtnAdvancedProps {
  userFullName?: string | null;
  userEmail?: string | null;
  readings: any[];
  unit?: "mg/dL" | "mmol/L" | "g/L";
  targetMin?: number;
  targetMax?: number;
  lang?: string;
  label: string;
  isAdvanced?: boolean;
}

export default function PDFDownloadBtnAdvanced({
  userFullName = "Patient",
  userEmail = "",
  readings,
  unit = "g/L",
  targetMin = 0.7,
  targetMax = 1.8,
  lang = "en",
  label,
  isAdvanced = true,
}: PDFDownloadBtnAdvancedProps) {
  return (
    <div className="flex-1 lg:flex-none group">
      <PDFDownloadLink
        document={
          <ReportPDFAdvanced
            patientName={userFullName || "Patient"}
            patientEmail={userEmail || "N/A"}
            generatedDate={new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
            readings={readings}
            unit={unit}
            targetMin={targetMin}
            targetMax={targetMax}
            locale={lang}
          />
        }
        fileName={`GlucoTrack_Advanced_Report_${new Date().toISOString().split("T")[0]}.pdf`}
        className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-medical-dark to-medical-cyan/20 border border-medical-cyan/30 text-white font-black shadow-[0_10px_30px_rgba(6,182,212,0.15)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.4)] hover:bg-medical-cyan/30 transition-all no-underline"
      >
        {({ loading, error, url }: any) => {
          if (loading) {
            return (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">{label}</span>
              </>
            );
          }

          if (error) {
            return <span className="text-sm text-red-400">Error rendering PDF</span>;
          }

          return (
            <>
              <FileDown className="w-5 h-5 text-medical-cyan group-hover:scale-110 transition-transform" />
              <span className="text-sm">{label}</span>
            </>
          );
        }}
      </PDFDownloadLink>
    </div>
  );
}
