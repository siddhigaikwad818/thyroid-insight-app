<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules

- The thyroid model is trained offline by `scripts/train_thyroid.py` (UCI thyroid dataset) and shipped as `src/ml/model.json` + `src/ml/insights.json`; inference runs client-side in `src/ml/predict.ts` so no server or Python runtime is needed at request time. Re-run the script to retrain and regenerate both artifacts.
- Screening results are passed between the form and the result page through `sessionStorage` (`src/lib/screening-session.ts`); no patient data is sent anywhere or persisted.

## Authentication

- Email/password authentication uses Lovable Cloud without a profiles table; screening records remain temporary in sessionStorage.
