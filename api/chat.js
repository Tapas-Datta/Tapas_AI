const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

function detectLanguage(message) {
  if (/[\u0980-\u09ff]/.test(message)) return 'bn';
  if (/[\u0900-\u097f]/.test(message)) return 'hi';
  if (/[\u0600-\u06ff]/.test(message)) return 'ar';
  if (/[\u0e00-\u0e7f]/.test(message)) return 'th';
  if (/[\u3040-\u30ff]/.test(message)) return 'ja';
  if (/[\uac00-\ud7af]/.test(message)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(message)) return 'zh';
  return 'en';
}

function asksAboutCreator(message) {
  return /\b(owner|founder|creator|created by|who made|who built)\b|প্রতিষ্ঠাতা|নির্মাতা|মালিক/i.test(message);
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 40) {
      return res.status(400).json({
        error: 'Send between 1 and 40 chat messages.'
      });
    }

    const input = messages.map(({ role, content }) => {
      if (!['user', 'assistant'].includes(role) || typeof content !== 'string') {
        throw new Error('Invalid message format.');
      }
      return { role, content: content.slice(0, 12000) };
    });

    const lastUserMessage =
      [...input].reverse().find(m => m.role === 'user')?.content || '';

    const language = detectLanguage(lastUserMessage);

    if (asksAboutCreator(lastUserMessage)) {
      return res.status(200).json({
        profile: 'owner',
        language
      });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: 'GROQ_API_KEY is not configured in Vercel.'
      });
    }

    const systemPrompt = [
      'You are TD_AI, a helpful and natural conversational assistant.',
      'Mirror the language of the user current message on every turn.',
      'If the user explicitly requests another language, use that language.',
      'Be clear, warm, and direct.',
      'Use everyday wording and short paragraphs.',
      'Avoid unnecessary headings and decorative formatting.',
      'Support multilingual conversations naturally.'
    ].join(' ');

    const upstream = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...input
          ]
        })
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Groq API error:', upstream.status, data?.error?.message);

      return res.status(502).json({
        error: data?.error?.message || 'The Groq request could not be completed.'
      });
    }

    const reply = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      reply: reply || 'No text response was returned.',
      language
    });

  } catch (error) {
    console.error('TD_AI API error:', error);

    return res.status(500).json({
      error: 'The AI request could not be completed.'
    });
  }
}
