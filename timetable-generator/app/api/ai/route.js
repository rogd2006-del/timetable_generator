import { getSession, unauthorized } from "@/lib/auth";

/**
 * Optional AI assistant for explaining conflicts / suggesting fixes.
 * Only active if AI_API_KEY is configured in the environment. The core
 * timetable generator (lib/timetableGenerator.js) never depends on this
 * route -- it works fully offline.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        success: false,
        message:
          "AI assistant is not configured. Set AI_API_KEY in your environment to enable it.",
      },
      { status: 501 }
    );
  }

  try {
    const { question, context } = await request.json();
    if (!question) {
      return Response.json({ success: false, message: "question is required." }, { status: 400 });
    }

    const prompt = `You are a helpful assistant for a college timetable system. Given this context (conflicts, unscheduled classes, and timetable summary as JSON), answer the administrator's question concisely and practically.\n\nContext:\n${JSON.stringify(
      context || {}
    ).slice(0, 8000)}\n\nQuestion: ${question}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI provider error", text);
      return Response.json(
        { success: false, message: "The AI provider returned an error." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const answer = (data.content || [])
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    return Response.json({ success: true, data: { answer } });
  } catch (err) {
    console.error("AI assistant error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
