async function askGemini() {
    const input = document.getElementById("aiInput").value;
    const output = document.getElementById("aiOutput");
    output.textContent = "Thinking...";

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC1wlM7BygYivPTog2Qa7tzkmx-aijUPlY", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: input }] }]
        })
    });

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    output.textContent = reply;
}
