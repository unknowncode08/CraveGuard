/*
  Minimal Gemini‑Pro helper.
  WARNING: Exposes your key client‑side – for demo only.
*/
const GEMINI_KEY = "AIzaSyC1wlM7BygYivPTog2Qa7tzkmx-aijUPlY";
const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

export async function analyzeFoods(text) {
    /* prompt: ask for calories + macros in JSON */
    const body = {
        contents: [{
            parts: [{
                text:
                    `Return ONLY JSON like {"calories":123,"protein":10,"carbs":20,"fat":5}
      for the serving described: "${text}". If amount is unclear, guess average.`
            }]
        }],
        generationConfig: { maxOutputTokens: 40 }
    };
    const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    try { return JSON.parse(j.candidates[0].content.parts[0].text); }
    catch { throw new Error("Parse fail"); }
}