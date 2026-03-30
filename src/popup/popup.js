const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const SYSTEM_INSTRUCTIONS = {
  chat: 'You are IntelliGEM, a brilliant AI assistant integrated in a Chrome extension. Be concise, helpful, and accurate. Use markdown formatting where helpful. Max 400 words unless asked for more.',
  summarize: 'You are IntelliGEM summarization expert. Create structured summaries with key points, main insights, and action items. Use bullet points and headers.',
  code: 'You are IntelliGEM, an expert software engineer. Explain code clearly, identify issues, suggest improvements, and provide examples. Format code in markdown blocks.',
  leetcode: 'You are IntelliGEM LeetCode coach. Give hints and guidance WITHOUT giving away the full solution. Focus on approach, pattern, and time/space complexity guidance.',
};

const LANG_INSTRUCTIONS = {
  en: '',
  hi: 'Respond in Hindi (हिंदी में जवाब दें).',
  es: 'Respond in Spanish (Responde en español).',
  fr: 'Respond in French (Répondez en français).',
  de: 'Respond in German (Antworten Sie auf Deutsch).',
  ja: 'Respond in Japanese (日本語で回答してください).',
  zh: 'Respond in Chinese (请用中文回答).',
  ar: 'Respond in Arabic (الرجاء الإجابة باللغة العربية).',
  pt: 'Respond in Portuguese (Responda em português).',
};

const sendToBackground = async (type, data) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...data }, resolve);
  });
};

const markdownToHtml = (text) => {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:6px 0 3px;font-size:13px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:8px 0 4px;font-size:14px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:8px 0 4px">$1</h2>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:12px">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-left:12px">$1</li>')
    .replace(/\n\n+/g, '<br/><br/>');
};

let chatHistory = [];
let isLoading = false;
let pageData = null;

const loadPageData = async () => {
  const result = await sendToBackground('GET_PAGE_CONTENT', {});
  if (result.success) {
    pageData = result.data;
    if (pageData.isLeetCode) {
      $('#leetcode-status').textContent = `📌 ${pageData.title}`;
      $('#leetcode-actions').classList.remove('hidden');
    }
  }
};

const loadSettings = async () => {
  const result = await chrome.storage.sync.get(['geminiApiKey', 'selectedModel']);
  if (result.geminiApiKey) {
    $('#api-key-input').value = result.geminiApiKey;
  } else {
    $('#api-key-input').value = 'AIzaSyDpx36J9fK3UkcptKu6KWmkABwHc2qSA64';
  }
  if (result.selectedModel) {
    $('#model-select').value = result.selectedModel;
  }
};

const addChatMessage = (content, role, isHtml = false) => {
  const container = $('#chat-messages');
  const emptyEl = container.querySelector('.empty-chat');
  if (emptyEl) emptyEl.remove();

  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${role}`;

  const icon = role === 'user' ? '👤' : '✨';
  const contentHtml = isHtml ? content : markdownToHtml(content);

  msgEl.innerHTML = `
    <div class="message-avatar">${icon}</div>
    <div class="message-content">${contentHtml}</div>
  `;

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
  return msgEl;
};

const addThinkingIndicator = () => {
  const container = $('#chat-messages');
  const el = document.createElement('div');
  el.className = 'chat-message ai';
  el.id = 'thinking-indicator';
  el.innerHTML = `
    <div class="message-avatar">✨</div>
    <div class="message-content">
      <div class="thinking"><span></span><span></span><span></span></div>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
};

const removeThinkingIndicator = () => {
  $('#thinking-indicator')?.remove();
};

const showResult = (containerId, content) => {
  const el = $(containerId);
  el.innerHTML = markdownToHtml(content);
  el.classList.remove('hidden');
};

const handleSendChat = async () => {
  if (isLoading) return;

  const input = $('#chat-input');
  const prompt = input.value.trim();
  if (!prompt) return;

  const lang = $('#language-select').value;
  const langInstruction = LANG_INSTRUCTIONS[lang] || '';
  const systemInstruction = SYSTEM_INSTRUCTIONS.chat + (langInstruction ? ` ${langInstruction}` : '');

  input.value = '';
  input.style.height = 'auto';
  isLoading = true;
  $('#send-btn').disabled = true;

  addChatMessage(prompt, 'user');
  chatHistory.push({ role: 'user', text: prompt });

  addThinkingIndicator();

  const context = pageData ? `Current page: ${pageData.title}\nURL: ${pageData.url}` : '';
  const fullPrompt = chatHistory.length > 1
    ? `Conversation history:\n${chatHistory.slice(-6, -1).map(m => `${m.role}: ${m.text}`).join('\n')}\n\nUser: ${prompt}`
    : prompt;

  const result = await sendToBackground('GENERATE_CONTENT', {
    prompt: fullPrompt,
    context,
    systemInstruction,
  });

  removeThinkingIndicator();

  if (result.success) {
    addChatMessage(result.response, 'ai');
    chatHistory.push({ role: 'ai', text: result.response });
  } else {
    addChatMessage(`<div class="error-message">❌ ${result.error}</div>`, 'ai', true);
  }

  isLoading = false;
  $('#send-btn').disabled = false;
  input.focus();
};

const handleSummarizePage = async () => {
  const btn = $('#summarize-page-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Summarizing...';
  $('#summary-result').classList.add('hidden');

  if (!pageData) await loadPageData();

  if (!pageData) {
    $('#summary-result').innerHTML = '<div class="error-message">❌ Could not access page content</div>';
    $('#summary-result').classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Summarize Current Page';
    return;
  }

  const prompt = `Summarize this webpage titled "${pageData.title}":\n\n${pageData.content}`;
  const result = await sendToBackground('GENERATE_CONTENT', {
    prompt,
    systemInstruction: SYSTEM_INSTRUCTIONS.summarize,
  });

  if (result.success) {
    showResult('#summary-result', result.response);
  } else {
    $('#summary-result').innerHTML = `<div class="error-message">❌ ${result.error}</div>`;
    $('#summary-result').classList.remove('hidden');
  }

  btn.disabled = false;
  btn.textContent = 'Summarize Current Page';
};

const handleCodeAction = async (action) => {
  const code = $('#code-input').value.trim();
  if (!code) return;

  const btn = action === 'explain' ? $('#explain-code-btn') : $('#optimize-code-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Processing...';
  $('#code-result').classList.add('hidden');

  const prompt = action === 'explain'
    ? `Explain this code in detail:\n\`\`\`\n${code}\n\`\`\`\n\nExplain: what it does, how each part works, time and space complexity, and any potential improvements.`
    : `Review and optimize this code:\n\`\`\`\n${code}\n\`\`\`\n\nProvide: optimized version, explanation of changes, performance improvements, and best practices applied.`;

  const result = await sendToBackground('GENERATE_CONTENT', {
    prompt,
    systemInstruction: SYSTEM_INSTRUCTIONS.code,
  });

  if (result.success) {
    showResult('#code-result', result.response);
  } else {
    $('#code-result').innerHTML = `<div class="error-message">❌ ${result.error}</div>`;
    $('#code-result').classList.remove('hidden');
  }

  btn.disabled = false;
  btn.textContent = action === 'explain' ? 'Explain Code' : 'Optimize';
};

const handleLeetCodeAction = async (action) => {
  if (!pageData) await loadPageData();

  const actionBtns = $$('#leetcode-actions button');
  actionBtns.forEach(b => b.disabled = true);
  $('#leetcode-result').classList.add('hidden');

  const prompts = {
    hint: `I'm working on this LeetCode problem: "${pageData.title}". Give me a hint to nudge me in the right direction WITHOUT the solution. Page content: ${pageData.content.slice(0, 2000)}`,
    approach: `Explain the algorithmic approach to solve: "${pageData.title}". Discuss different approaches, their trade-offs, and which one to prefer. DON'T give the code.`,
    pattern: `Identify the data structure and algorithm patterns in: "${pageData.title}". What common patterns does this problem fall into? (DP, two-pointer, sliding window, etc.)`,
  };

  const result = await sendToBackground('GENERATE_CONTENT', {
    prompt: prompts[action],
    systemInstruction: SYSTEM_INSTRUCTIONS.leetcode,
  });

  if (result.success) {
    showResult('#leetcode-result', result.response);
  } else {
    $('#leetcode-result').innerHTML = `<div class="error-message">❌ ${result.error}</div>`;
    $('#leetcode-result').classList.remove('hidden');
  }

  actionBtns.forEach(b => b.disabled = false);
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadPageData();

  const chatMessages = $('#chat-messages');
  chatMessages.innerHTML = `
    <div class="empty-chat">
      <div class="empty-icon">✨</div>
      <h3>Hi! I'm IntelliGEM</h3>
      <p>Your AI assistant powered by Gemini</p>
      <div class="suggestion-chips">
        <div class="chip" data-prompt="What's on this page?">📄 This page</div>
        <div class="chip" data-prompt="Explain this URL to me">🔗 Explain URL</div>
        <div class="chip" data-prompt="Give me a coding tip">💡 Coding tip</div>
      </div>
    </div>
  `;

  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  $('#settings-btn').addEventListener('click', () => {
    $('#settings-panel').classList.toggle('hidden');
  });

  $('#save-settings-btn').addEventListener('click', async () => {
    const apiKey = $('#api-key-input').value.trim();
    const model = $('#model-select').value;
    await chrome.storage.sync.set({ geminiApiKey: apiKey, selectedModel: model });
    $('#settings-panel').classList.add('hidden');
    const bar = document.createElement('div');
    bar.className = 'success-bar';
    bar.textContent = '✅ Settings saved!';
    bar.style.cssText = 'position:fixed;top:60px;left:0;right:0;margin:0 12px;z-index:100;animation:fadeIn 0.3s;';
    document.body.appendChild(bar);
    setTimeout(() => bar.remove(), 2000);
  });

  $('#toggle-key-visibility').addEventListener('click', () => {
    const input = $('#api-key-input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  $('#send-btn').addEventListener('click', handleSendChat);

  $('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
    $('#chat-input').style.height = 'auto';
    $('#chat-input').style.height = Math.min($('#chat-input').scrollHeight, 80) + 'px';
  });

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      const prompt = e.target.dataset.prompt;
      if (prompt) {
        $('#chat-input').value = prompt;
        handleSendChat();
      }
    }
  });

  $('#summarize-page-btn').addEventListener('click', handleSummarizePage);
  $('#explain-code-btn').addEventListener('click', () => handleCodeAction('explain'));
  $('#optimize-code-btn').addEventListener('click', () => handleCodeAction('optimize'));
  $('#get-hint-btn')?.addEventListener('click', () => handleLeetCodeAction('hint'));
  $('#explain-approach-btn')?.addEventListener('click', () => handleLeetCodeAction('approach'));
  $('#detect-pattern-btn')?.addEventListener('click', () => handleLeetCodeAction('pattern'));
});
