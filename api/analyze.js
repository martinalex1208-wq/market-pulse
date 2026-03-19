export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional macro financial analyst."
          },
          {
            role: "user",
            content: `Analyze the following market text.

Return ONLY JSON:

{
  "direction": "Bullish | Bearish | Neutral",
  "confidence": number (0-100),
  "reason": "short explanation",
  "action": ["3 short actionable suggestions for traders"]
}

Text:
${text}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || "OpenAI API error" });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No response from AI" });
    }

    const parsed = JSON.parse(content);
    res.status(200).json({
      direction: parsed.direction || "Neutral",
      confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(0, parsed.confidence)) : 50,
      reason: parsed.reason || "",
      action: Array.isArray(parsed.action) ? parsed.action : []
    });

  } catch (err) {
    res.status(500).json({ error: "AI analysis failed" });
  }
}
