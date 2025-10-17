# Unshadow Yourself — /api/compose Edge Function (Vercel)

This tiny project gives you a public URL for your GPT Action.

## What it does
- POST `/api/compose` with your Intake JSON
- Calls OpenAI to write an SSML meditation (hypno-systemic rules)
- Returns `{ ssml, safety: { crisis_flag } }`
- **Stateless**: no database, no PII storage

## 1) Deploy (no custom domain needed)
1. Create a free account at vercel.com and click **Add New → Project**.
2. Choose **Import → From Git Repository** and select your repo that contains these files.
   - If you don't have a repo yet, create one on GitHub and upload these files.
3. In **Settings → Environment Variables**, add:
   - `OPENAI_API_KEY` = your key
   - `OPENAI_MODEL` = `gpt-4o-mini` (or your choice)
4. Deploy. You will get a URL like: `https://YOUR-PROJECT.vercel.app`.

Your Action endpoint will be:
```
https://YOUR-PROJECT.vercel.app/api/compose
```

## 2) Test
```
curl -s https://YOUR-PROJECT.vercel.app/api/compose  -H 'content-type: application/json'  -d '{"intake":{"user":{"language":"en-US"},"session":{"goal":"calm_anxiety","length":1,"voice":"neutral","background":"none","tone":"straight"},"state":{"intensity":50,"body":["chest pressure"]},"cognition":{"rational_response":"I can soften and still be safe."},"parts":{"active":"Watcher","intent":"keep me safe","address":["thank"]},"needs":["safety"],"resources":["warm hand on cheek"]}}}'
```

## 3) Add to your GPT as an Action
- Configure → **Actions** → Add from **file** (OpenAPI YAML). Use the YAML below and replace the `servers` URL with your Vercel URL.
- Save and test the Action in the Builder.
