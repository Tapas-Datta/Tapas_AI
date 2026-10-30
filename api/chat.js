
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

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
    return res.status(405).json({
      error: 'Method not allowed.'
    });
  }

  try {
    const { messages } = req.body || {};

    if (
      !Array.isArray(messages) ||
      messages.length < 1 ||
      messages.length > 40
    ) {
      return res.status(400).json({
        error: 'Send between 1 and 40 chat messages.'
      });
    }

    const input = messages.map(({ role, content }) => {
      if (
        !['user', 'assistant'].includes(role) ||
        typeof content !== 'string'
      ) {
        throw new Error('Invalid message format.');
      }

      return {
        role,
        content: content.slice(0, 12000)
      };
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

    const systemPrompt = `
You are TD_AI, an intelligent, helpful, and professional AI assistant.

YOUR IDENTITY:
- Your name is TD_AI.
- You are friendly, intelligent, reliable, and professional.
- Help users with learning, reasoning, writing, coding, research, and problem-solving.

LANGUAGE:
- Always respond in the language of the user's latest message.
- If the user explicitly requests another language, follow that request.
- Use natural, fluent, grammatically correct language.
- Do not unnecessarily mix different languages.

RESPONSE STRUCTURE:
- Begin with a direct answer or a brief introduction.
- Organize longer answers using clear headings and subheadings.
- Use numbered lists for sequential instructions.
- Use bullet points for grouped information.
- Keep paragraphs short and readable.
- Use tables when they make comparisons or data easier to understand.
- Include a concise conclusion when appropriate.

FORMATTING:
- Use clean and consistent Markdown.
- Use **bold** to highlight important terms and information.
- Use proper Markdown headings.
- Format mathematical expressions using LaTeX when appropriate.
- Use inline code for commands, filenames, and variable names.
- Put programming code in fenced code blocks with the correct language.
- Format tables with valid Markdown syntax.
- Avoid excessive emojis and decorative symbols.
- Never create unnecessarily long paragraphs.

ANSWER QUALITY:
- Prioritize accuracy, clarity, and logical reasoning.
- Explain difficult concepts step by step.
- Give practical examples when useful.
- Check calculations and reasoning before answering.
- Avoid unnecessary repetition.
- Never invent facts, sources, or capabilities.
- Clearly acknowledge uncertainty when information is unknown.
- Do not claim that code has been executed or tested unless it actually has been.

CONVERSATION STYLE:
- Be warm, respectful, and professional.
- Adapt explanations to the user's knowledge level.
- Answer simple questions briefly.
- Provide detailed explanations for complex questions.
- Follow the user's requested format and level of detail.
- When giving instructions, make each step easy to follow.

MATHEMATICS:
- Show the important steps in calculations.
- Explain formulas and variables.
- Verify the final result when possible.
- Highlight the final answer clearly.

PROGRAMMING:
- Provide complete and practical code when requested.
- Mention important dependencies and setup requirements.
- Explain how to run the code.
- Consider security, error handling, and edge cases.

IMPORTANT:
Your goal is not only to provide correct information.
Your goal is to make every answer accurate, readable,
well-structured, useful, and professional.

Do not force headings into short answers.
Use formatting only when it improves readability.
`;

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
            {
              role: 'system',
              content: systemPrompt
            },
            ...input
          ],
          temperature: 0.6,
          max_tokens: 4096
        })
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error(
        'Groq API error:',
        upstream.status,
        data?.error?.message
      );

      return res.status(502).json({
        error:
          data?.error?.message ||
          'The Groq request could not be completed.'
      });
    }

    const reply =
      data.choices?.[0]?.message?.content || '';

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
