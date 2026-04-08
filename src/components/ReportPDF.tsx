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
} from "@react-pdf/renderer";

// Premium dark theme tokens
const theme = {
  bg: "#0B1120", // Deep dark blue
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

const styles = StyleSheet.create({
  page: {
    backgroundColor: theme.bg,
    color: theme.text,
    padding: 36,
    fontFamily: "Helvetica",
  },
  hero: {
    flexDirection: "row",
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
  },
  title: {
    fontSize: 30,
    color: theme.accent,
    marginBottom: 6,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 10,
    color: theme.textMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  heroTag: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    color: theme.accent,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
  },
  heroStats: {
    flexDirection: "row",
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
    minWidth: 140,
    minHeight: 82,
    justifyContent: "center",
  },
  heroStatLabel: {
    fontSize: 8,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroStatValue: {
    fontSize: 24,
    color: theme.text,
    fontWeight: "bold",
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
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
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
    fontSize: 24,
    color: theme.text,
    fontWeight: "700",
    marginTop: 10,
  },
  metricUnit: {
    fontSize: 9,
    color: theme.textMuted,
  },
  chartContainer: {
    marginBottom: 25,
    backgroundColor: theme.cardBg,
    padding: 22,
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.text,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: theme.textMuted,
  },
  chartLegendRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chartWithYAxis: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  yAxisLabels: {
    width: 48,
    height: 200,
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 10,
  },
  yAxisLabelText: {
    fontSize: 8,
    color: theme.textMuted,
    textAlign: "right",
  },
  yAxisUnitText: {
    fontSize: 7,
    color: theme.textMuted,
    textAlign: "right",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  chartBox: {
    flex: 1,
    minHeight: 200,
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
    flexDirection: "row",
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
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTop: `1px solid ${theme.border}`,
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 8,
    color: theme.textMuted,
    maxWidth: "85%",
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
  noteBox: {
    backgroundColor: theme.cardBgLight,
    padding: 16,
    borderRadius: 16,
    marginTop: 18,
    border: `1px dashed ${theme.border}`,
  },
});

// Helper for formatting
const formatValue = (value: number, unit?: string) => {
  if (!unit || unit === "mg/dL") return value.toFixed(0);
  if (unit === "mmol/L") return (value / 18.0182).toFixed(1);
  if (unit === "g/L") return (value / 100).toFixed(2);
  return value.toString();
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
  readings,
  unit = "mg/dL",
  targetMin = 70,
  targetMax = 180,
  locale = "en",
}) => {
  const sortedForChart = [...readings].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  const rawValues = readings.map(r => Number(r.value));
  const displayValues = readings.map((r) => Number(formatValue(Number(r.value), unit)));
  
  const rawAvg = rawValues.length ? rawValues.reduce((a, b) => a + b, 0) / rawValues.length : 0;
  const recentAvg = displayValues.length ? displayValues.reduce((a, b) => a + b, 0) / displayValues.length : 0;
  
  // App formula for A1c: ((rawAvg + 46.7) / 28.7)
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
    const range = dataMax - dataMin;
    if (range === 0) return chartHeight / 2;
    return chartHeight - ((val - dataMin) / range) * chartHeight;
  };

  const pathD = sortedForChart.slice(-30).map((r, i, arr) => {
    const v = Number(formatValue(Number(r.value), unit));
    const x = arr.length > 1 ? (i / (arr.length - 1)) * chartWidth : chartWidth / 2;
    const y = getY(v);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(" ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.heroTag}>Clinical Insights</Text>
            <Text style={styles.title}>GlucoTrack AI Report</Text>
            <Text style={styles.subtitle}>Personalized glucose monitoring summary and trend analysis</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Readings</Text>
                <Text style={styles.heroStatValue}>{readings.length}</Text>
              </View>
              <View style={[styles.heroStatCard, styles.heroAccentCard]}>
                <Text style={styles.heroStatLabel}>Target Range</Text>
                <Text style={styles.heroStatValue}>{displayTargetMin} - {displayTargetMax}</Text>
                <Text style={styles.metricUnit}>{unit}</Text>
              </View>
            </View>
          </View>
          <View>
            <View style={styles.logoContainer}>
              <Image src="/glucotracker.png" style={styles.logoImage} />
              <Text style={styles.logoText}>GlucoTrack</Text>
            </View>
            <View style={[styles.heroAccentCard, { marginTop: 16, alignItems: "flex-start" }]}> 
              <Text style={styles.heroStatLabel}>Issued On</Text>
              <Text style={styles.heroStatValue}>{generatedDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.patientSection}>
          <View style={styles.patientInfoCol}><Text style={styles.label}>Patient</Text><Text style={styles.value}>{patientName}</Text></View>
          <View style={styles.patientInfoCol}><Text style={styles.label}>Email</Text><Text style={styles.value}>{patientEmail}</Text></View>
          <View style={styles.patientInfoCol}><Text style={styles.label}>Issued On</Text><Text style={styles.value}>{generatedDate}</Text></View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.metricCard]}> 
            <Text style={styles.metricLabel}>Average</Text>
            <Text style={styles.metricValueLg}>{typeof recentAvg === 'number' ? recentAvg.toFixed(unit === "g/L" ? 2 : 1) : recentAvg} <Text style={styles.metricUnit}>{unit}</Text></Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardPurple]}>
            <Text style={styles.metricLabel}>Estimated A1c</Text>
            <Text style={styles.metricValueLg}>{a1c}<Text style={styles.metricUnit}>%</Text></Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardSuccess]}>
            <Text style={styles.metricLabel}>Time in Range</Text>
            <Text style={styles.metricValueLg}>{timeInRangePct}<Text style={styles.metricUnit}>%</Text></Text>
          </View>
          <View style={[styles.metricCard, hypoEvents > 0 ? styles.metricCardDanger : styles.metricCard]}> 
            <Text style={styles.metricLabel}>Low Events</Text>
            <Text style={styles.metricValueLg}>{hypoEvents} <Text style={styles.metricUnit}>Events</Text></Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.sectionTitle}>Metabolic Trend Analysis</Text>
              <Text style={styles.sectionSubtitle}>Last 30 readings with clinical target bands</Text>
            </View>
            <View style={styles.chartLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.accent }]} />
                <Text style={styles.tableCell}>Glucose Trend</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                <Text style={styles.tableCell}>Target Zone</Text>
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
              {/* Grid Lines */}
              <Line x1={0} y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke={theme.border} strokeWidth={0.8} strokeOpacity={0.5} />
              <Line x1={0} y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke={theme.border} strokeWidth={0.8} strokeOpacity={0.5} />
              <Line x1={0} y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke={theme.border} strokeWidth={0.8} strokeOpacity={0.5} />
              {/* Target Zone Background */}
              <Rect x={0} y={getY(displayTargetMax)} width={chartWidth} height={Math.max(0, getY(displayTargetMin) - getY(displayTargetMax))} fill={theme.success} fillOpacity={0.15} />
              {/* Target Zone Borders */}
              <Line x1={0} y1={getY(displayTargetMin)} x2={chartWidth} y2={getY(displayTargetMin)} stroke={theme.success} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="5 3" />
              <Line x1={0} y1={getY(displayTargetMax)} x2={chartWidth} y2={getY(displayTargetMax)} stroke={theme.danger} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="5 3" />
              {/* Trend Line */}
              {sortedForChart.length > 1 && <Path d={pathD} fill="none" stroke={theme.accent} strokeWidth={2.5} />}
              {/* Data Points */}
              {sortedForChart.slice(-30).map((r, i, arr) => {
                const v = Number(formatValue(Number(r.value), unit));
                const x = arr.length > 1 ? (i / (arr.length - 1)) * chartWidth : chartWidth / 2;
                const y = getY(v);
                const dotColor = v < displayTargetMin ? theme.warning : v > displayTargetMax ? theme.danger : theme.success;
                return <Circle key={i} cx={x} cy={y} r={4} fill={dotColor} stroke={theme.bg} strokeWidth={1.5} />;
              })}
            </Svg>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Recent Reading History</Text>
          <Text style={[styles.sectionSubtitle, { marginBottom: 12 }]}>10 most recent glucose measurements</Text>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Date & Time</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Value</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Status</Text>
            </View>
            {readings.slice(0, 10).map((r, idx) => {
              const val = Number(formatValue(Number(r.value), unit));
              const status = val < displayTargetMin ? "Low" : val > displayTargetMax ? "High" : "Optimal";
              const badgeStyle = val < displayTargetMin ? styles.badgeWarning : val > displayTargetMax ? styles.badgeDanger : styles.badgeSuccess;
              const timestamp = new Date(r.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
              return (
                <View key={r.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2.5 }]}>{timestamp}</Text>
                  <Text style={[styles.tableCellStrong, { flex: 1.5 }]}>{val} {unit}</Text>
                  <View style={{ flex: 1, alignItems: "flex-end" }}><Text style={[styles.badge, badgeStyle]}>{status}</Text></View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            <Text style={{ fontWeight: "bold" }}>Medical Disclaimer:</Text> This report is generated by GlucoTrack AI for informational purposes only. Data represents patient readings and calculated metrics. Always consult with a healthcare professional before making medical decisions or adjusting medications.
          </Text>
          <Text style={[styles.footerText, { fontSize: 7, marginTop: 8 }]}>
            Generated on {generatedDate} | Patient: {patientName} | Total Readings: {readings.length}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReportPDF;
