# Thyroid Companion AI

Create a complete, working web application for my AIH (Artificial Intelligence in Healthcare) college project called "ThyroCare AI".

Problem Statement:

Thyroid disorders can be difficult to identify from symptoms and clinical test values alone. Our project aims to use historical thyroid patient data to identify patterns and provide an early screening result for a user based on their symptoms and medical parameters.

Solution:

Build a web application where the user can enter basic patient information, thyroid test values, and symptoms. The application should use a machine learning model trained on historical thyroid-related data to predict whether the entered data shows a pattern of:

- Normal

- Possible Hypothyroidism

- Possible Hyperthyroidism

The application should also analyze the user's symptom description and extract important keywords related to the symptoms.

Show the prediction clearly along with the probability/confidence, important extracted symptoms/keywords, and a simple explanation of why the model produced that result.

The application should have:

1. Home page explaining the project.

2. Patient input form for thyroid values and symptoms.

3. AI prediction/result page.

4. Model/data insights page showing how the model performs.

5. Clean, modern and simple healthcare-style UI.

Use a publicly available historical thyroid dataset for training the model and handle missing/incorrect data properly.

The result must clearly state that this is an educational screening tool and NOT a medical diagnosis, and users should consult a qualified doctor for actual diagnosis.

Make the entire application functional and ready to run locally. Do not leave placeholders or unfinished features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1e43c99b-e8b1-5ebe-8910-62d0c363d52e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
