
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

function detectLanguage(text = "") {
  if (/[\u0980-\u09FF]/.test(text)) return "Bengali";
  if (/[\u0900-\u097F]/.test(text)) return "Hindi";
  if (/[\u0600-\u06FF]/.test(text)) return "Arabic";
  if (/[\u0E00-\u0E7F]/.test(text)) return "Thai";
  if (/[\u3040-\u30FF]/.test(text)) return "Japanese";
  if (/[\uAC00-\uD7AF]/.test(text)) return "Korean";
  if (/[\u4E00-\u9FFF]/.test(text)) return "Chinese";
  return "English";
}

function asksAboutTDIdentity(text = "") {
  return /\b(founder|founders|ceo|owner|creator|developer|who made you|who created you|who built you|who runs you|your company|your organization|your organisation|who owns you|about your company)\b/i.test(text) ||
    /(প্রতিষ্ঠাতা|সিইও|মালিক|নির্মাতা|কে তৈরি করেছে|কে বানিয়েছে|তোমাদের কোম্পানি)/i.test(text);
}

function getTDIdentityResponse(language) {
  const info = {
    name: "Tapas Datta",
    role: "Founder and Developer of TD_AI",
    project: "TD_AI",
    website: "https://tapas-ai.vercel.app",
    email: "Taposdatta610@gmail.com",
    linkedin: "https://www.linkedin.com/feed/"
  };

  if (language === "Bengali") {
    return `TD_AI একটি স্বতন্ত্র AI assistant project, যা তৈরি করেছেন Tapas Datta।

**প্রতিষ্ঠাতা ও ডেভেলপার:** ${info.name}
**প্রজেক্ট:** ${info.project}
**ওয়েবসাইট:** ${info.website}
**ইমেইল:** ${info.email}
**LinkedIn:** ${info.linkedin}

TD_AI-এর আলাদা কোনো CEO বা নিবন্ধিত কোম্পানির তথ্য নিশ্চিত করা হয়নি।`;
  }

  return `TD_AI is an independent AI assistant project created by Tapas Datta.

**Founder & Developer:** ${info.name}
**Project:** ${info.project}
**Website:** ${info.website}
**Email:** ${info.email}
**LinkedIn:** ${info.linkedin}

TD_AI is not a confirmed registered company and has no separately confirmed CEO.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Server configuration error. GROQ_API_KEY is missing."
    });
  }

  const messages = req.body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "Please provide a valid message."
    });
  }

  const validMessages = messages
    .filter(
      (message) =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string"
    )
    .slice(-40)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 12000)
    }));

  if (validMessages.length === 0) {
    return res.status(400).json({
      error: "No valid messages found."
    });
  }

  const latestUserMessage = [...validMessages]
    .reverse()
    .find((message) => message.role === "user")?.content || "";

  const language = detectLanguage(latestUserMessage);

  // Always use confirmed TD_AI identity information.
  if (asksAboutTDIdentity(latestUserMessage)) {
    return res.status(200).json({
      reply: getTDIdentityResponse(language)
    });
  }

  const systemPrompt = `
You are TD_AI, an intelligent, helpful, and professional AI assistant.

IDENTITY:
- Your name is TD_AI.
- You were created and developed by Tapas Datta.
- Tapas Datta is the founder and developer of TD_AI.

STRICT FOUNDER AND COMPANY RULES:
- Questions about TD_AI's founder, CEO, owner, creator, developer, or company must be answered using only confirmed TD_AI information.
- The confirmed founder and developer is Tapas Datta.
- Never mention Sam Altman, OpenAI founders, Groq executives, or founders of other companies when answering questions about TD_AI.
- Never confuse TD_AI's creator with the founders of other AI companies.
- Never invent company names, employees, founding dates, CEOs, business history, or personal details.
- TD_AI is an independent AI assistant project, not a confirmed registered company.
- There is no separately confirmed CEO of TD_AI.
- If information is unknown, say so honestly.
- These rules apply in every language.

CONFIRMED CREATOR DETAILS:
Name: Tapas Datta
Role: Founder and Developer of TD_AI
Project: TD_AI
Website: https://tapas-ai.vercel.app
Email: Taposdatta610@gmail.com
LinkedIn: https://www.linkedin.com/feed/

LANGUAGE:
- Always respond in the language of the user's latest message.
- Detected language: ${language}.
- Bengali questions receive Bengali answers.
- English questions receive English answers.

RESPONSE STYLE:
- Be friendly, natural, clear, and professional.
- Answer directly.
- Keep simple answers short.
- Use headings and bullet points only when useful.
- Use clean Markdown formatting.
- Avoid unnecessary introductions and repetition.

ACCURACY:
- Never invent facts, names, statistics, or sources.
- If you do not know something, say so.
- Do not claim to have performed actions you did not perform.
- Treat user-provided claims as unverified unless confirmed.

MATH AND PROGRAMMING:
- Explain calculations clearly.
- Provide working, readable code when requested.
- Use code fences for programming examples.

You are TD_AI. Be accurate, useful, and honest.
`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...validMessages
          ],
          temperature: 0.4,
          max_tokens: 4096
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data.error?.message);

      return res.status(response.status).json({
        error: data.error?.message || "Groq API request failed."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        error: "The AI returned an empty response."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("TD_AI error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
