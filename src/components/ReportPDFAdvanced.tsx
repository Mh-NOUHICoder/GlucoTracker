// src/components/ReportPDFAdvanced.tsx
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
  G,
} from "@react-pdf/renderer";

// Premium Cyber-Dark Theme with Glassmorphism
const theme = {
  bg: "#0A0E27",
  glass: "#1a1f3a",
  glassBorder: "rgba(6, 182, 212, 0.1)",
  cardBg: "#151b34",
  cardBgLight: "#1e2749",
  border: "#2d3b5f",
  text: "#f0f4f8",
  textSecondary: "#a0aec0",
  textMuted: "#7c8ba3",
  accent: "#06b6d4",
  accentLight: "#22d3ee",
  success: "#10b981",
  successLight: "#6ee7b7",
  warning: "#f59e0b",
  danger: "#ef4444",
  dangerLight: "#f87171",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: theme.bg,
    color: theme.text,
    padding: 32,
    fontFamily: "Helvetica",
  },
  heroSection: {
    backgroundColor: theme.glass,
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroContent: {
    flex: 1,
    marginRight: 20,
  },
  heroLabel: {
    fontSize: 9,
    color: theme.accentLight,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 11,
    color: theme.textMuted,
    lineHeight: 1.5,
    marginBottom: 16,
  },
  patientCard: {
    backgroundColor: theme.cardBgLight,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  patientInfo: {
    flexDirection: "column",
    gap: 12,
  },
  infoGroup: {
    flexDirection: "column",
  },
  infoLabel: {
    fontSize: 8,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    color: theme.text,
    fontWeight: "500",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  metricCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  metricLabel: {
    fontSize: 8,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: theme.accentLight,
  },
  metricUnit: {
    fontSize: 9,
    color: theme.textMuted,
    marginLeft: 4,
  },
  chartContainer: {
    backgroundColor: theme.glass,
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chartTitle: {
    fontSize: 12,
    color: theme.text,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 16,
    fontWeight: "bold",
  },
  chartBox: {
    height: 200,
    width: "100%",
  },
  trendChartBox: {
    height: 180,
    width: "100%",
  },
  tableContainer: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: theme.glass,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tableHeaderCell: {
    fontSize: 8,
    color: theme.accentLight,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    alignItems: "center",
  },
  tableCell: {
    fontSize: 10,
    color: theme.textSecondary,
  },
  tableCellValue: {
    fontSize: 10,
    color: theme.text,
    fontWeight: "600",
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  badgeOptimal: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    color: theme.successLight,
  },
  badgeHigh: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: theme.dangerLight,
  },
  badgeLow: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    color: theme.warning,
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    flexDirection: "column",
  },
  footerText: {
    fontSize: 8,
    color: theme.textMuted,
    lineHeight: 1.6,
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 7,
    color: theme.textMuted,
    fontStyle: "italic",
    textAlign: "center",
  },
});

// Helper: Format values based on unit
const formatValue = (value: number, unit?: string): string => {
  if (!unit || unit === "mg/dL") return value.toFixed(0);
  if (unit === "mmol/L") return (value / 18.0182).toFixed(1);
  if (unit === "g/L") return (value / 100).toFixed(2);
  return value.toString();
};

// Helper: Get status color based on value and target range
const getStatusColor = (value: number, min: number, max: number, unit?: string) => {
  const displayValue = Number(formatValue(value, unit));
  const displayMin = Number(formatValue(min, unit));
  const displayMax = Number(formatValue(max, unit));
  if (displayValue < displayMin) return "low";
  if (displayValue > displayMax) return "high";
  return "optimal";
};

// Helper: Draw Donut Chart for Time in Range
const DonutChart = ({ tiValue, size = 140 }: { tiValue: number; size?: number }) => {
  const radius = size / 2;
  const innerRadius = radius * 0.6;
  const outerRadius = radius;

  // Calculate arc for donut
  const percentage = tiValue / 100;
  const angle = percentage * 360;
  const rad = (angle * Math.PI) / 180;
  const x = radius + outerRadius * Math.cos(rad - Math.PI / 2);
  const y = radius + outerRadius * Math.sin(rad - Math.PI / 2);

  const largeArc = angle > 180 ? 1 : 0;

  // Outer arc
  const arcPath = `M ${radius} ${radius - outerRadius} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x} ${y}`;
  // Back to inner arc
  const innerX = radius + innerRadius * Math.cos(rad - Math.PI / 2);
  const innerY = radius + innerRadius * Math.sin(rad - Math.PI / 2);
  const completePath = `${arcPath} L ${innerX} ${innerY} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${radius} ${radius - innerRadius} Z`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <Circle cx={radius} cy={radius} r={outerRadius} fill="none" stroke={theme.border} strokeWidth={outerRadius - innerRadius} />

      {/* Progress arc */}
      <Path
        d={completePath}
        fill={theme.successLight}
        fillOpacity="0.3"
        stroke={theme.successLight}
        strokeWidth={outerRadius - innerRadius}
      />

      {/* Center text */}
      <Text x={radius} y={radius - 8} textAnchor="middle" style={{ fontSize: "20px", fontWeight: "bold", fill: theme.accentLight }}>
        {tiValue}%
      </Text>
      <Text x={radius} y={radius + 10} textAnchor="middle" style={{ fontSize: "9px", fill: theme.textMuted }}>
        In Range
      </Text>
    </Svg>
  );
};

// Helper: Enhanced Trend Chart with Target Zone
const EnhancedTrendChart = ({
  data,
  displayValues,
  unit,
  targetMin,
  targetMax,
}: {
  data: any[];
  displayValues: number[];
  unit?: string;
  targetMin: number;
  targetMax: number;
}) => {
  const chartWidth = 500;
  const chartHeight = 160;
  const padding = 20;

  if (displayValues.length < 2) return null;

  const dataMax = Math.max(...displayValues, targetMax) * 1.15;
  const dataMin = Math.min(...displayValues, targetMin) * 0.85;
  const range = dataMax - dataMin;

  const getY = (val: number) => {
    if (range === 0) return chartHeight / 2;
    return chartHeight - ((val - dataMin) / range) * chartHeight;
  };

  const displayTargetMin = Number(formatValue(targetMin, unit));
  const displayTargetMax = Number(formatValue(targetMax, unit));

  const recentData = data.slice(-30);
  const pathData = recentData
    .map((r, i, arr) => {
      const val = Number(formatValue(Number(r.value), unit));
      const x = arr.length > 1 ? (i / (arr.length - 1)) * chartWidth : chartWidth / 2;
      const y = getY(val);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.accentLight} stopOpacity="0.4" />
          <stop offset="100%" stopColor={theme.accentLight} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Target Zone Background */}
      <Rect
        x={0}
        y={getY(displayTargetMax)}
        width={chartWidth}
        height={Math.max(0, getY(displayTargetMin) - getY(displayTargetMax))}
        fill={theme.success}
        fillOpacity={0.08}
      />

      {/* Grid Lines */}
      <Line
        x1={0}
        y1={getY(displayTargetMin)}
        x2={chartWidth}
        y2={getY(displayTargetMin)}
        stroke={theme.success}
        strokeWidth={1}
        strokeOpacity={0.3}
        strokeDasharray="5 3"
      />
      <Line
        x1={0}
        y1={getY(displayTargetMax)}
        x2={chartWidth}
        y2={getY(displayTargetMax)}
        stroke={theme.danger}
        strokeWidth={1}
        strokeOpacity={0.3}
        strokeDasharray="5 3"
      />

      {/* Trend Path */}
      <Path d={pathData} fill="none" stroke={theme.accentLight} strokeWidth={2.5} />

      {/* Data Points */}
      {recentData.map((r, i, arr) => {
        const val = Number(formatValue(Number(r.value), unit));
        const x = arr.length > 1 ? (i / (arr.length - 1)) * chartWidth : chartWidth / 2;
        const y = getY(val);
        const status = getStatusColor(val, displayTargetMin, displayTargetMax);
        const pointColor =
          status === "low"
            ? theme.warning
            : status === "high"
              ? theme.danger
              : theme.success;

        return (
          <Circle key={i} cx={x} cy={y} r={3} fill={pointColor} stroke={theme.bg} strokeWidth={1} />
        );
      })}
    </Svg>
  );
};

interface Reading {
  id: string;
  value: number | string;
  created_at: string;
}

interface ReportPDFAdvancedProps {
  patientName: string;
  patientEmail?: string;
  generatedDate?: string;
  readings: Reading[];
  unit?: "mg/dL" | "mmol/L" | "g/L";
  targetMin?: number;
  targetMax?: number;
  locale?: string;
}

export const ReportPDFAdvanced: React.FC<ReportPDFAdvancedProps> = ({
  patientName,
  patientEmail = "N/A",
  generatedDate = new Date().toLocaleDateString(),
  readings,
  unit = "g/L",
  targetMin = 0.7,
  targetMax = 1.8,
  locale = "en",
}) => {
  const sortedForChart = [...readings].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const rawValues = readings.map((r) => Number(r.value));
  const displayValues = readings.map((r) => Number(formatValue(Number(r.value), unit)));

  const rawAvg = rawValues.length ? rawValues.reduce((a, b) => a + b, 0) / rawValues.length : 0;
  const recentAvg =
    displayValues.length ? displayValues.reduce((a, b) => a + b, 0) / displayValues.length : 0;

  // A1C Formula
  const a1c = rawValues.length ? ((rawAvg + 46.7) / 28.7).toFixed(1) : "--";

  const displayTargetMin = Number(formatValue(targetMin, unit));
  const displayTargetMax = Number(formatValue(targetMax, unit));

  const inRangeCount = displayValues.filter((v) => v >= displayTargetMin && v <= displayTargetMax)
    .length;
  const timeInRangePct = displayValues.length ? Math.round((inRangeCount / displayValues.length) * 100) : 0;
  const lowEvents = displayValues.filter((v) => v < displayTargetMin).length;
  const highEvents = displayValues.filter((v) => v > displayTargetMax).length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Clinical Insights Report</Text>
            <Text style={styles.heroTitle}>GlucoTrack AI</Text>
            <Text style={styles.heroSubtitle}>
              Advanced glucose monitoring and metabolic trend analysis for personalized health optimization.
            </Text>
          </View>
          <View>
            <Text
              style={{
                fontSize: 12,
                color: theme.accentLight,
                fontWeight: "bold",
                marginBottom: 8,
              }}
            >
              {generatedDate}
            </Text>
            <View style={{ backgroundColor: theme.cardBg, padding: 12, borderRadius: 12 }}>
              <Text style={{ fontSize: 9, color: theme.textMuted, marginBottom: 4 }}>
                Patient ID
              </Text>
              <Text style={{ fontSize: 11, color: theme.text, fontWeight: "bold" }}>
                {patientName}
              </Text>
            </View>
          </View>
        </View>

        {/* Patient Card */}
        <View style={styles.patientCard}>
          <View style={styles.patientInfo}>
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>Patient Name</Text>
              <Text style={styles.infoValue}>{patientName}</Text>
            </View>
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{patientEmail}</Text>
            </View>
          </View>
          <View style={styles.patientInfo}>
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>Total Readings</Text>
              <Text style={styles.infoValue}>{readings.length}</Text>
            </View>
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>Target Range</Text>
              <Text style={styles.infoValue}>
                {displayTargetMin} - {displayTargetMax} {unit}
              </Text>
            </View>
          </View>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Average</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={styles.metricValue}>
                {typeof recentAvg === "number" ? recentAvg.toFixed(unit === "g/L" ? 2 : 1) : recentAvg}
              </Text>
              <Text style={styles.metricUnit}>{unit}</Text>
            </View>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Est. A1C</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={styles.metricValue}>{a1c}</Text>
              <Text style={styles.metricUnit}>%</Text>
            </View>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Time in Range</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={styles.metricValue}>{timeInRangePct}</Text>
              <Text style={styles.metricUnit}>%</Text>
            </View>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Low Events</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={styles.metricValue}>{lowEvents}</Text>
              <Text style={styles.metricUnit}>Events</Text>
            </View>
          </View>
        </View>

        {/* Time in Range Donut Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Glucose Control Distribution</Text>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <DonutChart tiValue={timeInRangePct} size={120} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 14 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: theme.successLight, fontWeight: "bold" }}>
                {inRangeCount}
              </Text>
              <Text style={{ fontSize: 8, color: theme.textMuted }}>In Range</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: theme.dangerLight, fontWeight: "bold" }}>
                {highEvents}
              </Text>
              <Text style={{ fontSize: 8, color: theme.textMuted }}>High Events</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: theme.warning, fontWeight: "bold" }}>
                {lowEvents}
              </Text>
              <Text style={{ fontSize: 8, color: theme.textMuted }}>Low Events</Text>
            </View>
          </View>
        </View>

        {/* Metabolic Trend Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Metabolic Trend (Last 30 Readings)</Text>
          <View style={styles.trendChartBox}>
            <EnhancedTrendChart
              data={sortedForChart}
              displayValues={displayValues}
              unit={unit}
              targetMin={targetMin}
              targetMax={targetMax}
            />
          </View>
        </View>

        {/* Recent History Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Timestamp</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>
              Glucose ({unit})
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Status</Text>
          </View>
          {readings.slice(0, 12).map((r, idx) => {
            const val = Number(formatValue(Number(r.value), unit));
            const status = getStatusColor(val, displayTargetMin, displayTargetMax);
            const statusLabel =
              status === "low" ? "LOW" : status === "high" ? "HIGH" : "OPTIMAL";
            const badgeStyle =
              status === "low"
                ? styles.badgeLow
                : status === "high"
                  ? styles.badgeHigh
                  : styles.badgeOptimal;

            return (
              <View key={r.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  {new Date(r.created_at).toLocaleString("en-US", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </Text>
                <Text style={[styles.tableCellValue, { flex: 1, textAlign: "right" }]}>
                  {val}
                </Text>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={[styles.badge, badgeStyle]}>{statusLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.disclaimer}>
            This report is generated by GlucoTrack AI for informational purposes only. It should not be used as a substitute for professional medical advice. Always consult with your healthcare provider before making any medical decisions.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReportPDFAdvanced;
