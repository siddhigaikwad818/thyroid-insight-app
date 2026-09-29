import type { PatientInput, Prediction } from "@/ml/predict";
import type { SymptomSummary } from "@/ml/symptoms";

export interface ScreeningRecord {
  input: PatientInput;
  prediction: Prediction;
  symptoms: SymptomSummary;
  createdAt: string;
}

const KEY = "thyrocare.lastScreening";

export function saveScreening(record: ScreeningRecord) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(record));
}

export function loadScreening(): ScreeningRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScreeningRecord;
  } catch {
    return null;
  }
}

export function clearScreening() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}
