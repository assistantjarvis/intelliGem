const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash';
const REQUEST_TIMEOUT = 30000;

class GeminiService {
  constructor() {
    this.apiKey = null;
    this.model = DEFAULT_MODEL;
    this.requestCache = new Map();
    this.pendingRequests = new Map();
  }

  async init() {
    const result = await chrome.storage.sync.get(['geminiApiKey', 'selectedModel']);
    this.apiKey = result.geminiApiKey || null;
    this.model = result.selectedModel || DEFAULT_MODEL;
  }

  getCacheKey(prompt, context) {
    const str = `${this.model}:${prompt}:${(context || '').slice(0, 100)}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `cache_${hash}`;
  }

  async generateContent(prompt, context = '', systemInstruction = '') {
    if (!this.apiKey) throw new Error('API key not configured. Please set your Gemini API key in settings.');

    const cacheKey = this.getCacheKey(prompt, context);

    if (this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        return cached.response;
      }
      this.requestCache.delete(cacheKey);
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this._makeRequest(prompt, context, systemInstruction)
      .then((response) => {
        this.requestCache.set(cacheKey, { response, timestamp: Date.now() });
        this.pendingRequests.delete(cacheKey);
        return response;
      })
      .catch((err) => {
        this.pendingRequests.delete(cacheKey);
        throw err;
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async _makeRequest(prompt, context, systemInstruction) {
    const url = `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

    const parts = [];
    if (context) parts.push({ text: `Context:\n${context}\n\n` });
    parts.push({ text: prompt });

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    };

    if (systemInstruction) {
      body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error('Empty response from Gemini API');
      return text;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
      throw err;
    }
  }

  clearCache() {
    this.requestCache.clear();
  }
}

const geminiService = new GeminiService();

const CONTEXT_MENU_ITEMS = [
  { id: 'explain-code', title: 'Explain this code', contexts: ['selection'] },
  { id: 'summarize-selection', title: 'Summarize selection', contexts: ['selection'] },
  { id: 'translate-selection', title: 'Translate to English', contexts: ['selection'] },
  { id: 'summarize-page', title: 'Summarize this page', contexts: ['page', 'frame'] },
];

const setupContextMenus = () => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'intelligem-parent', title: '✨ IntelliGEM', contexts: ['selection', 'page', 'frame'] });
    CONTEXT_MENU_ITEMS.forEach((item) => {
      chrome.contextMenus.create({ ...item, parentId: 'intelligem-parent' });
    });
  });
};

chrome.runtime.onInstalled.addListener(async () => {
  setupContextMenus();
  await geminiService.init();
});

chrome.runtime.onStartup.addListener(async () => {
  await geminiService.init();
});

chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.geminiApiKey || changes.selectedModel) {
    await geminiService.init();
    geminiService.clearCache();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  await geminiService.init();

  const selectedText = info.selectionText || '';

  try {
    let prompt = '';
    let systemInstruction = 'You are IntelliGEM, a helpful AI assistant. Provide clear, concise, and accurate responses.';

    if (info.menuItemId === 'explain-code') {
      prompt = `Explain the following code in detail:\n\n\`\`\`\n${selectedText}\n\`\`\`\n\nProvide: what it does, how it works, any potential issues, and best practices.`;
      systemInstruction = 'You are an expert software engineer. Explain code clearly and mention potential improvements.';
    } else if (info.menuItemId === 'summarize-selection') {
      prompt = `Provide a concise summary of the following text in 3-5 bullet points:\n\n${selectedText}`;
    } else if (info.menuItemId === 'translate-selection') {
      prompt = `Translate the following text to English. If it's already in English, improve its clarity:\n\n${selectedText}`;
    } else if (info.menuItemId === 'summarize-page') {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const body = document.body.innerText;
          return body.slice(0, 8000);
        },
      });
      prompt = `Summarize this webpage content in 5-7 key bullet points:\n\n${result.result}`;
    }

    const response = await geminiService.generateContent(prompt, '', systemInstruction);

    chrome.storage.local.set({
      lastContextMenuResult: {
        type: info.menuItemId,
        query: selectedText.slice(0, 200),
        response,
        timestamp: Date.now(),
      },
    });

    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_RESULT',
      payload: { result: response, feature: info.menuItemId },
    }).catch(() => {});

  } catch (error) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_ERROR',
      payload: { message: error.message },
    }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_CONTENT') {
    geminiService.init().then(() =>
      geminiService.generateContent(message.prompt, message.context, message.systemInstruction)
        .then((response) => sendResponse({ success: true, response }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
    );
    return true;
  }

  if (message.type === 'GET_PAGE_CONTENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => ({
            title: document.title,
            url: window.location.href,
            content: document.body.innerText.slice(0, 8000),
            isLeetCode: window.location.hostname.includes('leetcode.com'),
            selectedText: window.getSelection()?.toString() || '',
          }),
        }).then(([result]) => sendResponse({ success: true, data: result.result }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
      }
    });
    return true;
  }

  if (message.type === 'CLEAR_CACHE') {
    geminiService.clearCache();
    sendResponse({ success: true });
    return true;
  }
});
