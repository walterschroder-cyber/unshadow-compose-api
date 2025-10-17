ts

export const runtime = 'edge';

type Intake = {
  user: { name?: string; language: 'en-US' | 'de-DE'; pronouns?: string };
  session: { goal: 'calm_anxiety' | 'sleep'; length: 1 | 3 | 5; voice: 'male'|'female'|'neutral'; background: 'none'|'music'|'rain'|'ocean'; tone: 'straight'|'warm'|'light-spiritual' };
  state: { intensity: number; body: string[]; sleep_edge_jolt?: boolean };
  cognition: { auto_thought?: string; rational_response?: string; distortions?: string[] };
  parts: { active: string; intent: string; address: string[]; avatar?: { style?: string; traits?: string[]; scene?: string; url?: string } };
  needs: string[];
  resources: string[];
  closing?: 'sleep_anchor' | 'gratitude' | 'future_self' | 'action_cue';
};

type ReqBody = { intake: Intake; audio?: boolean };

const SYS_PROMPT = `You are a clinical-safety-aware meditation writer using a hypno-systemic, Ericksonian tone (permissive, utilization, parts-friendly, secular-safe).
Rules:
- Language from input (en-US or de-DE).
- Output strictly SSML between <speak>…</speak>. No text outside SSML.
- Duration target = input.session.length minutes (±20%).
- Module order by session.goal:
  - calm_anxiety: grounding → body scan → parts dialogue → cognitive reframe → anchor.
  - sleep: exhale-first → body heaviness → parts time-bound rest → soft reframe → sleep anchor.
- Use EXACT strings from input where provided (e.g., rational_response, parts.active, parts.intent). Do not paraphrase those exact strings.
- Integrate resources imagery and background cues.
- SSML pacing: <break time="400-900ms"/>, <prosody rate="slow"> for sleep.
- If intensity >= 80: shorter sentences, longer pauses.
- Avoid medical claims or trauma processing. This is wellness.
- If crisis/self-harm/violence risk appears, DO NOT generate—return nothing (the API layer will handle crisis_flag).
Style: non-directive wording ("you might notice…"), positive intent of parts; thank and time-bound renegotiation.`;

const EN_CRISES = [
  /suicide|kill myself|end my life|self[-\s]?harm|hurt myself/i,
  /harm others|kill (him|her|them|someone)|violence/i
];
const DE_CRISES = [
  /selbstmord|suizid|mich\s*töten|mein\s*leben\s*beenden|selbstverletz/i,
  /anderen\s*schaden|jemanden\s*töten|gewalt/i
];

function crisisDetected(text: string, lang: 'en-US'|'de-DE') {
  const arr = lang === 'de-DE' ? DE_CRISES : EN_CRISES;
  return arr.some(rx => rx.test(text));
}

function json<T=any>(obj: T, status=200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body?.intake) return json({ error: 'Missing intake' }, 400);

  const { intake, audio=false } = body;
  const lang = intake.user?.language ?? 'en-US';

  const textBlob = [
    intake.cognition?.auto_thought, intake.cognition?.rational_response,
    intake.parts?.active, intake.parts?.intent, ...(intake.needs||[]), ...(intake.resources||[])
  ].filter(Boolean).join(' ');
  if (crisisDetected(textBlob, lang)) {
    return json({ ssml: '', safety: { crisis_flag: true } });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) return json({ error: 'Missing OPENAI_API_KEY' }, 500);

  const userPrompt = `INTAKE JSON:\n${JSON.stringify(intake)}`;
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model, temperature: 0.7,
      messages: [
        { role: 'system', content: SYS_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!openaiRes.ok) {
    const txt = await openaiRes.text();
    return json({ error: 'LLM error', details: txt }, 502);
  }
  const data = await openaiRes.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';
  const ssml = content.includes('<speak') ? content.trim() : `<speak>${content}</speak>`;

  return json({ ssml, audioUrl: null, safety: { crisis_flag: false } });
}
