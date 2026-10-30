import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('public');
const port = Number(process.env.PORT || 3000);
// Read local .env values without adding a dependency. The file is never served to browsers.
try {
  const envText = await readFile(resolve('.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {}
const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

function detectLanguage(message) {
  const text = message.trim().toLowerCase();
  if (/^(hi|hii|hiii)$/.test(text)) return null;
  if (/[\u0980-\u09ff]/.test(text)) return 'bn';
  if (/[\u0e00-\u0e7f]/.test(text)) return 'th';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u0590-\u05ff]/.test(text)) return 'he';
  if (/[\u0400-\u04ff]/.test(text)) return /[іїєґ]/i.test(text) ? 'uk' : 'ru';
  if (/[\u0370-\u03ff]/.test(text)) return 'el';
  if (/[\u0900-\u097f]/.test(text)) return 'hi';
  if (/[\u0b80-\u0bff]/.test(text)) return 'ta';
  if (/[\u0c00-\u0c7f]/.test(text)) return 'te';
  if (/[\u0a00-\u0a7f]/.test(text)) return 'pa';
  if (/[\u0600-\u06ff]/.test(text)) {
    if (['آپ', 'ہے', 'ہیں', 'کیا', 'میں', 'اور'].some(word => text.includes(word))) return 'ur';
    if (['من', 'این', 'است', 'برای', 'شما'].some(word => text.includes(word))) return 'fa';
    return 'ar';
  }
  const groups = [
    ['es', /\b(hola|buenos|buenas|gracias|quiero|puedes|ayuda|qué|como|cómo|fundador|creador)\b/],
    ['fr', /\b(bonjour|salut|merci|comment|pourquoi|vous|avec|créateur|fondateur|est-ce)\b/],
    ['de', /\b(hallo|guten|danke|bitte|ich|und|der|die|das|ist|gründer)\b/],
    ['it', /\b(ciao|buongiorno|grazie|perché|come|sono|vorrei|fondatore|creatore)\b/],
    ['pt', /\b(olá|ola|bom dia|obrigado|obrigada|você|como|quero|fundador|criador)\b/],
    ['nl', /\b(hallo|goedemorgen|bedankt|alsjeblieft|ik|jij|wat|waarom|oprichter)\b/],
    ['tr', /\b(merhaba|teşekkür|nasıl|neden|lütfen|ben|kurucu|sahibi)\b/],
    ['id', /\b(halo|selamat|terima kasih|tolong|saya|anda|pendiri|pencipta)\b/],
    ['ms', /\b(apa khabar|terima kasih|tolong|saya|anda|pengasas)\b/],
    ['vi', /\b(xin chào|cảm ơn|tôi|bạn|người sáng lập)\b/],
    ['sw', /\b(jambo|habari|asante|tafadhali|mimi|nani|mwanzilishi)\b/],
    ['pl', /\b(cześć|dzień dobry|dziękuję|proszę|jestem|założyciel)\b/],
    ['ro', /\b(bună|salut|mulțumesc|te rog|sunt|fondator)\b/],
    ['cs', /\b(ahoj|dobrý den|děkuji|prosím|jsem|zakladatel)\b/],
    ['sv', /\b(hej|god morgon|tack|snälla|jag|grundare)\b/],
    ['da', /\b(hej|godmorgen|tak|venligst|jeg|grundlægger)\b/],
    ['fi', /\b(hei|hyvää huomenta|kiitos|ole hyvä|minä|perustaja)\b/],
    ['no', /\b(hei|god morgen|takk|vær så snill|jeg|grunnlegger)\b/]
  ];
  for (const [code, pattern] of groups) if (pattern.test(text)) return code;
  if (/\b(hello|hey|good morning|good afternoon|good evening|please|what|who|how|why|when|where|is|are|the|my|your|tell|give|explain|can|could|would|help|thanks|thank|suggest|recommend|founder|creator|owner|company)\b/.test(text)) return 'en';
  if (/\b(namaste|kaise|kya|aap|dhanyavaad)\b/.test(text)) return 'hi';
  return null;
}

function requestedLanguage(message) {
  const text = message.toLowerCase();
  const aliases = { bangla: 'bn', bengali: 'bn', hindi: 'hi', urdu: 'ur', arabic: 'ar', spanish: 'es', french: 'fr', german: 'de', italian: 'it', portuguese: 'pt', chinese: 'zh', mandarin: 'zh', japanese: 'ja', korean: 'ko', russian: 'ru', ukrainian: 'uk', turkish: 'tr', indonesian: 'id', malay: 'ms', vietnamese: 'vi', thai: 'th', filipino: 'fil', tagalog: 'fil', swahili: 'sw', persian: 'fa', farsi: 'fa', tamil: 'ta', telugu: 'te', punjabi: 'pa', marathi: 'mr', gujarati: 'gu', nepali: 'ne', greek: 'el', dutch: 'nl', polish: 'pl', hebrew: 'he', swedish: 'sv', danish: 'da', finnish: 'fi', norwegian: 'no', romanian: 'ro', czech: 'cs', english: 'en' };
  for (const [name, code] of Object.entries(aliases)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) return code;
  }
  if (/বাংলা|বাংলায়/.test(text)) return 'bn';
  return null;
}

function asksAboutCreator(message) {
  return /\b(owner|founder|founded|creator|created by|who made|who built|company name)\b|প্রতিষ্ঠাতা|নির্মাতা|মালিক|संस्थापक|निर्माता|मालिक|بانی|مؤسس|مالک|مؤسس|创始人|创建者|所有者|創設者|創業者|作成者|창립자|창업자|основатель|создатель|kurucu|pendiri|fundador|fondateur|gründer|fondatore|fundador|oprichter|założyciel|grunnlegger|grundare|grundlægger|perustaja/i.test(message);
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

async function bodyJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error('Request is too large.');
  }
  return JSON.parse(raw || '{}');
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const { messages } = await bodyJson(req);
      if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Send between 1 and 40 chat messages.' }));
      }
      const input = messages.map(({ role, content }) => {
        if (!['user', 'assistant'].includes(role) || typeof content !== 'string') throw new Error('Invalid message format.');
        return { role, content: content.slice(0, 12_000) };
      });
      const lastUserMessage = [...input].reverse().find(message => message.role === 'user')?.content || '';
      const chosenLanguage = requestedLanguage(lastUserMessage) || detectLanguage(lastUserMessage) || 'en';
      if (asksAboutCreator(lastUserMessage)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ profile: 'owner', language: chosenLanguage }));
      }
      if (!apiKey) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Add your Groq API key as GROQ_API_KEY in the local .env file, then restart the server.' }));
      }
      const systemPrompt = [
        'You are TD_AI, a helpful and natural conversational assistant.',
        'Mirror the language of the user’s current message on every turn, regardless of the previous turn’s language. If the user explicitly asks for a response in another language, use that language. Support the language they use without asking them to choose a language.',
        'Be clear, warm, and direct. Use everyday wording and short paragraphs.',
        'Do not start with markdown headings, bold labels, or decorative formatting. Avoid raw Markdown such as ## or **. Use a short list only when it makes steps or options easier to follow.',
        'When it would help, ask one specific follow-up question or invite the user to share a preference so you can tailor suggestions. Do not add a generic follow-up to every answer.'
      ].join(' ');
      const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...input] })
      });
      const data = await upstream.json();
      if (!upstream.ok) {
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: data?.error?.message || 'The Groq request could not be completed.' }));
      }
      const text = data.choices?.[0]?.message?.content || '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply: text || 'No text response was returned.', language: chosenLanguage }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: error.message || 'Could not process that request.' }));
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); return res.end('Method not allowed');
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = resolve(root, requested);
    if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); return res.end('Forbidden'); }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => console.log(`TD_AI is running on port ${port}`));
