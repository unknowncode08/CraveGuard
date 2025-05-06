/*
  Minimal Gemini‑Pro helper.
  WARNING: Exposes your key client‑side – for demo only.
*/
const GEMINI_KEY = "AIzaSyC1wlM7BygYivPTog2Qa7tzkmx-aijUPlY";
const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

export async function askGemini(prompt) {
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 120 }
    };

    const r = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!r.ok) throw new Error("Gemini API error");
    const data = await r.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}
