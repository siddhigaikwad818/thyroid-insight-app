import model from "./model.json";

export type ClassName = "normal" | "hypothyroid" | "hyperthyroid";

export interface PatientInput {
  age: number | null;
  sex: "F" | "M";
  tsh: number | null;
  t3: number | null;
  tt4: number | null;
  t4u: number | null;
  fti: number | null;
  onThyroxine: boolean;
  onAntithyroid: boolean;
  pregnant: boolean;
  thyroidSurgery: boolean;
  goitre: boolean;
  sick: boolean;
  symptoms: string;
}

export interface Contribution {
  feature: string;
  label: string;
  value: string;
  effect: number;
}

export interface Prediction {
  predicted: ClassName;
  probabilities: Record<ClassName, number>;
  confidence: number;
  contributions: Contribution[];
  imputed: string[];
}

const NUM = model.numeric as Array<"age" | "TSH" | "T3" | "TT4" | "T4U" | "FTI">;
const MISSING_FIELDS = ["TSH", "T3", "TT4", "T4U", "FTI"] as const;

const FIELD_LABELS: Record<string, string> = {
  age: "Age",
  TSH: "TSH",
  T3: "T3",
  TT4: "TT4 (total T4)",
  T4U: "T4U",
  FTI: "FTI (free T4 index)",
  sex: "Female",
  on_thyroxine: "On thyroxine medication",
  on_antithyroid_medication: "On antithyroid medication",
  pregnant: "Pregnant",
  thyroid_surgery: "Previous thyroid surgery",
  query_hypothyroid: "Suspected hypothyroid",
  query_hyperthyroid: "Suspected hyperthyroid",
  goitre: "Goitre present",
  sick: "Currently unwell",
};

function rawValue(input: PatientInput, field: string): number | null | boolean {
  switch (field) {
    case "age":
      return input.age;
    case "TSH":
      return input.tsh;
    case "T3":
      return input.t3;
    case "TT4":
      return input.tt4;
    case "T4U":
      return input.t4u;
    case "FTI":
      return input.fti;
    case "sex":
      return input.sex === "F";
    case "on_thyroxine":
      return input.onThyroxine;
    case "on_antithyroid_medication":
      return input.onAntithyroid;
    case "pregnant":
      return input.pregnant;
    case "thyroid_surgery":
      return input.thyroidSurgery;
    case "query_hypothyroid":
      return false;
    case "query_hyperthyroid":
      return false;
    case "goitre":
      return input.goitre;
    case "sick":
      return input.sick;
    default:
      return null;
  }
}

/** Cleans a user value the same way the training pipeline cleaned the dataset. */
function clean(field: string, value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  if (field === "age" && (value < 1 || value > 100)) return null;
  return value;
}

export function predictThyroid(input: PatientInput): Prediction {
  const medians = model.medians as Record<string, number>;
  const imputed: string[] = [];
  const row: number[] = [];
  const display: string[] = [];

  for (const field of NUM) {
    const cleaned = clean(field, rawValue(input, field) as number | null);
    if (cleaned === null) imputed.push(FIELD_LABELS[field] ?? field);
    const median = medians[field] ?? 1;
    const used = cleaned ?? median;
    row.push(field === "age" ? used : Math.log(used));
    display.push(cleaned === null ? `${median} (estimated)` : `${cleaned}`);
  }
  for (const field of MISSING_FIELDS) {
    const cleaned = clean(field, rawValue(input, field) as number | null);
    row.push(cleaned === null ? 1 : 0);
    display.push(cleaned === null ? "not provided" : "provided");
  }
  for (const field of model.binary as string[]) {
    const flag = rawValue(input, field) === true;
    row.push(flag ? 1 : 0);
    display.push(flag ? "yes" : "no");
  }

  const mean = model.mean as number[];
  const std = model.std as number[];
  const coef = model.coef as number[][];
  const intercept = model.intercept as number[];
  const classes = model.classes as ClassName[];

  const scaled = row.map((v, i) => (v - (mean[i] ?? 0)) / (std[i] ?? 1));
  const logits = intercept.slice();
  for (let i = 0; i < scaled.length; i++) {
    const weights = coef[i] ?? [];
    for (let k = 0; k < logits.length; k++) {
      logits[k] = (logits[k] ?? 0) + (scaled[i] ?? 0) * (weights[k] ?? 0);
    }
  }
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);

  let best = 0;
  probs.forEach((p, i) => {
    if (p > (probs[best] ?? 0)) best = i;
  });

  const featureNames = model.features as string[];
  const contributions: Contribution[] = featureNames
    .map((feature, i) => {
      const base = feature.replace(/^log_/, "").replace(/_missing$/, "");
      const isMissingFlag = feature.endsWith("_missing");
      return {
        feature,
        label: isMissingFlag
          ? `${FIELD_LABELS[base] ?? base} value missing`
          : (FIELD_LABELS[base] ?? base),
        value: display[i] ?? "",
        effect: (scaled[i] ?? 0) * (coef[i]?.[best] ?? 0),
      };
    })
    .filter((c) => Math.abs(c.effect) > 0.02)
    .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))
    .slice(0, 6);

  const probabilities = {} as Record<ClassName, number>;
  classes.forEach((c, i) => {
    probabilities[c] = probs[i] ?? 0;
  });

  return {
    predicted: classes[best] ?? "normal",
    probabilities,
    confidence: probs[best] ?? 0,
    contributions,
    imputed,
  };
}

export const CLASS_LABELS: Record<ClassName, string> = {
  normal: "Normal pattern",
  hypothyroid: "Possible Hypothyroidism",
  hyperthyroid: "Possible Hyperthyroidism",
};

export const REFERENCE_RANGES: Record<string, string> = {
  TSH: "0.4 – 4.0 mIU/L",
  T3: "1.0 – 2.6 nmol/L",
  TT4: "60 – 140 nmol/L",
  T4U: "0.7 – 1.3",
  FTI: "60 – 155",
};
