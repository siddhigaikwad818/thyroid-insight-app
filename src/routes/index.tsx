import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, Disclaimer } from "@/components/site-shell";
import insights from "@/ml/insights.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ThyroCare AI — Thyroid screening pattern analysis" },
      {
        name: "description",
        content:
          "ThyroCare AI is an educational AI in Healthcare project that screens thyroid test values and symptom text for hypothyroid or hyperthyroid patterns.",
      },
      { property: "og:title", content: "ThyroCare AI — Thyroid screening pattern analysis" },
      {
        property: "og:description",
        content:
          "An educational machine-learning screening demo trained on the public UCI Thyroid Disease dataset.",
      },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  {
    title: "Enter patient details",
    body: "Age, sex, medication and thyroid function values (TSH, T3, TT4, T4U, FTI). Unknown values can be left blank.",
  },
  {
    title: "Describe the symptoms",
    body: "Write the complaints in plain language. A clinical keyword layer pulls out the thyroid-relevant symptoms and notes negations such as \"no weight gain\".",
  },
  {
    title: "Read the pattern",
    body: "The model returns a class with its probability, the values that pushed the result, and whether the described symptoms agree with the lab pattern.",
  },
];

export default function HomePage() {
  const ds = insights.dataset;
  const test = insights.test;
  return (
    <SiteShell>
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <span className="chip">AI in Healthcare · College project</span>
          <h1 className="mt-5 text-4xl leading-[1.08] font-semibold sm:text-5xl">
            Early thyroid screening from lab values and symptom text.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Thyroid disorders are hard to spot from symptoms alone, and lab reports are hard to read
            without training. ThyroCare AI learns from {ds.usedRows.toLocaleString()} historical
            patient records and flags whether a new set of values looks <b>normal</b>,{" "}
            <b>possibly hypothyroid</b>, or <b>possibly hyperthyroid</b> — with the reasoning shown.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/screening" className="btn-primary">
              Start a screening
            </Link>
            <Link to="/insights" className="btn-ghost">
              See how the model performs
            </Link>
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-lg font-semibold">Model at a glance</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {[
              { k: "Test accuracy", v: `${(test.accuracy * 100).toFixed(1)}%` },
              { k: "Macro F1", v: test.macroF1.toFixed(3) },
              { k: "Patient records", v: ds.usedRows.toLocaleString() },
              { k: "Classes", v: "3" },
            ].map((m) => (
              <div key={m.k} className="rounded-xl bg-surface px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.k}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-primary">{m.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            Softmax (multinomial logistic) regression with class weighting, trained offline on the
            UCI Garavan Institute thyroid records and shipped with the app, so screening runs
            instantly and offline.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <article key={s.title} className="card-surface p-5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent/30 font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold">Problem statement</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Hypothyroidism and hyperthyroidism share vague symptoms — fatigue, weight change, mood
            change — and their blood panels interact in non-obvious ways. Screening delays are
            common. This project asks whether historical thyroid patient data can surface those
            patterns early enough to prompt a proper clinical review.
          </p>
        </div>
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold">Dataset</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {ds.name}: {ds.rawRows.toLocaleString()} raw records. Rows with impossible ages, missing
            lab chemistry or ambiguous labels are cleaned or dropped, leaving{" "}
            {ds.usedRows.toLocaleString()} usable patients.
          </p>
          <a
            href={ds.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-semibold text-primary underline underline-offset-4"
          >
            UCI Thyroid Disease dataset
          </a>
        </div>
      </section>

      <div className="mt-10">
        <Disclaimer />
      </div>
    </SiteShell>
  );
}
