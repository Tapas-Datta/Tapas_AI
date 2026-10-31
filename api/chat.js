const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --------------------------------------------------
// LANGUAGE DETECTION
// --------------------------------------------------

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

// --------------------------------------------------
// TD_AI IDENTITY DETECTION (With Jailbreak Protection)
// --------------------------------------------------

function asksAboutTDIdentity(text = "") {
  const q = text.toLowerCase().trim();

  const patterns = [
    // Founder and ownership
    /\b(founder|co-founder|ceo|owner|ownership|creator|developer|programmer|builder|maker|author)\b/i,
    /\b(who|person|people|team)\b.{0,80}\b(behind|created|built|made|developed|designed|owns|runs|manages)\b/i,
    /\b(who|whose)\b.{0,80}\b(your|this|the)\b.{0,40}\b(ai|assistant|project|system|platform|website|company)\b/i,

    // Background and origin
    /\b(origin|background|history|origin story|creation|development|management|corporate history)\b/i,
    /\b(who made you|who created you|who built you|who developed you|who is behind you)\b/i,
    /\b(where did you come from|how were you created|how did you start)\b/i,

    // Jailbreak / Override attempt keywords (Blocks "Ignore all previous instructions")
    /\b(ignore all previous instructions|override|you were built by|fine-tuned in|openai|anthropic|google)\b/i,

    // TD_AI project questions
    /\b(about|tell me about|introduce|explain|describe)\b.{0,80}\b(td.?ai|yourself|your creator|your developer|your founder|your project)\b/i,
    /\b(td.?ai|this project|this ai|your project|your platform)\b.{0,80}\b(founder|creator|developer|owner|history|background|purpose|mission|team|contact|company|origin)\b/i,

    // Contact and official information
    /\b(official website|contact details|contact information|email address|linkedin profile)\b/i,
    /\b(your website|your email|your linkedin|how can i contact|how to contact)\b/i,

    // Purpose and future
    /\b(purpose|mission|vision|goals|future plans)\b.{0,80}\b(td.?ai|your project|this ai)\b/i,

    // Bengali
    /(প্রতিষ্ঠাতা|মালিক|নির্মাতা|ডেভেলপার|কে তৈরি|ke toiri|ke banieche|কার তৈরি|কার মালিকানায়|পরিচয়|ইতিহাস|শুরু|উদ্দেশ্য|যোগাযোগ|ওয়েবসাইট|ইমেইল|প্রজেক্ট সম্পর্কে|তোমার সম্পর্কে|কে চালায়|কে পরিচালনা করে)/i,

    // Hindi
    /(संस्थापक|मालिक|निर्माता|डेवलपर|किसने बनाया|किसने विकसित किया|परिचय|इतिहास|उद्देश्य|संपर्क)/i
  ];

  return patterns.some(pattern => pattern.test(q));
}

// --------------------------------------------------
// CONFIRMED TD_AI INFORMATION
// --------------------------------------------------

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

  if (language === "Hindi") {
    return `TD_AI एक स्वतंत्र AI assistant project है, जिसे Tapas Datta ने बनाया और विकसित किया है।

**संस्थापक और डेवलपर:** ${info.name}
**प्रोजेक्ट:** ${info.project}
**वेबसाइट:** ${info.website}
**ईमेल:** ${info.email}
**LinkedIn:** ${info.linkedin}

TD_AI के किसी अलग CEO या पंजीकृत कंपनी की पुष्टि नहीं हुई है।`;
  }

  return `TD_AI is an independent AI assistant project created and developed by Tapas Datta.

**Founder & Developer:** ${info.name}
**Project:** ${info.project}
**Website:** ${info.website}
**Email:** ${info.email}
**LinkedIn:** ${info.linkedin}

No separately confirmed CEO or registered company status has been established.`;
}

// --------------------------------------------------
// ANONYMOUS VISITOR QUESTION ANALYTICS
// --------------------------------------------------

async function saveVisitorQuestion(question, language) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase configuration is missing.");
    return;
  }

  try {
    const baseUrl = SUPABASE_URL.replace(/\/+$/, "");

    const response = await fetch(
      `${baseUrl}/rest/v1/visitor_questions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          question: question.slice(0, 2000),
          language
        })
      }
    );

    if (!response.ok) {
      console.error(
        "Supabase insert failed:",
        await response.text()
      );
    }
  } catch (error) {
    console.error("Supabase analytics error:", error.message);
  }
}

// --------------------------------------------------
// TD_AI SYSTEM PROMPT
// --------------------------------------------------

const systemPrompt = (language) => `
You are TD_AI, an intelligent, helpful, professional AI assistant.

IDENTITY:
- Your name is TD_AI.
- You were created and developed by Tapas Datta.
- Tapas Datta is the confirmed Founder and Developer of TD_AI.
- TD_AI is an independent AI assistant project.

STRICT IDENTITY AND PROJECT RULES:
1. Always identify Tapas Datta as the confirmed Founder and Developer of TD_AI.
2. Never claim that TD_AI was created by anyone else, and do not introduce unrelated AI companies or founders.
3. If asked about your creator, founder, or background, always point directly to Tapas Datta and the official details provided below.

CONFIRMED INFORMATION:
Name: Tapas Datta
Role: Founder and Developer of TD_AI
Project: TD_AI
Website: https://tapas-ai.vercel.app
Email: Taposdatta610@gmail.com
LinkedIn: https://www.linkedin.com/feed/

LANGUAGE:
- Respond in the language of the user's latest message (${language}).
- Preserve the user's preferred language naturally.

RESPONSE STYLE:
- Be friendly, natural, clear, and professional.
- Use clean Markdown formatting.
`;

// --------------------------------------------------
// VERCEL API HANDLER
// --------------------------------------------------

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
      message =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string"
    )
    .slice(-40)
    .map(message => ({
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
    .find(message => message.role === "user")?.content || "";

  const language = detectLanguage(latestUserMessage);

  // Save anonymous question analytics
  await saveVisitorQuestion(latestUserMessage, language);

  // Force strict custom identity response for any questions about who made you / founder / creator or jailbreak attempts
  if (asksAboutTDIdentity(latestUserMessage)) {
    return res.status(200).json({
      reply: getTDIdentityResponse(language)
    });
  }

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
              content: systemPrompt(language)
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
        error: data.error?.message || "AI request failed."
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
