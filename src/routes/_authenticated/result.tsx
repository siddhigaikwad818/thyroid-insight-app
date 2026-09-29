import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell, Disclaimer } from "@/components/site-shell";
import { CLASS_LABELS, REFERENCE_RANGES, type ClassName } from "@/ml/predict";
import type { ExtractedSymptom } from "@/ml/symptoms";
import { loadScreening, type ScreeningRecord } from "@/lib/screening-session";
import insights from "@/ml/insights.json";

export const Route = createFileRoute("/_authenticated/result")({
  head: () => ({
    meta: [
      { title: "Screening result — ThyroCare" },
      {
        name: "description",
        content:
          "Thyroid screening result with probabilities, extracted symptoms, and next-step guidance.",
      },
      { property: "og:title", content: "Screening result — ThyroCare" },
      {
        property: "og:description",
        content: "Predicted thyroid pattern with confidence, symptom keywords and explanation.",
      },
    ],
  }),
  component: ResultPage,
});

const TONE: Record<ClassName, { ring: string; text: string; bg: string; blurb: string }> = {
  normal: {
    ring: "border-teal/50",
    text: "text-teal",
    bg: "bg-teal/12",
    blurb:
      "The entered values sit close to the patterns of patients labelled as not having a thyroid disorder in the training data.",
  },
  hypothyroid: {
    ring: "border-primary/50",
    text: "text-primary",
    bg: "bg-primary/12",
    blurb:
      "The combination of values resembles patients whose records were labelled hypothyroid (an underactive thyroid) — typically raised TSH with lower T4 / FTI.",
  },
  hyperthyroid: {
    ring: "border-danger/50",
    text: "text-danger",
    bg: "bg-danger/12",
    blurb:
      "The combination of values resembles patients whose records were labelled hyperthyroid (an overactive thyroid) — typically suppressed TSH with raised T3 / T4.",
  },
};

const LAB_KEYS = [
  { key: "tsh", label: "TSH", ref: REFERENCE_RANGES.TSH },
  { key: "t3", label: "T3", ref: REFERENCE_RANGES.T3 },
  { key: "tt4", label: "TT4", ref: REFERENCE_RANGES.TT4 },
  { key: "t4u", label: "T4U", ref: REFERENCE_RANGES.T4U },
  { key: "fti", label: "FTI", ref: REFERENCE_RANGES.FTI },
] as const;

function SymptomChip({ s }: { s: ExtractedSymptom }) {
  const tone = s.negated
    ? "border-border bg-surface text-muted-foreground line-through"
    : s.direction === "hypothyroid"
      ? "border-primary/40 bg-primary/12 text-primary"
      : s.direction === "hyperthyroid"
        ? "border-danger/40 bg-danger/12 text-danger"
        : "border-accent/50 bg-accent/20 text-accent-foreground";
  return (
    <span className={`chip ${tone}`} title={`matched text: "${s.matched}"`}>
      {s.keyword}
      {s.negated && <span className="no-underline"> (denied)</span>}
    </span>
  );
}

export default function ResultPage() {
  const [record, setRecord] = useState<ScreeningRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecord(loadScreening());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <SiteShell>
        <p className="text-muted-foreground">Loading result…</p>
      </SiteShell>
    );
  }

  if (!record) {
    return (
      <SiteShell>
        <div className="card-surface mx-auto max-w-xl p-8 text-center">
          <h1 className="text-2xl font-semibold">No screening yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Fill in the patient form and the result will appear here with the predicted pattern,
            confidence and explanation.
          </p>
          <Link to="/screening" className="btn-primary mt-6">
            Go to the screening form
          </Link>
        </div>
      </SiteShell>
    );
  }

  const { input, prediction, symptoms } = record;
  const tone = TONE[prediction.predicted];
  const ordered = (Object.keys(CLASS_LABELS) as ClassName[]).sort(
    (a, b) => prediction.probabilities[b] - prediction.probabilities[a],
  );
  const agreement =
    symptoms.leaning === null
      ? "No clearly thyroid-specific symptoms were recognised in the description, so this result rests on the lab values alone."
      : symptoms.leaning === prediction.predicted
        ? "The extracted symptoms point in the same direction as the lab-based prediction, which strengthens the case for a clinical review."
        : symptoms.leaning === "neutral"
          ? "The description mixes symptoms from both directions, so the symptom text neither supports nor contradicts the lab-based prediction."
          : `The extracted symptoms lean towards ${CLASS_LABELS[symptoms.leaning as ClassName].toLowerCase()}, which does not match the lab-based prediction — worth discussing with a doctor.`;

  return (
    <SiteShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Screening result</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Generated {new Date(record.createdAt).toLocaleString()}
          </p>
        </div>
        <Link to="/screening" className="btn-ghost">
          Run another screening
        </Link>
      </div>

      <section className={`card-surface mt-6 border-2 ${tone.ring} p-7`}>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Predicted pattern
        </span>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className={`text-3xl font-semibold sm:text-4xl ${tone.text}`}>
            {CLASS_LABELS[prediction.predicted]}
          </h2>
          <span className="text-lg font-semibold">
            {(prediction.confidence * 100).toFixed(1)}% confidence
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{tone.blurb}</p>

        <div className="mt-6 space-y-3">
          {ordered.map((cls) => {
            const p = prediction.probabilities[cls];
            return (
              <div key={cls}>
                <div className="flex justify-between text-sm font-semibold">
                  <span>{CLASS_LABELS[cls]}</span>
                  <span>{(p * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className={`h-full rounded-full ${cls === prediction.predicted ? "bg-primary" : "bg-accent/60"}`}
                    style={{ width: `${Math.max(p * 100, 1.5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-6">
          <h2 className="text-xl font-semibold">Why the model said this</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each bar is the contribution of one input to the predicted class: right means it pushed
            towards <b>{CLASS_LABELS[prediction.predicted]}</b>, left means it pushed away.
          </p>
          <ul className="mt-5 space-y-3">
            {prediction.contributions.map((c) => {
              const max = Math.max(...prediction.contributions.map((x) => Math.abs(x.effect)), 0.01);
              const width = (Math.abs(c.effect) / max) * 50;
              return (
                <li key={c.feature}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{c.label}</span>
                    <span className="text-muted-foreground">{c.value}</span>
                  </div>
                  <div className="mt-1.5 flex h-2.5 items-center overflow-hidden rounded-full bg-surface">
                    <div className="flex h-full w-1/2 justify-end">
                      {c.effect < 0 && (
                        <div className="h-full rounded-l-full bg-warn" style={{ width: `${width * 2}%` }} />
                      )}
                    </div>
                    <div className="flex h-full w-1/2">
                      {c.effect > 0 && (
                        <div className="h-full rounded-r-full bg-primary" style={{ width: `${width * 2}%` }} />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {prediction.imputed.length > 0 && (
            <p className="mt-5 rounded-xl bg-surface px-4 py-3 text-sm text-muted-foreground">
              Missing or out-of-range values were filled with the dataset median and flagged as not
              measured: <b>{prediction.imputed.join(", ")}</b>. Providing these values makes the
              result more reliable.
            </p>
          )}
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl font-semibold">Extracted symptoms</h2>
          {symptoms.symptoms.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No thyroid-related keywords were found in the symptom description.
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {symptoms.symptoms.map((s) => (
                  <SymptomChip key={s.keyword} s={s} />
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[
                  { k: "Hypo-type", v: symptoms.hypoCount },
                  { k: "Hyper-type", v: symptoms.hyperCount },
                  { k: "General", v: symptoms.neutralCount },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl bg-surface px-3 py-3">
                    <div className="text-2xl font-semibold text-primary">{s.v}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {s.k}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{agreement}</p>

          <h3 className="mt-6 text-base font-semibold">Values you entered</h3>
          <table className="mt-3 w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 font-semibold">Age / Sex</td>
                <td className="py-2 text-right">
                  {input.age ?? "not given"} · {input.sex === "F" ? "Female" : "Male"}
                </td>
              </tr>
              {LAB_KEYS.map((l) => (
                <tr key={l.key} className="border-b border-border">
                  <td className="py-2 font-semibold">
                    {l.label}
                    <span className="ml-2 font-normal text-muted-foreground">({l.ref})</span>
                  </td>
                  <td className="py-2 text-right">
                    {input[l.key] ?? <span className="text-muted-foreground">not measured</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card-surface p-6"><h2 className="text-xl font-semibold">Doctor and testing</h2><ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground"><li>• Arrange a clinician review within 1–2 weeks for a possible abnormal pattern; sooner if symptoms are worsening.</li><li>• Ask about repeat TSH with free T4, and sometimes free T3 or thyroid antibodies.</li><li>• If pregnant or recently postpartum, contact the obstetric or thyroid care team promptly.</li><li>• Once treatment is started or changed, thyroid blood tests are commonly repeated in 4–8 weeks; stable treatment is often checked yearly.</li></ul></div>
        <div className="card-surface p-6"><h2 className="text-xl font-semibold">Food and precautions</h2><ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground"><li>• Eat a balanced diet; no food or supplement can confirm or cure a thyroid disorder.</li><li>• Avoid kelp, seaweed, or high-dose iodine supplements unless a clinician recommends them.</li><li>• Tell the clinician about biotin supplements because they can affect thyroid test results.</li><li>• If taking levothyroxine, take it consistently on an empty stomach and separate calcium or iron by at least 4 hours.</li><li>• Limit caffeine if it worsens palpitations, tremor, or anxiety.</li></ul></div>
        <div className="card-surface p-6"><h2 className="text-xl font-semibold">Get urgent help</h2><ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground"><li>• Seek emergency care for confusion, collapse, very high fever, severe breathing trouble, or a very fast or irregular heartbeat.</li><li>• If taking an antithyroid medicine, fever, mouth ulcers, or a severe sore throat needs urgent medical advice and a blood test.</li><li>• New vision changes, severe eye pain, or marked eye swelling needs urgent assessment.</li></ul></div>
      </section>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </SiteShell>
  );
}
