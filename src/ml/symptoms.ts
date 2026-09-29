/**
 * Lightweight clinical keyword extraction for free-text symptom descriptions.
 *
 * Works like a small rule-based NLP layer: the text is normalised, negations are
 * detected, and each phrase in the thyroid symptom lexicon is matched. Every
 * matched symptom carries a direction (hypo / hyper / neutral) so the result page
 * can say whether the described symptoms agree with the lab-based prediction.
 */

export type Direction = "hypothyroid" | "hyperthyroid" | "neutral";

export interface ExtractedSymptom {
  keyword: string;
  matched: string;
  direction: Direction;
  negated: boolean;
}

interface LexiconEntry {
  keyword: string;
  direction: Direction;
  phrases: string[];
}

const LEXICON: LexiconEntry[] = [
  { keyword: "Fatigue", direction: "hypothyroid", phrases: ["fatigue", "tired", "tiredness", "exhausted", "exhaustion", "low energy", "lethargic", "lethargy", "sluggish"] },
  { keyword: "Weight gain", direction: "hypothyroid", phrases: ["weight gain", "gaining weight", "gained weight", "putting on weight"] },
  { keyword: "Cold intolerance", direction: "hypothyroid", phrases: ["cold intolerance", "feeling cold", "feel cold", "always cold", "sensitive to cold", "chills"] },
  { keyword: "Constipation", direction: "hypothyroid", phrases: ["constipation", "constipated"] },
  { keyword: "Dry skin", direction: "hypothyroid", phrases: ["dry skin", "rough skin", "flaky skin"] },
  { keyword: "Hair loss", direction: "hypothyroid", phrases: ["hair loss", "hair fall", "losing hair", "thinning hair"] },
  { keyword: "Depressed mood", direction: "hypothyroid", phrases: ["depression", "depressed", "low mood", "sad all the time"] },
  { keyword: "Slow heart rate", direction: "hypothyroid", phrases: ["slow heart rate", "slow pulse", "bradycardia"] },
  { keyword: "Puffy face", direction: "hypothyroid", phrases: ["puffy face", "puffiness", "swollen face", "facial swelling"] },
  { keyword: "Memory or concentration problems", direction: "hypothyroid", phrases: ["brain fog", "forgetful", "memory loss", "poor memory", "cannot concentrate", "can't concentrate", "trouble concentrating"] },
  { keyword: "Heavy periods", direction: "hypothyroid", phrases: ["heavy periods", "heavy menstrual", "menorrhagia"] },
  { keyword: "Muscle cramps", direction: "hypothyroid", phrases: ["muscle cramps", "muscle ache", "muscle pain", "joint pain", "stiffness"] },
  { keyword: "Hoarse voice", direction: "hypothyroid", phrases: ["hoarse voice", "hoarseness", "husky voice"] },

  { keyword: "Weight loss", direction: "hyperthyroid", phrases: ["weight loss", "losing weight", "lost weight", "unexplained weight loss"] },
  { keyword: "Palpitations", direction: "hyperthyroid", phrases: ["palpitation", "palpitations", "racing heart", "fast heartbeat", "rapid heartbeat", "fast heart rate", "tachycardia", "pounding heart"] },
  { keyword: "Heat intolerance", direction: "hyperthyroid", phrases: ["heat intolerance", "feeling hot", "feel hot", "cannot tolerate heat", "sensitive to heat", "excessive sweating", "sweating a lot", "sweaty"] },
  { keyword: "Anxiety or nervousness", direction: "hyperthyroid", phrases: ["anxiety", "anxious", "nervous", "nervousness", "restless", "restlessness", "irritable", "irritability", "panic"] },
  { keyword: "Tremor", direction: "hyperthyroid", phrases: ["tremor", "trembling", "shaky hands", "shaking hands", "hand shake"] },
  { keyword: "Insomnia", direction: "hyperthyroid", phrases: ["insomnia", "cannot sleep", "can't sleep", "trouble sleeping", "sleepless"] },
  { keyword: "Frequent bowel movements", direction: "hyperthyroid", phrases: ["frequent bowel", "loose motions", "diarrhoea", "diarrhea", "loose stools"] },
  { keyword: "Increased appetite", direction: "hyperthyroid", phrases: ["increased appetite", "always hungry", "eating more", "excess hunger"] },
  { keyword: "Eye changes", direction: "hyperthyroid", phrases: ["bulging eyes", "eye bulging", "protruding eyes", "staring eyes", "gritty eyes", "double vision"] },
  { keyword: "Muscle weakness", direction: "hyperthyroid", phrases: ["muscle weakness", "weak muscles", "weakness in arms", "weakness in legs"] },
  { keyword: "Light or absent periods", direction: "hyperthyroid", phrases: ["light periods", "missed periods", "irregular periods", "no periods"] },

  { keyword: "Neck swelling / goitre", direction: "neutral", phrases: ["goitre", "goiter", "neck swelling", "swollen neck", "lump in neck", "throat swelling"] },
  { keyword: "Difficulty swallowing", direction: "neutral", phrases: ["difficulty swallowing", "trouble swallowing", "dysphagia"] },
  { keyword: "Shortness of breath", direction: "neutral", phrases: ["shortness of breath", "breathlessness", "breathless", "hard to breathe"] },
  { keyword: "Dizziness", direction: "neutral", phrases: ["dizzy", "dizziness", "light headed", "lightheaded"] },
  { keyword: "Hair or nail brittleness", direction: "neutral", phrases: ["brittle nails", "brittle hair"] },
  { keyword: "Family history of thyroid disease", direction: "neutral", phrases: ["family history", "mother has thyroid", "father has thyroid", "runs in the family"] },
];

const NEGATORS = ["no", "not", "never", "without", "denies", "denied", "free of", "absent"];

function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ")} `;
}

function isNegated(haystack: string, matchIndex: number): boolean {
  const window = haystack.slice(Math.max(0, matchIndex - 28), matchIndex);
  return NEGATORS.some((n) => new RegExp(`(^|\\s)${n}(\\s|$)`).test(window));
}

export function extractSymptoms(text: string): ExtractedSymptom[] {
  if (!text || !text.trim()) return [];
  const haystack = normalise(text);
  const found = new Map<string, ExtractedSymptom>();

  for (const entry of LEXICON) {
    for (const phrase of entry.phrases) {
      const idx = haystack.indexOf(` ${phrase}`);
      if (idx === -1) continue;
      const negated = isNegated(haystack, idx + 1);
      const existing = found.get(entry.keyword);
      if (!existing || (existing.negated && !negated)) {
        found.set(entry.keyword, {
          keyword: entry.keyword,
          matched: phrase,
          direction: entry.direction,
          negated,
        });
      }
    }
  }

  return [...found.values()].sort((a, b) => {
    if (a.negated !== b.negated) return a.negated ? 1 : -1;
    return a.keyword.localeCompare(b.keyword);
  });
}

export interface SymptomSummary {
  symptoms: ExtractedSymptom[];
  hypoCount: number;
  hyperCount: number;
  neutralCount: number;
  leaning: Direction | null;
}

export function summariseSymptoms(text: string): SymptomSummary {
  const symptoms = extractSymptoms(text);
  const active = symptoms.filter((s) => !s.negated);
  const hypoCount = active.filter((s) => s.direction === "hypothyroid").length;
  const hyperCount = active.filter((s) => s.direction === "hyperthyroid").length;
  const neutralCount = active.filter((s) => s.direction === "neutral").length;
  let leaning: Direction | null = null;
  if (hypoCount > hyperCount && hypoCount > 0) leaning = "hypothyroid";
  else if (hyperCount > hypoCount && hyperCount > 0) leaning = "hyperthyroid";
  else if (hypoCount > 0 && hypoCount === hyperCount) leaning = "neutral";
  return { symptoms, hypoCount, hyperCount, neutralCount, leaning };
}
