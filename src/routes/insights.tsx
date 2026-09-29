import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, Disclaimer } from "@/components/site-shell";
import insights from "@/ml/insights.json";
import { CLASS_LABELS, type ClassName } from "@/ml/predict";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Model & data insights — ThyroCare AI" },
      {
        name: "description",
        content:
          "Accuracy, macro F1, confusion matrix, cross-validation scores, feature importance and data-cleaning steps for the ThyroCare AI thyroid screening model.",
      },
      { property: "og:title", content: "Model & data insights — ThyroCare AI" },
      {
        property: "og:description",
        content:
          "How the ThyroCare AI thyroid model was trained on the UCI thyroid dataset and how well it performs.",
      },
    ],
  }),
  component: InsightsPage,
});

const CLASS_ORDER: ClassName[] = ["normal", "hypothyroid", "hyperthyroid"];

const FEATURE_LABELS: Record<string, string> = {
  age: "Age",
  log_TSH: "TSH (log)",
  log_T3: "T3 (log)",
  log_TT4: "TT4 (log)",
  log_T4U: "T4U (log)",
  log_FTI: "FTI (log)",
  TSH_missing: "TSH not measured",
  T3_missing: "T3 not measured",
  TT4_missing: "TT4 not measured",
  T4U_missing: "T4U not measured",
  FTI_missing: "FTI not measured",
  sex: "Sex (female)",
  on_thyroxine: "On thyroxine",
  on_antithyroid_medication: "On antithyroid medication",
  pregnant: "Pregnant",
  thyroid_surgery: "Thyroid surgery",
  query_hypothyroid: "Suspected hypothyroid",
  query_hyperthyroid: "Suspected hyperthyroid",
  goitre: "Goitre",
  sick: "Currently unwell",
};

export default function InsightsPage() {
  const { dataset, model, train, test, crossValidation, featureImportance } = insights;
  const maxImportance = featureImportance[0]?.weight ?? 1;
  const totalPatients = Object.values(dataset.classCounts).reduce((a, b) => a + b, 0);

  return (
    <SiteShell>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Model &amp; data insights</h1>
        <p className="mt-3 text-muted-foreground">
          Everything below is produced by the actual training run that generated the model shipped
          with this app — the same numbers you can quote in the project report.
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Test accuracy", v: `${(test.accuracy * 100).toFixed(1)}%` },
          { k: "Test macro F1", v: test.macroF1.toFixed(3) },
          { k: "Train accuracy", v: `${(train.accuracy * 100).toFixed(1)}%` },
          { k: "5-fold mean macro F1", v: crossValidation.meanMacroF1.toFixed(3) },
        ].map((m) => (
          <div key={m.k} className="card-surface p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {m.k}
            </div>
            <div className="mt-2 text-3xl font-semibold text-primary">{m.v}</div>
          </div>
        ))}
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold">Dataset</h2>
          <p className="mt-2 text-sm text-muted-foreground">{dataset.name}</p>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {[
                ["Raw records downloaded", dataset.rawRows.toLocaleString()],
                ["Usable after cleaning", dataset.usedRows.toLocaleString()],
                ["Training rows (80%)", dataset.trainRows.toLocaleString()],
                ["Held-out test rows (20%)", dataset.testRows.toLocaleString()],
                ["Features used", String(model.featureCount)],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-border">
                  <td className="py-2 font-semibold">{k}</td>
                  <td className="py-2 text-right">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="mt-6 text-base font-semibold">Class balance</h3>
          <div className="mt-3 space-y-3">
            {CLASS_ORDER.map((cls) => {
              const n = (dataset.classCounts as Record<string, number>)[cls] ?? 0;
              return (
                <div key={cls}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{CLASS_LABELS[cls]}</span>
                    <span>
                      {n} ({((n / totalPatients) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(n / totalPatients) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Healthy records dominate, so class weights are applied during training — otherwise the
            model would score well simply by calling everybody normal.
          </p>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold">Handling missing &amp; incorrect data</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {model.preprocessing.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
          <h3 className="mt-6 text-base font-semibold">Missing values per field (after cleaning)</h3>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {Object.entries(dataset.missingByField).map(([field, count]) => (
                <tr key={field} className="border-b border-border">
                  <td className="py-2 font-semibold">{field}</td>
                  <td className="py-2 text-right">
                    {count} of {dataset.usedRows} ({((count / dataset.usedRows) * 100).toFixed(1)}%)
                    — median {(model as never) && (insights as never) ? "" : ""}
                    {(insights.model as never) ? "" : ""}
                    {String((insights as unknown as { medians?: never }).medians ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-muted-foreground">
            Algorithm: {model.algorithm}.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold">Per-class performance (held-out test set)</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Class</th>
                <th className="py-2 text-right">Precision</th>
                <th className="py-2 text-right">Recall</th>
                <th className="py-2 text-right">F1</th>
                <th className="py-2 text-right">Support</th>
              </tr>
            </thead>
            <tbody>
              {test.perClass.map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <td className="py-2 font-semibold">{CLASS_LABELS[row.label as ClassName]}</td>
                  <td className="py-2 text-right">{row.precision.toFixed(2)}</td>
                  <td className="py-2 text-right">{row.recall.toFixed(2)}</td>
                  <td className="py-2 text-right">{row.f1.toFixed(2)}</td>
                  <td className="py-2 text-right">{row.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-muted-foreground">
            Recall matters most for a screening tool: missing a real thyroid case is worse than
            flagging a healthy person for a confirmatory test. The hyperthyroid class has few
            examples, so its precision is the weakest point of the model.
          </p>

          <h3 className="mt-6 text-base font-semibold">Confusion matrix (test set)</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left">Actual ↓ / Predicted →</th>
                  {CLASS_ORDER.map((c) => (
                    <th key={c} className="py-2 text-right">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {test.confusionMatrix.map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-2 font-semibold">{CLASS_ORDER[i]}</td>
                    {row.map((v, j) => (
                      <td
                        key={j}
                        className={`py-2 text-right ${i === j ? "font-semibold text-primary" : ""}`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold">Which inputs matter most</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Mean absolute standardised weight across the three classes — a larger bar means the
            feature moves the prediction more.
          </p>
          <ul className="mt-5 space-y-2.5">
            {featureImportance.slice(0, 12).map((f) => (
              <li key={f.feature}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
                  <span className="text-muted-foreground">{f.weight.toFixed(2)}</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(f.weight / maxImportance) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-base font-semibold">5-fold cross-validation (macro F1)</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {crossValidation.macroF1.map((v, i) => (
              <span key={i} className="chip">
                Fold {i + 1}: {v.toFixed(3)}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Scores stay close across folds, so the model is stable rather than lucky on one split.
          </p>
        </div>
      </section>

      <section className="card-surface mt-6 p-6">
        <h2 className="text-xl font-semibold">Known limitations</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            • The data comes from 1980s Garavan Institute referrals, so it does not represent every
            population or modern assay units.
          </li>
          <li>
            • Labels are historical clinical diagnoses, which themselves carry noise.
          </li>
          <li>
            • The symptom layer is a curated keyword lexicon, not a trained language model; unusual
            phrasing may be missed.
          </li>
          <li>
            • Only 70 hyperthyroid patients exist in the usable data, which limits how reliably that
            class can be detected.
          </li>
        </ul>
        <Link to="/screening" className="btn-primary mt-6">
          Try the screening form
        </Link>
      </section>

      <div className="mt-6">
        <Disclaimer />
      </div>
    </SiteShell>
  );
}
