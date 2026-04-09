/**
 * Standard utility for glucose unit conversions.
 * Base internal unit is always mg/dL.
 */

export type GlucoseUnit = "mg/dL" | "mmol/L" | "g/L";

/**
 * Converts mg/dL to target unit.
 * Formula for g/L (Moroccan standard): mg/dL / 100
 * Formula for mmol/L: mg/dL / 18.0182
 */
export const convertGlucose = (value: number, toUnit: GlucoseUnit): number => {
  if (toUnit === "mmol/L") {
    return Number((value / 18.0182).toFixed(1));
  }
  if (toUnit === "g/L") {
    return Number((value / 100).toFixed(2));
  }
  return value; // Default is mg/dL
};

/**
 * Returns the localized unit string.
 */
export const getUnitLabel = (unit: GlucoseUnit, t: (key: string) => string): string => {
  if (unit === "mg/dL") return t("mg_dl");
  if (unit === "g/L") return t("g_l");
  return unit;
};
