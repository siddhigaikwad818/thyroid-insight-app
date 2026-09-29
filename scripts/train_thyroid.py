"""Train a 3-class thyroid screening model on the UCI thyroid-disease dataset.

Sources (UCI ML repository, thyroid-disease):
  allhypo.data  -> hypothyroid diagnoses
  allhyper.data -> hyperthyroid diagnoses
Both files contain the SAME 2800 patient records with different label sets,
so they are merged into a single 3-class target: normal / hypo / hyper.

Outputs JSON artifacts consumed by the web app (no runtime python needed).
"""
import json, math, random
import numpy as np

RAW_COLS = [
    "age","sex","on_thyroxine","query_on_thyroxine","on_antithyroid_medication","sick",
    "pregnant","thyroid_surgery","I131_treatment","query_hypothyroid","query_hyperthyroid",
    "lithium","goitre","tumor","hypopituitary","psych","TSH_measured","TSH","T3_measured","T3",
    "TT4_measured","TT4","T4U_measured","T4U","FTI_measured","FTI","TBG_measured","TBG","referral_source",
]

def read(path):
    rows = []
    for line in open(path):
        line = line.strip()
        if not line:
            continue
        parts = line.split(",")
        label = parts[-1].split(".|")[0].strip()
        rec = dict(zip(RAW_COLS, parts[:-1]))
        rows.append((rec, label))
    return rows

hypo = read("/tmp/allhypo.data")
hyper = read("/tmp/allhyper.data")
assert len(hypo) == len(hyper)

CLASSES = ["normal", "hypothyroid", "hyperthyroid"]

def target(hypo_label, hyper_label):
    if "hypothyroid" in hypo_label:
        return 1
    if hyper_label in ("hyperthyroid", "T3 toxic"):
        return 2
    if hyper_label == "goitre":
        return None  # ambiguous, drop
    return 0

NUM = ["age", "TSH", "T3", "TT4", "T4U", "FTI"]
BIN = ["sex", "on_thyroxine", "on_antithyroid_medication", "pregnant", "thyroid_surgery",
       "query_hypothyroid", "query_hyperthyroid", "goitre", "sick"]

def num(v):
    # handle missing ('?') and impossible values
    try:
        x = float(v)
    except Exception:
        return None
    return x if x > 0 else None

records, ys = [], []
for (r_hypo, l_hypo), (r_hyper, l_hyper) in zip(hypo, hyper):
    y = target(l_hypo, l_hyper)
    if y is None:
        continue
    rec = {}
    ok = True
    for c in NUM:
        v = num(r_hypo[c])
        if c == "age" and v is not None and (v < 1 or v > 100):
            v = None  # dataset contains age=455 style errors
        rec[c] = v
    for c in BIN:
        raw = r_hypo[c]
        rec[c] = 1.0 if raw in ("t", "F") else 0.0  # sex 'F' -> 1
    if all(rec[c] is None for c in ("TSH", "TT4", "FTI")):
        ok = False  # no usable thyroid chemistry at all
    if ok:
        records.append(rec)
        ys.append(y)

y = np.array(ys)
print("rows kept:", len(records), "class counts:", [int((y == i).sum()) for i in range(3)])

# ---- median imputation (fit on data, exported for runtime use) ----
medians = {}
for c in NUM:
    vals = [r[c] for r in records if r[c] is not None]
    medians[c] = float(np.median(vals))
    print(f"  {c}: missing {sum(1 for r in records if r[c] is None)} -> median {medians[c]:.3f}")

FEATURES = []
for c in NUM:
    FEATURES.append(f"log_{c}" if c != "age" else "age")
FEATURES += [f"{c}_missing" for c in ("TSH", "T3", "TT4", "T4U", "FTI")]
FEATURES += BIN


def vectorize(rec, medians):
    row = []
    for c in NUM:
        v = rec[c] if rec[c] is not None else medians[c]
        row.append(v if c == "age" else math.log(v))
    for c in ("TSH", "T3", "TT4", "T4U", "FTI"):
        row.append(1.0 if rec[c] is None else 0.0)
    for c in BIN:
        row.append(rec[c])
    return row

X = np.array([vectorize(r, medians) for r in records], dtype=float)

mean, std = X.mean(0), X.std(0)
std[std == 0] = 1.0
Xs = (X - mean) / std

rng = np.random.default_rng(42)
idx = rng.permutation(len(Xs))
split = int(len(idx) * 0.8)
tr, te = idx[:split], idx[split:]

def fit(Xtr, ytr, epochs=4000, lr=0.25, l2=1e-3):
    n, d = Xtr.shape
    K = 3
    W = np.zeros((d, K)); b = np.zeros(K)
    Y = np.eye(K)[ytr]
    # class weights to counter heavy imbalance
    counts = Y.sum(0)
    cw = (n / (K * counts))
    sw = (Y * cw).sum(1)[:, None]
    for _ in range(epochs):
        z = Xtr @ W + b
        z -= z.max(1, keepdims=True)
        P = np.exp(z); P /= P.sum(1, keepdims=True)
        G = (P - Y) * sw / n
        W -= lr * (Xtr.T @ G + l2 * W)
        b -= lr * G.sum(0)
    return W, b

W, b = fit(Xs[tr], y[tr])

def predict(Xa):
    z = Xa @ W + b
    z -= z.max(1, keepdims=True)
    P = np.exp(z)
    return P / P.sum(1, keepdims=True)

def metrics(Xa, ya):
    P = predict(Xa); pred = P.argmax(1)
    acc = float((pred == ya).mean())
    cm = [[int(((ya == i) & (pred == j)).sum()) for j in range(3)] for i in range(3)]
    per = []
    for i in range(3):
        tp = cm[i][i]; fp = sum(cm[r][i] for r in range(3)) - tp
        fn = sum(cm[i]) - tp
        prec = tp / (tp + fp) if tp + fp else 0.0
        rec = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
        per.append({"label": CLASSES[i], "support": int(sum(cm[i])),
                    "precision": round(prec, 4), "recall": round(rec, 4), "f1": round(f1, 4)})
    macro = round(sum(p["f1"] for p in per) / 3, 4)
    return {"accuracy": round(acc, 4), "macroF1": macro, "confusionMatrix": cm, "perClass": per}

train_m = metrics(Xs[tr], y[tr])
test_m = metrics(Xs[te], y[te])
print("train", train_m["accuracy"], train_m["macroF1"])
print("test ", test_m["accuracy"], test_m["macroF1"], test_m["perClass"])

# 5-fold CV accuracy for the insights page
folds = np.array_split(idx, 5)
cv = []
for k in range(5):
    va = folds[k]; trk = np.concatenate([folds[j] for j in range(5) if j != k])
    Wk, bk = fit(Xs[trk], y[trk])
    W_, b_ = W, b
    W, b = Wk, bk
    cv.append(metrics(Xs[va], y[va])["macroF1"])
    W, b = W_, b_
print("cv macroF1", cv)

model = {
    "classes": CLASSES,
    "features": FEATURES,
    "numeric": NUM,
    "binary": BIN,
    "medians": {k: round(v, 4) for k, v in medians.items()},
    "mean": [round(float(v), 6) for v in mean],
    "std": [round(float(v), 6) for v in std],
    "coef": [[round(float(v), 6) for v in row] for row in W],
    "intercept": [round(float(v), 6) for v in b],
}

# global feature importance = mean abs standardized weight
imp = sorted(
    ({"feature": f, "weight": round(float(np.abs(W[i]).mean()), 4)} for i, f in enumerate(FEATURES)),
    key=lambda d: -d["weight"],
)

insights = {
    "dataset": {
        "name": "UCI Thyroid Disease (allhypo + allhyper, Garavan Institute)",
        "url": "https://archive.ics.uci.edu/dataset/102/thyroid+disease",
        "rawRows": 2800,
        "usedRows": int(len(records)),
        "trainRows": int(len(tr)),
        "testRows": int(len(te)),
        "classCounts": {CLASSES[i]: int((y == i).sum()) for i in range(3)},
        "missingByField": {c: int(sum(1 for r in records if r[c] is None)) for c in NUM},
    },
    "model": {
        "algorithm": "Multinomial logistic regression (softmax), L2 regularised, class-weighted",
        "preprocessing": [
            "Impossible values (age > 100, non-positive lab values) treated as missing",
            "Missing lab values imputed with the training-set median plus a 'was missing' indicator",
            "Lab values log-transformed (skewed distributions), then z-score standardised",
            "Class weights applied because normal cases dominate the dataset",
        ],
        "featureCount": len(FEATURES),
    },
    "train": train_m,
    "test": test_m,
    "crossValidation": {"folds": 5, "macroF1": [round(float(v), 4) for v in cv],
                        "meanMacroF1": round(float(np.mean(cv)), 4)},
    "featureImportance": imp,
}

json.dump(model, open("/dev-server/src/ml/model.json", "w"), indent=1)
json.dump(insights, open("/dev-server/src/ml/insights.json", "w"), indent=1)
print("written")
