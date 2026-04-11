// src/components/ReportPDF.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Line,
  Rect,
  Path,
  Circle,
  Image,
  Font,
} from "@react-pdf/renderer";

// Register fonts for internationalization
// Using Cairo for Arabic and Inter for Latin (via CDN)
Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter/static/Inter_28pt-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter/static/Inter_28pt-Bold.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "Cairo",
  fonts: [
    { src: "/fonts/Cairo/static/Cairo-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Cairo/static/Cairo-Bold.ttf", fontWeight: 700 },
  ],
});

// Premium dark theme tokens
const theme = {
  bg: "#0B1120",
  cardBg: "#1E293B",
  cardBgLight: "#334155",
  border: "#334155",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  accent: "#06B6D4",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#F43F5E",
};

const getDynamicStyles = (isRtl: boolean, lang: string) => StyleSheet.create({
  page: {
    backgroundColor: theme.bg,
    color: theme.text,
    padding: 36,
    fontFamily: lang === "ar" ? "Cairo" : "Inter",
    direction: isRtl ? "rtl" : "ltr",
  },
  hero: {
    flexDirection: isRtl ? "row-reverse" : "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: theme.cardBgLight,
    borderRadius: 18,
    padding: 22,
    marginBottom: 28,
    border: `1px solid ${theme.border}`,
  },
  heroText: {
    flex: 1,
    textAlign: isRtl ? "right" : "left",
  },
  title: {
    fontSize: 26,
    color: theme.accent,
    marginBottom: 6,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 9,
    color: theme.textMuted,
    letterSpacing: isRtl ? 0 : 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  heroTag: {
    alignSelf: isRtl ? "flex-end" : "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    color: theme.accent,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
    marginBottom: 8,
  },
  heroStats: {
    flexDirection: isRtl ? "row-reverse" : "row",
    gap: 12,
    marginTop: 18,
    flexWrap: "wrap",
  },
  heroStatCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    border: `1px solid ${theme.border}`,
    minWidth: 120,
    minHeight: 82,
    justifyContent: "center",
  },
  heroStatLabel: {
    fontSize: 8,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: isRtl ? "right" : "left",
  },
  heroStatValue: {
    fontSize: 22,
    color: theme.text,
    fontWeight: "bold",
    textAlign: isRtl ? "right" : "left",
  },
  heroAccentCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    border: `1px solid ${theme.border}`,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    flexDirection: isRtl ? "row-reverse" : "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    border: `1px solid rgba(255,255,255,0.08)`,
  },
  logoImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  logoText: {
    fontSize: 9,
    color: theme.accent,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  patientSection: {
    flexDirection: isRtl ? "row-reverse" : "row",
    justifyContent: "space-between",
    backgroundColor: theme.cardBg,
    padding: 22,
    borderRadius: 18,
    marginBottom: 24,
    border: `1px solid ${theme.border}`,
  },
  patientInfoCol: {
    flexDirection: "column",
    gap: 8,
    textAlign: isRtl ? "right" : "left",
  },
  label: {
    fontSize: 8,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    color: theme.text,
    fontWeight: "500",
  },
  metricsGrid: {
    flexDirection: isRtl ? "row-reverse" : "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.cardBgLight,
    padding: 18,
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    textAlign: isRtl ? "right" : "left",
  },
  metricCardSuccess: { borderTop: `4px solid ${theme.success}` },
  metricCardDanger: { borderTop: `4px solid ${theme.danger}` },
  metricCardPurple: { borderTop: "4px solid #A855F7" },
  metricLabel: {
    fontSize: 9,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricValueLg: {
    fontSize: 22,
    color: theme.text,
    fontWeight: "700",
    marginTop: 10,
  },
  metricUnit: {
    fontSize: 8,
    color: theme.textMuted,
  },
  chartContainer: {
    marginBottom: 25,
    backgroundColor: theme.cardBg,
    padding: 22,
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    textAlign: isRtl ? "right" : "left",
  },
  chartHeader: {
    flexDirection: isRtl ? "row-reverse" : "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.text,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: theme.textMuted,
  },
  chartLegendRow: {
    flexDirection: isRtl ? "row-reverse" : "row",
    gap: 14,
  },
  legendItem: {
    flexDirection: isRtl ? "row-reverse" : "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chartWithYAxis: {
    flexDirection: isRtl ? "row-reverse" : "row",
    gap: 10,
    alignItems: "flex-start",
  },
  yAxisLabels: {
    width: 48,
    height: 160,
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 8,
  },
  yAxisLabelText: {
    fontSize: 8,
    color: theme.textMuted,
    textAlign: isRtl ? "left" : "right",
  },
  yAxisUnitText: {
    fontSize: 7,
    color: theme.textMuted,
    textAlign: isRtl ? "left" : "right",
    marginBottom: 4,
  },
  chartBox: {
    flex: 1,
    height: 160,
    borderRadius: 16,
    backgroundColor: theme.bg,
  },
  tableContainer: {
    backgroundColor: theme.cardBgLight,
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: isRtl ? "row-reverse" : "row",
    backgroundColor: theme.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    color: theme.text,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
    textAlign: isRtl ? "right" : "left",
  },
  tableRow: {
    flexDirection: isRtl ? "row-reverse" : "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTop: `1px solid ${theme.border}`,
    alignItems: "center",
    textAlign: isRtl ? "right" : "left",
  },
  tableCell: {
    fontSize: 9,
    color: theme.textMuted,
  },
  tableCellStrong: {
    fontSize: 9,
    color: theme.text,
    fontWeight: "bold",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 18,
    borderTop: `1px solid ${theme.border}`,
    flexDirection: "column",
    gap: 12,
    alignItems: isRtl ? "flex-end" : "flex-start",
    textAlign: isRtl ? "right" : "left",
  },
  footerText: {
    fontSize: 8,
    color: theme.textMuted,
    lineHeight: 1.4,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    fontSize: 7,
    textTransform: "uppercase",
  },
  badgeSuccess: { backgroundColor: "rgba(34, 197, 94, 0.12)", color: theme.success },
  badgeDanger: { backgroundColor: "rgba(251, 113, 133, 0.16)", color: theme.danger },
  badgeWarning: { backgroundColor: "rgba(245, 158, 11, 0.16)", color: theme.warning },
  dateHeader: {
    backgroundColor: "rgba(56, 189, 248, 0.05)",
    padding: 10,
    borderLeft: isRtl ? "none" : `3px solid ${theme.accent}`,
    borderRight: isRtl ? `3px solid ${theme.accent}` : "none",
    marginBottom: 10,
    textAlign: isRtl ? "right" : "left",
  },
});

const formatValue = (value: any, unit?: string) => {
  if (value === null || value === undefined || value === "") return "0";
  const cleanValue = typeof value === 'string' ? value.replace(/[^\d.,]/g, "").replace(",", ".") : value;
  const num = Number(cleanValue);
  if (isNaN(num)) return "0";
  if (!unit || unit === "mg/dL") return num.toFixed(0);
  if (unit === "mmol/L") return (num / 18.0182).toFixed(1);
  if (unit === "g/L") return (num / 100).toFixed(2);
  return num.toString();
};

const getTranslations = (lang: string) => {
  const dicts: any = {
    en: {
      clinical_insights: "Clinical Insights",
      medical_report: "GlucoTrack Medical Report",
      tagline: "Personalized glucose monitoring summary and trend analysis",
      readings: "Readings",
      target_range: "Target Range",
      issued_on: "Issued On",
      patient: "Patient",
      email: "Email",
      average: "Average",
      estimated_a1c: "Estimated A1c",
      time_in_range: "Time in Range",
      low_events: "Low Events",
      events: "Events",
      trend_analysis: "Metabolic Trend Analysis",
      trend_subtitle: "Complete reading history with clinical target bands",
      glucose_trend: "Glucose Trend",
      target_zone: "Target Zone",
      reading_history: "Patient Reading History",
      history_subtitle: "Detailed chronological log categorized by date",
      time: "Time",
      value: "Value",
      status: "Status",
      optimal: "Optimal",
      high: "High",
      low: "Low",
      disclaimer: "Medical Disclaimer: This report is generated by GlucoTrack AI for informational purposes only. Data represents patient readings and calculated metrics. Always consult with a healthcare professional before making medical decisions or adjusting medications.",
      generated_summary: "Generated on {date} | Patient: {name} | Total Readings: {n}",
    },
    fr: {
      clinical_insights: "Aperçu Clinique",
      medical_report: "Rapport Médical GlucoTrack",
      tagline: "Résumé personnalisé de la surveillance du glucose et analyse des tendances",
      readings: "Lectures",
      target_range: "Plage Cible",
      issued_on: "Généré le",
      patient: "Patient",
      email: "Email",
      average: "Moyenne",
      estimated_a1c: "Estimation A1c",
      time_in_range: "Temps dans la Plage",
      low_events: "Événements Bas",
      events: "Événements",
      trend_analysis: "Analyse des Tendances Métaboliques",
      trend_subtitle: "Historique complet avec bandes cibles cliniques",
      glucose_trend: "Tendance Glucose",
      target_zone: "Zone Cible",
      reading_history: "Historique des Lectures Patient",
      history_subtitle: "Journal chronologique détaillé catégorisé par date",
      time: "Heure",
      value: "Valeur",
      status: "Statut",
      optimal: "Normal",
      high: "Élevé",
      low: "Bas",
      disclaimer: "Avis Médical : Ce rapport est généré par l'IA GlucoTrack à des fins d'information uniquement. Les données représentent les lectures du patient et les mesures calculées. Consultez toujours un professionnel de la santé avant de prendre des décisions médicales.",
      generated_summary: "Généré le {date} | Patient : {name} | Lectures Totales : {n}",
    },
    ar: {
      clinical_insights: "رؤى سريرية",
      medical_report: "تقرير غلوكو تراك الطبي",
      tagline: "ملخص مخصص لمراقبة الجلوكوز وتحليل الاتجاهات",
      readings: "القراءات",
      target_range: "النطاق المستهدف",
      issued_on: "تاريخ الإصدار",
      patient: "المريض",
      email: "البريد الإلكتروني",
      average: "المتوسط",
      estimated_a1c: "تراكمي مقدر",
      time_in_range: "الوقت في النطاق",
      low_events: "حالات انخفاض",
      events: "حالات",
      trend_analysis: "تحليل اتجاهات التمثيل الغذائي",
      trend_subtitle: "سجل كامل للقراءات مع نطاقات الأهداف السريرية",
      glucose_trend: "اتجاه الجلوكوز",
      target_zone: "النطاق المستهدف",
      reading_history: "سجل قراءات المريض",
      history_subtitle: "سجل زمني مفصل مصنف حسب التاريخ",
      time: "الوقت",
      value: "القيمة",
      status: "الحالة",
      optimal: "طبيعي",
      high: "مرتفع",
      low: "منخفض",
      disclaimer: "إخلاء مسؤولية طبي: يتم إنشاء هذا التقرير بواسطة ذكاء غلوكو تراك للأغراض المعلوماتية فقط. تمثل البيانات قراءات المريض والمقاييس المحسوبة. استشر دائماً أخصائي الرعاية الصحية قبل اتخاذ قرارات طبية.",
      generated_summary: "{n} : تم الإنشاء في {date} | المريض: {name} | إجمالي القراءات",
    }
  };
  return dicts[lang] || dicts.en;
};

interface Reading { id: string; value: number | string; created_at: string }
interface ReportPDFProps {
  patientName: string;
  patientEmail?: string;
  generatedDate?: string;
  readings: Reading[];
  unit?: "mg/dL" | "mmol/L" | "g/L";
  targetMin?: number;
  targetMax?: number;
  locale?: string;
}

export const ReportPDF: React.FC<ReportPDFProps> = ({
  patientName,
  patientEmail = "N/A",
  generatedDate = new Date().toLocaleDateString(),
  readings = [],
  unit = "mg/dL",
  targetMin = 70,
  targetMax = 180,
  locale = "en",
}) => {
  const isRtl = locale === "ar";
  const styles = getDynamicStyles(isRtl, locale);
  const t = getTranslations(locale);

  const validReadings = readings
    .map(r => {
      const clean = typeof r.value === 'string' ? r.value.replace(/[^\d.,]/g, "").replace(",", ".") : r.value;
      const num = Number(clean);
      return { ...r, numericValue: isNaN(num) ? 0 : num };
    })
    .filter(r => r.numericValue > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const sortedForChart = [...validReadings].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const rawValues = validReadings.map(r => r.numericValue);
  const displayValues = validReadings.map((r) => Number(formatValue(r.numericValue, unit)));
  const rawAvg = rawValues.length ? rawValues.reduce((a, b) => a + b, 0) / rawValues.length : 0;
  const recentAvg = displayValues.length ? displayValues.reduce((a, b) => a + b, 0) / displayValues.length : 0;
  const a1c = rawValues.length ? ((rawAvg + 46.7) / 28.7).toFixed(1) : "--";
  const displayTargetMin = Number(formatValue(targetMin, unit));
  const displayTargetMax = Number(formatValue(targetMax, unit));
  const inRangeCount = displayValues.filter((v) => v >= displayTargetMin && v <= displayTargetMax).length;
  const timeInRangePct = displayValues.length ? Math.round((inRangeCount / displayValues.length) * 100) : 0;
  const hypoEvents = displayValues.filter(v => v < displayTargetMin).length;

  const chartHeight = 160;
  const chartWidth = 500;
  const dataMax = Math.max(...(displayValues.length ? displayValues : [displayTargetMax])) * 1.1;
  const dataMin = Math.min(...(displayValues.length ? displayValues : [displayTargetMin])) * 0.9;

  const getY = (val: number) => {
    const range = dataMax - dataMin || 1;
    const y = chartHeight - ((val - dataMin) / range) * chartHeight;
    return isNaN(y) ? chartHeight / 2 : y;
  };

  const pathD = sortedForChart.map((r, i, arr) => {
    const v = Number(formatValue(r.numericValue, unit));
    const x = arr.length > 1 ? (i / (arr.length - 1)) * chartWidth : chartWidth / 2;
    const y = getY(v);
    return `${i === 0 ? 'M' : 'L'} ${isNaN(x) ? 0 : x} ${isNaN(y) ? chartHeight : y}`;
  }).join(" ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.heroTag}>{t.clinical_insights}</Text>
            <Text style={styles.title}>{t.medical_report}</Text>
            <Text style={styles.subtitle}>{t.tagline}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>{t.readings}</Text>
                <Text style={styles.heroStatValue}>{validReadings.length}</Text>
              </View>
              <View style={[styles.heroStatCard, styles.heroAccentCard]}>
                <Text style={styles.heroStatLabel}>{t.target_range}</Text>
                <Text style={styles.heroStatValue}>{displayTargetMin} - {displayTargetMax}</Text>
                <Text style={styles.metricUnit}>{unit}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: isRtl ? "flex-start" : "flex-end" }}>
            <View style={styles.logoContainer}>
              <Image src="/glucotracker.png" style={styles.logoImage} />
              <Text style={styles.logoText}>GlucoTrack</Text>
            </View>
            <View style={[styles.heroAccentCard, { marginTop: 16, alignItems: isRtl ? "flex-end" : "flex-start" }]}> 
              <Text style={styles.heroStatLabel}>{t.issued_on}</Text>
              <Text style={styles.heroStatValue}>{generatedDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.patientSection}>
          <View style={styles.patientInfoCol}><Text style={styles.label}>{t.patient}</Text><Text style={styles.value}>{patientName}</Text></View>
          <View style={styles.patientInfoCol}><Text style={styles.label}>{t.email}</Text><Text style={styles.value}>{patientEmail}</Text></View>
          <View style={styles.patientInfoCol}><Text style={styles.label}>{t.issued_on}</Text><Text style={styles.value}>{generatedDate}</Text></View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}> 
            <Text style={styles.metricLabel}>{t.average}</Text>
            <Text style={styles.metricValueLg}>{recentAvg.toFixed(unit === "g/L" ? 2 : 1)} <Text style={styles.metricUnit}>{unit}</Text></Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardPurple]}>
            <Text style={styles.metricLabel}>{t.estimated_a1c}</Text>
            <Text style={styles.metricValueLg}>{a1c}<Text style={styles.metricUnit}>%</Text></Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardSuccess]}>
            <Text style={styles.metricLabel}>{t.time_in_range}</Text>
            <Text style={styles.metricValueLg}>{timeInRangePct}<Text style={styles.metricUnit}>%</Text></Text>
          </View>
          <View style={[styles.metricCard, hypoEvents > 0 ? styles.metricCardDanger : styles.metricCard]}> 
            <Text style={styles.metricLabel}>{t.low_events}</Text>
            <Text style={styles.metricValueLg}>{hypoEvents} <Text style={styles.metricUnit}>{t.events}</Text></Text>
          </View>
        </View>

        <View style={styles.chartContainer} wrap={false}>
          <View style={styles.chartHeader}>
            <View style={{ textAlign: isRtl ? "right" : "left" }}>
              <Text style={styles.sectionTitle}>{t.trend_analysis}</Text>
              <Text style={styles.sectionSubtitle}>{t.trend_subtitle}</Text>
            </View>
            <View style={styles.chartLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.accent }]} />
                <Text style={styles.tableCell}>{t.glucose_trend}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                <Text style={styles.tableCell}>{t.target_zone}</Text>
              </View>
            </View>
          </View>
          <View style={styles.chartWithYAxis}>
            <View style={styles.yAxisLabels}>
              <Text style={styles.yAxisUnitText}>{unit}</Text>
              {(() => {
                const range = dataMax - dataMin || 1;
                const step = range / 4;
                return [0, 1, 2, 3, 4].map((stepIndex) => {
                  const value = dataMin + step * (4 - stepIndex);
                  const formatted = unit === "g/L" ? value.toFixed(2) : unit === "mmol/L" ? value.toFixed(1) : Math.round(value).toString();
                  return <Text key={stepIndex} style={styles.yAxisLabelText}>{formatted}</Text>;
                });
              })()}
            </View>
            <Svg style={styles.chartBox} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              <Line x1={0} y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke={theme.border} strokeWidth={0.8} />
              <Line x1={0} y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke={theme.border} strokeWidth={0.8} />
              <Line x1={0} y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke={theme.border} strokeWidth={0.8} />
              {(() => {
                const yMin = getY(displayTargetMin);
                const yMax = getY(displayTargetMax);
                const top = Math.min(yMin, yMax);
                const h = Math.abs(yMin - yMax);
                return <Rect x={0} y={isNaN(top) ? 0 : top} width={chartWidth} height={isNaN(h) ? 0 : h} fill={theme.success} fillOpacity={0.15} />;
              })()}
              <Line x1={0} y1={getY(displayTargetMin)} x2={chartWidth} y2={getY(displayTargetMin)} stroke={theme.success} strokeWidth={1} strokeDasharray="5 3" />
              <Line x1={0} y1={getY(displayTargetMax)} x2={chartWidth} y2={getY(displayTargetMax)} stroke={theme.danger} strokeWidth={1} strokeDasharray="5 3" />
              {sortedForChart.length > 1 && pathD && <Path d={pathD} fill="none" stroke={theme.accent} strokeWidth={2.5} />}
              {sortedForChart.map((r, i, arr) => {
                const v = Number(formatValue(r.numericValue, unit));
                const x = arr.length > 1 ? (i / (arr.length - 1)) * chartWidth : chartWidth / 2;
                const y = getY(v);
                const dotColor = v < displayTargetMin ? theme.warning : v > displayTargetMax ? theme.danger : theme.success;
                return <Circle key={i} cx={isNaN(x) ? 0 : x} cy={isNaN(y) ? 0 : y} r={4} fill={dotColor} stroke={theme.bg} strokeWidth={1.5} />;
              })}
            </Svg>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>{t.reading_history}</Text>
          <Text style={[styles.sectionSubtitle, { marginBottom: 16 }]}>{t.history_subtitle}</Text>
          {(() => {
            const groups: Record<string, any[]> = {};
            validReadings.forEach(r => {
              const date = new Date(r.created_at).toLocaleDateString(locale === "ar" ? "ar-EG" : locale === "fr" ? "fr-FR" : "en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              if (!groups[date]) groups[date] = [];
              groups[date].push(r);
            });
            return Object.entries(groups).map(([date, items]) => (
              <View key={date} style={{ marginBottom: 20 }} wrap={false}>
                <View style={styles.dateHeader}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: theme.accent, textTransform: "uppercase" }}>{date}</Text>
                </View>
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>{t.time}</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>{t.value}</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: isRtl ? "left" : "right" }]}>{t.status}</Text>
                  </View>
                  {items.map((r) => {
                    const val = Number(formatValue(r.numericValue, unit));
                    const status = val < displayTargetMin ? t.low : val > displayTargetMax ? t.high : t.optimal;
                    const bStyle = val < displayTargetMin ? styles.badgeWarning : val > displayTargetMax ? styles.badgeDanger : styles.badgeSuccess;
                    const time = new Date(r.created_at).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", { hour: '2-digit', minute: '2-digit' });
                    return (
                      <View key={r.id} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 1 }]}>{time}</Text>
                        <Text style={[styles.tableCellStrong, { flex: 1 }]}>{val} {unit}</Text>
                        <View style={{ flex: 1, alignItems: isRtl ? "flex-start" : "flex-end" }}><Text style={[styles.badge, bStyle]}>{status}</Text></View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ));
          })()}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            <Text style={{ fontWeight: "700" }}>{t.disclaimer.includes(":") ? t.disclaimer.split(":")[0] + ":" : ""}</Text>
            {t.disclaimer.includes(":") ? t.disclaimer.split(":")[1] : t.disclaimer}
          </Text>
          <Text style={[styles.footerText, { fontSize: 7, marginTop: 8 }]}>
            {t.generated_summary.replace("{date}", generatedDate).replace("{name}", patientName).replace("{n}", validReadings.length.toString())}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReportPDF;
