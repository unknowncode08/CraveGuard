function formatAIResponse(text) {
    // Basic formatting: bold, newlines, etc.
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')         // Bold **text**
        .replace(/\*(.*?)\*/g, '<em>$1</em>')                     // Italic *text*
        .replace(/\n/g, '<br>');                                  // New lines
}

async function askGemini() {
    const input = document.getElementById("aiInput").value.trim();
    const output = document.getElementById("aiOutput");

    if (!input) {
        output.innerHTML = "Please enter a question.";
        return;
    }

    output.innerHTML = "CraveGuard AI is thinking... 🤔";

    const prompt = `
  You are CraveGuard AI, a friendly, expert virtual health coach integrated into a mobile app called CraveGuard. Your job is to help users lose fat, improve their nutrition, beat cravings, and stay consistent with their health goals. 
  
  Always respond in a supportive, motivating tone like a personal trainer who understands the user's struggles. Use simple language, clear advice, and suggest specific actions when possible.
  
  Assume the user may be struggling with:
  - cravings
  - poor eating habits
  - motivation or discipline
  - confusion around healthy food
  
  Now answer this: "${input}"
  `;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyC1wlM7BygYivPTog2Qa7tzkmx-aijUPlY", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response. Try again.";
    output.innerHTML = formatAIResponse(reply);
}
