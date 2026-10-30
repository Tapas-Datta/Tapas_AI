const form = document.querySelector('#chatForm');
const input = document.querySelector('#promptInput');
const sendButton = document.querySelector('#sendButton');
const welcome = document.querySelector('#welcome');
const messagesEl = document.querySelector('#messages');
const historyList = document.querySelector('#historyList');
const shell = document.querySelector('.shell');
const historyToggle = document.querySelector('#historyToggle');
const titleEl = document.querySelector('#currentTitle');
const toastEl = document.querySelector('#toast');
const nameOverlay = document.querySelector('#nameOverlay');
const nameForm = document.querySelector('#nameForm');
const nameInput = document.querySelector('#nameInput');
const nameHeading = document.querySelector('#nameHeading');
let displayName = localStorage.getItem('td-ai-name') || '';
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
function renderProfile() {
  document.querySelector('#profileName').textContent = displayName || 'Guest';
  document.querySelector('#profileAvatar').textContent = displayName ? initials(displayName) : '?';
}
function openNameForm(editing = false) {
  nameHeading.textContent = editing ? 'Update your name' : 'Welcome to TD_AI';
  nameInput.value = displayName;
  nameOverlay.hidden = false;
  nameInput.focus();
}
let conversations = loadConversations();
let activeId = null;
let isSending = false;

function loadConversations() {
  try { return JSON.parse(localStorage.getItem('td-ai-conversations') || '[]'); }
  catch { return []; }
}
function saveConversations() { localStorage.setItem('td-ai-conversations', JSON.stringify(conversations.slice(0, 100))); }
function escapeHtml(text) { return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function safeText(text) {
  // Lightweight formatting for readable paragraphs and fenced code blocks.
  return text.split(/```/).map((part, index) => index % 2 ? `<pre>${escapeHtml(part.replace(/^\w+\n/, ''))}</pre>` : part.replace(/^\s*#{1,6}\s*/gm, '').replace(/\*\*(.*?)\*\*/gs, '$1').replace(/__(.*?)__/gs, '$1').replace(/^\s*[-*]\s+/gm, '• ').split(/\n\n+/).map(p => `<p>${escapeHtml(p).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>')}</p>`).join('')).join('');
}
function ownerProfileCardHTML(language = 'en') {
  const translations = {
    en: ['FOUNDER · TD_AI', 'Hey, I’m Tapas Datta.', 'I’m the person behind TD_AI. Feel free to get in touch or connect with me.', 'Email me', 'Connect on LinkedIn'],
    bn: ['প্রতিষ্ঠাতা · TD_AI', 'হাই, আমি তাপস দত্ত।', 'আমি TD_AI-এর নির্মাতা। আমার সঙ্গে যোগাযোগ করতে বা LinkedIn-এ যুক্ত হতে পারেন।', 'ইমেইল করুন', 'LinkedIn-এ যুক্ত হন'],
    hi: ['संस्थापक · TD_AI', 'नमस्ते, मैं तापस दत्ता हूँ।', 'मैंने TD_AI बनाया है। आप मुझसे संपर्क कर सकते हैं या LinkedIn पर जुड़ सकते हैं।', 'ईमेल करें', 'LinkedIn पर जुड़ें'],
    es: ['FUNDADOR · TD_AI', 'Hola, soy Tapas Datta.', 'Creé TD_AI. Puedes escribirme o conectar conmigo en LinkedIn.', 'Escríbeme', 'Conectar en LinkedIn'],
    fr: ['FONDATEUR · TD_AI', 'Bonjour, je suis Tapas Datta.', 'J’ai créé TD_AI. Vous pouvez m’écrire ou me retrouver sur LinkedIn.', 'M’écrire', 'Me retrouver sur LinkedIn'],
    de: ['GRÜNDER · TD_AI', 'Hallo, ich bin Tapas Datta.', 'Ich habe TD_AI entwickelt. Schreib mir gern oder vernetze dich mit mir auf LinkedIn.', 'E-Mail schreiben', 'Auf LinkedIn vernetzen'],
    it: ['FONDATORE · TD_AI', 'Ciao, sono Tapas Datta.', 'Ho creato TD_AI. Puoi scrivermi o connetterti con me su LinkedIn.', 'Scrivimi', 'Connettiti su LinkedIn'],
    pt: ['FUNDADOR · TD_AI', 'Olá, sou Tapas Datta.', 'Criei o TD_AI. Pode falar comigo por e-mail ou me encontrar no LinkedIn.', 'Enviar e-mail', 'Conectar no LinkedIn'],
    ar: ['المؤسس · TD_AI', 'مرحبًا، أنا تاباس داتا.', 'أنا من أنشأ TD_AI. يمكنك مراسلتي أو التواصل معي عبر LinkedIn.', 'راسلني', 'تواصل عبر LinkedIn'],
    ru: ['ОСНОВАТЕЛЬ · TD_AI', 'Привет, я Тапас Датта.', 'Я создал TD_AI. Напишите мне или свяжитесь со мной в LinkedIn.', 'Написать мне', 'Связаться в LinkedIn'],
    zh: ['创始人 · TD_AI', '你好，我是 Tapas Datta。', '我创建了 TD_AI。欢迎给我发邮件或在 LinkedIn 上联系我。', '给我发邮件', '在 LinkedIn 联系'],
    'zh-TW': ['創辦人 · TD_AI', '你好，我是 Tapas Datta。', '我創建了 TD_AI。歡迎寄信給我，或在 LinkedIn 上聯絡我。', '寄信給我', '在 LinkedIn 聯絡'],
    ja: ['創設者 · TD_AI', 'こんにちは、Tapas Dattaです。', 'TD_AIを作りました。メールやLinkedInでお気軽にご連絡ください。', 'メールする', 'LinkedInでつながる'],
    ko: ['창립자 · TD_AI', '안녕하세요, Tapas Datta입니다.', 'TD_AI를 만들었습니다. 이메일이나 LinkedIn으로 편하게 연락해 주세요.', '이메일 보내기', 'LinkedIn에서 연결'],
    tr: ['KURUCU · TD_AI', 'Merhaba, ben Tapas Datta.', 'TD_AI’yi ben oluşturdum. Bana e-posta gönderebilir veya LinkedIn’de bağlantı kurabilirsiniz.', 'E-posta gönder', 'LinkedIn’de bağlan'],
    id: ['PENDIRI · TD_AI', 'Hai, saya Tapas Datta.', 'Saya membuat TD_AI. Silakan hubungi saya atau terhubung di LinkedIn.', 'Kirim email', 'Terhubung di LinkedIn'],
    vi: ['NHÀ SÁNG LẬP · TD_AI', 'Chào bạn, tôi là Tapas Datta.', 'Tôi đã tạo TD_AI. Bạn có thể gửi email hoặc kết nối với tôi trên LinkedIn.', 'Gửi email', 'Kết nối trên LinkedIn'],
    ur: ['بانی · TD_AI', 'سلام، میں تپس دتہ ہوں۔', 'میں نے TD_AI بنایا ہے۔ آپ مجھے ای میل کر سکتے ہیں یا LinkedIn پر رابطہ کر سکتے ہیں۔', 'ای میل کریں', 'LinkedIn پر رابطہ کریں'],
    uk: ['ЗАСНОВНИК · TD_AI', 'Привіт, я Тапас Датта.', 'Я створив TD_AI. Напишіть мені або зв’яжіться зі мною в LinkedIn.', 'Написати мені', 'Зв’язатися в LinkedIn'],
    ms: ['PENGASAS · TD_AI', 'Hai, saya Tapas Datta.', 'Saya membina TD_AI. Anda boleh menghubungi saya melalui e-mel atau LinkedIn.', 'E-mel saya', 'Hubungi di LinkedIn'],
    th: ['ผู้ก่อตั้ง · TD_AI', 'สวัสดี ฉันชื่อ Tapas Datta', 'ฉันเป็นผู้สร้าง TD_AI ติดต่อฉันทางอีเมลหรือ LinkedIn ได้เลย', 'ส่งอีเมล', 'เชื่อมต่อบน LinkedIn'],
    fil: ['TAGAPAGTATAG · TD_AI', 'Kumusta, ako si Tapas Datta.', 'Ako ang gumawa ng TD_AI. Maaari mo akong i-email o kumonekta sa LinkedIn.', 'Mag-email sa akin', 'Kumonekta sa LinkedIn'],
    sw: ['MWANZILISHI · TD_AI', 'Habari, mimi ni Tapas Datta.', 'Niliunda TD_AI. Unaweza kunitumia barua pepe au kuungana nami kwenye LinkedIn.', 'Nitumia barua pepe', 'Ungana nami LinkedIn'],
    fa: ['بنیان‌گذار · TD_AI', 'سلام، من تاپاس داتا هستم.', 'من TD_AI را ساخته‌ام. می‌توانید برایم ایمیل بفرستید یا در LinkedIn با من در ارتباط باشید.', 'ایمیل بزنید', 'ارتباط در LinkedIn'],
    ta: ['நிறுவனர் · TD_AI', 'வணக்கம், நான் தபஸ் தத்தா.', 'TD_AI-ஐ உருவாக்கியது நான்தான். மின்னஞ்சல் அல்லது LinkedIn மூலம் என்னைத் தொடர்புகொள்ளலாம்.', 'மின்னஞ்சல் அனுப்பவும்', 'LinkedIn-இல் இணையவும்'],
    te: ['వ్యవస్థాపకుడు · TD_AI', 'హాయ్, నేను తపస్ దత్తా.', 'TD_AIని నేనే రూపొందించాను. ఇమెయిల్ లేదా LinkedIn ద్వారా నన్ను సంప్రదించవచ్చు.', 'ఇమెయిల్ చేయండి', 'LinkedInలో కనెక్ట్ అవ్వండి'],
    pa: ['ਸੰਸਥਾਪਕ · TD_AI', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਤਪਸ ਦੱਤਾ ਹਾਂ।', 'TD_AI ਮੈਂ ਬਣਾਇਆ ਹੈ। ਤੁਸੀਂ ਮੈਨੂੰ ਈਮੇਲ ਕਰ ਸਕਦੇ ਹੋ ਜਾਂ LinkedIn ’ਤੇ ਜੁੜ ਸਕਦੇ ਹੋ।', 'ਈਮੇਲ ਕਰੋ', 'LinkedIn ’ਤੇ ਜੁੜੋ'],
    mr: ['संस्थापक · TD_AI', 'नमस्कार, मी तापस दत्ता.', 'TD_AI मी तयार केले आहे. मला ईमेल करा किंवा LinkedIn वर संपर्क साधा.', 'ईमेल करा', 'LinkedIn वर संपर्क करा'],
    gu: ['સ્થાપક · TD_AI', 'નમસ્તે, હું તાપસ દત્તા છું.', 'TD_AI મેં બનાવ્યું છે. મને ઇમેઇલ કરો અથવા LinkedIn પર જોડાઓ.', 'ઇમેઇલ કરો', 'LinkedIn પર જોડાઓ'],
    ne: ['संस्थापक · TD_AI', 'नमस्ते, म तपस दत्ता हुँ।', 'TD_AI मैले बनाएको हुँ। मलाई इमेल गर्न वा LinkedIn मा जोडिन सक्नुहुन्छ।', 'इमेल गर्नुहोस्', 'LinkedIn मा जोडिनुहोस्'],
    el: ['ΙΔΡΥΤΗΣ · TD_AI', 'Γεια, είμαι ο Tapas Datta.', 'Δημιούργησα το TD_AI. Μπορείτε να μου στείλετε email ή να συνδεθείτε μαζί μου στο LinkedIn.', 'Στείλτε μου email', 'Σύνδεση στο LinkedIn'],
    nl: ['OPRICHTER · TD_AI', 'Hoi, ik ben Tapas Datta.', 'Ik heb TD_AI gemaakt. Mail me gerust of neem contact op via LinkedIn.', 'Mail mij', 'Contact via LinkedIn'],
    pl: ['ZAŁOŻYCIEL · TD_AI', 'Cześć, jestem Tapas Datta.', 'Stworzyłem TD_AI. Napisz do mnie lub skontaktuj się ze mną na LinkedIn.', 'Napisz do mnie', 'Kontakt na LinkedIn'],
    he: ['מייסד · TD_AI', 'היי, אני טאפס דאטה.', 'אני יצרתי את TD_AI. אפשר לשלוח לי אימייל או להתחבר אליי ב-LinkedIn.', 'שלחו לי אימייל', 'התחברו ב-LinkedIn'],
    sv: ['GRUNDARE · TD_AI', 'Hej, jag heter Tapas Datta.', 'Jag skapade TD_AI. Mejla mig gärna eller ta kontakt via LinkedIn.', 'Mejla mig', 'Kontakta på LinkedIn'],
    da: ['GRUNDLÆGGER · TD_AI', 'Hej, jeg hedder Tapas Datta.', 'Jeg har skabt TD_AI. Skriv til mig på e-mail eller forbind med mig på LinkedIn.', 'Skriv en e-mail', 'Forbind på LinkedIn'],
    fi: ['PERUSTAJA · TD_AI', 'Hei, olen Tapas Datta.', 'Loin TD_AI:n. Voit lähettää minulle sähköpostia tai ottaa yhteyttä LinkedInissä.', 'Lähetä sähköpostia', 'Ota yhteyttä LinkedInissä'],
    no: ['GRUNNLEGGER · TD_AI', 'Hei, jeg heter Tapas Datta.', 'Jeg har laget TD_AI. Send meg gjerne en e-post eller ta kontakt på LinkedIn.', 'Send e-post', 'Ta kontakt på LinkedIn'],
    ro: ['FONDATOR · TD_AI', 'Salut, sunt Tapas Datta.', 'Am creat TD_AI. Îmi poți scrie pe e-mail sau mă poți contacta pe LinkedIn.', 'Scrie-mi', 'Conectează-te pe LinkedIn'],
    cs: ['ZAKLADATEL · TD_AI', 'Ahoj, jsem Tapas Datta.', 'Vytvořil jsem TD_AI. Můžete mi napsat e-mail nebo se se mnou spojit na LinkedIn.', 'Napište mi', 'Spojit se na LinkedIn']
  };
  const [badge, title, description, emailLabel, linkedInLabel] = translations[language] || translations.en;
  const alt = language === 'bn' ? 'তাপস দত্ত' : 'Tapas Datta';
  return `<section class="owner-card">
    <img class="owner-photo" src="/images/tapas-datta.png" alt="${alt}" />
    <div class="owner-copy"><span class="owner-badge">${badge}</span>
      <h3>${title}</h3>
      <p>${description}</p>
      <div class="owner-links"><a href="mailto:Taposdatta610@gmail.com"><span>✉</span> ${emailLabel}</a>
        <a href="https://www.linkedin.com/feed/" target="_blank" rel="noopener noreferrer"><span>↗</span> ${linkedInLabel}</a></div>
    </div>
  </section>`;
}
function messagesForApi(messages) {
  return messages.map(message => {
    const isOwnerCard = message.kind === 'owner_profile' || (message.role === 'assistant' && /Taposdatta610@gmail\.com|linkedin\.com\/feed/i.test(message.content));
    return { role: message.role, content: isOwnerCard ? 'I shared the owner profile.' : message.content };
  });
}
function renderHistory() {
  historyList.innerHTML = conversations.map(chat => `<div class="history-row"><button class="history-item ${chat.id === activeId ? 'active' : ''}" data-id="${chat.id}">${escapeHtml(chat.title)}</button><button class="history-delete" data-delete-id="${chat.id}" title="Delete chat" aria-label="Delete chat: ${escapeHtml(chat.title)}">×</button></div>`).join('');
}
function renderMessages(chat) {
  messagesEl.innerHTML = chat.messages.map(message => {
    const isOwnerCard = message.kind === 'owner_profile' || (message.role === 'assistant' && /Taposdatta610@gmail\.com|linkedin\.com\/feed/i.test(message.content));
    const content = isOwnerCard ? ownerProfileCardHTML(message.language) : safeText(message.content);
    return `<article class="message ${message.role}"><div class="message-avatar">${message.role === 'user' ? (initials(displayName) || '?') : '✳'}</div><div class="message-content">${content}</div></article>`;
  }).join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;
  welcome.hidden = chat.messages.length > 0;
}
function startNewChat() {
  activeId = null; titleEl.textContent = 'New session';
  messagesEl.innerHTML = ''; welcome.hidden = false; renderHistory(); setHistoryPanel(false); input.focus();
}
function setHistoryPanel(open) {
  shell.classList.toggle('mobile-history-open', open);
  document.querySelector('.sidebar').classList.toggle('mobile-open', open);
  historyToggle.textContent = open ? '×' : '☰';
  historyToggle.setAttribute('aria-label', open ? 'Close chat history' : 'Open chat history');
}
function getActiveChat() { return conversations.find(chat => chat.id === activeId); }
function showToast(message) {
  toastEl.textContent = message; toastEl.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 3500);
}
function addMessage(chat, role, content) { chat.messages.push({ role, content }); }

async function requestAssistantReply(chat) {
  isSending = true; sendButton.disabled = true;
  const loading = document.createElement('article'); loading.className = 'message assistant'; loading.innerHTML = '<div class="message-avatar">✳</div><div class="typing"><i></i><i></i><i></i></div>';
  messagesEl.append(loading); messagesEl.scrollTop = messagesEl.scrollHeight;
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messagesForApi(chat.messages) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The request failed.');
    if (data.profile === 'owner') chat.messages.push({ role: 'assistant', content: '__OWNER_PROFILE__', kind: 'owner_profile', language: data.language || 'en' });
    else addMessage(chat, 'assistant', data.reply);
    saveConversations();
  } catch (error) {
    addMessage(chat, 'assistant', `I couldn't complete that request. ${error.message}`);
    showToast(error.message);
  } finally {
    isSending = false; sendButton.disabled = false; renderMessages(chat); input.focus();
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const prompt = input.value.trim();
  if (!prompt || isSending) return;
  if (!activeId) {
    const chat = { id: crypto.randomUUID(), title: prompt.slice(0, 32) + (prompt.length > 32 ? '…' : ''), messages: [] };
    conversations.unshift(chat); activeId = chat.id; titleEl.textContent = chat.title;
  }
  const chat = getActiveChat();
  addMessage(chat, 'user', prompt);
  input.value = ''; input.style.height = 'auto';
  welcome.hidden = true; renderMessages(chat); renderHistory(); saveConversations();
  await requestAssistantReply(chat);
});

input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 170)}px`; });
input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
document.querySelector('#newChat').addEventListener('click', startNewChat);
historyToggle.addEventListener('click', () => setHistoryPanel(!shell.classList.contains('mobile-history-open')));
document.querySelector('#editName').addEventListener('click', () => openNameForm(true));
nameForm.addEventListener('submit', event => {
  event.preventDefault();
  const value = nameInput.value.trim().replace(/\s+/g, ' ');
  if (!value) return;
  displayName = value;
  localStorage.setItem('td-ai-name', displayName);
  renderProfile();
  nameOverlay.hidden = true;
  input.focus();
});
document.querySelector('#suggestions').addEventListener('click', event => {
  const button = event.target.closest('[data-prompt]');
  if (button) { input.value = button.dataset.prompt; input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; form.requestSubmit(); }
});
historyList.addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-delete-id]');
  if (deleteButton) {
    const deleteId = deleteButton.dataset.deleteId;
    conversations = conversations.filter(chat => chat.id !== deleteId);
    if (activeId === deleteId) {
      activeId = null; titleEl.textContent = 'New session'; messagesEl.innerHTML = ''; welcome.hidden = false;
    }
    saveConversations(); renderHistory(); setHistoryPanel(false); showToast('Chat deleted.');
    return;
  }
  const button = event.target.closest('[data-id]');
  if (!button) return;
  activeId = button.dataset.id; const chat = getActiveChat();
  if (chat) { titleEl.textContent = chat.title; renderMessages(chat); renderHistory(); setHistoryPanel(false); }
});
document.querySelector('#clearHistory').addEventListener('click', () => {
  conversations = []; saveConversations(); startNewChat(); showToast('Session history cleared.');
});
document.querySelector('#shareButton').addEventListener('click', async () => {
  const chat = getActiveChat();
  if (!chat || !chat.messages.length) return showToast('Start a conversation before sharing.');
  const transcript = chat.messages.map(message => `${message.role === 'user' ? 'You' : 'TD_AI'}: ${message.content}`).join('\n\n');
  try { await navigator.clipboard.writeText(transcript); showToast('Conversation copied to clipboard.'); }
  catch { showToast('Clipboard access is unavailable in this browser.'); }
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); startNewChat(); }
  if (event.key === 'Escape') setHistoryPanel(false);
});
renderHistory();
renderProfile();
if (!displayName) openNameForm(false);
