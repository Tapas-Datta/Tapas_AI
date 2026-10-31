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
// TD_AI IDENTITY DETECTION
// --------------------------------------------------

function asksAboutTDIdentity(text = "") {
  const q = text.toLowerCase().trim();

  const patterns = [
    // Founder and ownership
    /\b(founder|co-founder|ceo|owner|ownership|creator|developer|programmer|builder|maker|author)\b/i,
    /\b(who|person|people|team)\b.{0,80}\b(behind|created|built|made|developed|designed|owns|runs|manages)\b/i,
    /\b(who|whose)\b.{0,80}\b(your|this|the)\b.{0,40}\b(ai|assistant|project|system|platform|website|company)\b/i,

    // Background and origin
    /\b(origin|background|history|origin story|creation|development|management)\b/i,
    /\b(who made you|who created you|who built you|who developed you|who is behind you)\b/i,
    /\b(where did you come from|how were you created|how did you start)\b/i,

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
**LinkedIn:** ${info.