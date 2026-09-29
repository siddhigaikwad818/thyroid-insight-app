import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, Disclaimer } from "@/components/site-shell";
import { predictThyroid, REFERENCE_RANGES, type PatientInput } from "@/ml/predict";
import { summariseSymptoms } from "@/ml/symptoms";
import { saveScreening } from "@/lib/screening-session";

export const Route = createFileRoute("/_authenticated/screening")({
  head: () => ({
    meta: [
      { title: "Patient screening form — ThyroCare AI" },
      {
        name: "description",
        content:
          "Enter age, sex, thyroid lab values (TSH, T3, TT4, T4U, FTI) and a symptom description to get an educational thyroid pattern screening.",
      },
      { property: "og:title", content: "Patient screening form — ThyroCare AI" },
      {
        property: "og:description",
        content: "Enter thyroid test values and symptoms to run the ThyroCare AI screening model.",
      },
    ],
  }),
  component: ScreeningPage,
});

type FormState = {
  age: string;
  sex: "F" | "M";
  tsh: string;
  t3: string;
  tt4: string;
  t4u: string;
  fti: string;
  onThyroxine: boolean;
  onAntithyroid: boolean;
  pregnant: boolean;
  thyroidSurgery: boolean;
  goitre: boolean;
  sick: boolean;
  symptoms: string;
};

const EMPTY: FormState = {
  age: "",
  sex: "F",
  tsh: "",
  t3: "",
  tt4: "",
  t4u: "",
  fti: "",
  onThyroxine: false,
  onAntithyroid: false,
  pregnant: false,
  thyroidSurgery: false,
  goitre: false,
  sick: false,
  symptoms: "",
};

const SAMPLES: Array<{ name: string; note: string; data: FormState }> = [
  {
    name: "Sample A",
    note: "High TSH, low T4",
    data: {
      ...EMPTY,
      age: "46",
      sex: "F",
      tsh: "18.4",
      t3: "1.1",
      tt4: "52",
      t4u: "0.95",
      fti: "55",
      symptoms:
        "Very tired all day, gaining weight, feeling cold, constipation and dry skin for three months. No palpitations.",
    },
  },
  {
    name: "Sample B",
    note: "Suppressed TSH, high T4",
    data: {
      ...EMPTY,
      age: "31",
      sex: "F",
      tsh: "0.02",
      t3: "4.8",
      tt4: "182",
      t4u: "1.05",
      fti: "172",
      symptoms:
        "Losing weight without dieting, racing heart and palpitations, shaky hands, anxious, cannot sleep, sweating a lot.",
    },
  },
  {
    name: "Sample C",
    note: "Values in range",
    data: {
      ...EMPTY,
      age: "28",
      sex: "M",
      tsh: "1.6",
      t3: "2.1",
      tt4: "108",
      t4u: "1.0",
      fti: "106",
      symptoms: "Occasional tiredness after night shifts, otherwise no complaints.",
    },
  },
];

const NUMERIC_FIELDS = [
  { key: "tsh", label: "TSH", unit: "mIU/L", ref: REFERENCE_RANGES.TSH, step: "0.01" },
  { key: "t3", label: "T3", unit: "nmol/L", ref: REFERENCE_RANGES.T3, step: "0.1" },
  { key: "tt4", label: "TT4 (total T4)", unit: "nmol/L", ref: REFERENCE_RANGES.TT4, step: "1" },
  { key: "t4u", label: "T4U (uptake ratio)", unit: "ratio", ref: REFERENCE_RANGES.T4U, step: "0.01" },
  { key: "fti", label: "FTI (free T4 index)", unit: "index", ref: REFERENCE_RANGES.FTI, step: "1" },
] as const;

const FLAGS = [
  { key: "onThyroxine", label: "Currently on thyroxine / levothyroxine" },
  { key: "onAntithyroid", label: "Currently on antithyroid medication" },
  { key: "pregnant", label: "Pregnant" },
  { key: "thyroidSurgery", label: "Previous thyroid surgery" },
  { key: "goitre", label: "Visible goitre / neck swelling" },
  { key: "sick", label: "Currently unwell with another illness" },
] as const;

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function ScreeningPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validate(): string[] {
    const problems: string[] = [];
    const age = toNumber(form.age);
    if (form.age.trim() && (age === null || age < 1 || age > 100)) {
      problems.push("Age must be a number between 1 and 100.");
    }
    for (const field of NUMERIC_FIELDS) {
      const raw = form[field.key];
      if (!raw.trim()) continue;
      const n = toNumber(raw);
      if (n === null || n <= 0) problems.push(`${field.label} must be a positive number.`);
    }
    const labsProvided = NUMERIC_FIELDS.filter((f) => toNumber(form[f.key]) !== null).length;
    if (labsProvided === 0) {
      problems.push("Enter at least one thyroid lab value (TSH is the most informative).");
    }
    return problems;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (problems.length) return;

    const input: PatientInput = {
      age: toNumber(form.age),
      sex: form.sex,
      tsh: toNumber(form.tsh),
      t3: toNumber(form.t3),
      tt4: toNumber(form.tt4),
      t4u: toNumber(form.t4u),
      fti: toNumber(form.fti),
      onThyroxine: form.onThyroxine,
      onAntithyroid: form.onAntithyroid,
      pregnant: form.pregnant,
      thyroidSurgery: form.thyroidSurgery,
      goitre: form.goitre,
      sick: form.sick,
      symptoms: form.symptoms,
    };

    saveScreening({
      input,
      prediction: predictThyroid(input),
      symptoms: summariseSymptoms(form.symptoms),
      createdAt: new Date().toISOString(),
    });
    navigate({ to: "/result" });
  }

  return (
    <SiteShell>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Patient screening form</h1>
        <p className="mt-3 text-muted-foreground">
          Fill in whatever is available from the thyroid report. Blank lab fields are handled the
          same way the training data was: filled with the dataset median and flagged as missing, so
          the model knows the value was not measured.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Load an example:</span>
        {SAMPLES.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => {
              setForm(s.data);
              setErrors([]);
            }}
            className="chip transition-colors hover:bg-secondary"
          >
            {s.name} · {s.note}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY);
            setErrors([]);
          }}
          className="chip transition-colors hover:bg-secondary"
        >
          Clear
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="card-surface p-6">
            <h2 className="text-lg font-semibold">Patient information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Age (years)</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  placeholder="e.g. 42"
                  className="field-input mt-1.5"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Sex</span>
                <select
                  value={form.sex}
                  onChange={(e) => set("sex", e.target.value as "F" | "M")}
                  className="field-input mt-1.5"
                >
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </label>
            </div>
          </section>

          <section className="card-surface p-6">
            <h2 className="text-lg font-semibold">Thyroid function tests</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Leave a field blank if the test was not done.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {NUMERIC_FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-sm font-semibold">
                    {field.label}{" "}
                    <span className="font-normal text-muted-foreground">({field.unit})</span>
                  </span>
                  <input
                    type="number"
                    step={field.step}
                    min="0"
                    value={form[field.key]}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="field-input mt-1.5"
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Typical range {field.ref}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="card-surface p-6">
            <h2 className="text-lg font-semibold">Clinical history</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {FLAGS.map((flag) => (
                <label
                  key={flag.key}
                  className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-surface px-3.5 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form[flag.key]}
                    onChange={(e) => set(flag.key, e.target.checked)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>{flag.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card-surface p-6">
            <h2 className="text-lg font-semibold">Symptom description</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Write freely. Keywords such as “weight gain”, “palpitations” or “no tremor” are
              extracted automatically.
            </p>
            <textarea
              value={form.symptoms}
              onChange={(e) => set("symptoms", e.target.value)}
              rows={9}
              placeholder="e.g. Tired for the last two months, gaining weight, feeling cold, hair fall. No palpitations."
              className="field-input mt-4 resize-y"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {form.symptoms.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </section>

          {errors.length > 0 && (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 px-5 py-4 text-sm">
              <p className="font-semibold text-danger">Please fix the following:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            Run screening
          </button>

          <Disclaimer compact />
        </div>
      </form>
    </SiteShell>
  );
}
