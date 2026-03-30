const OVERLAY_ID = 'intelligem-overlay';
const INLINE_PANEL_ID = 'intelligem-inline-panel';

const createOverlay = (content, type = 'info') => {
  removeOverlay();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 420px;
    max-height: 70vh;
    overflow-y: auto;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    border: 1px solid rgba(0,0,0,0.08);
    animation: intelligemSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes intelligemSlideIn {
      from { opacity: 0; transform: translateX(20px) scale(0.95); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    #intelligem-overlay::-webkit-scrollbar { width: 4px; }
    #intelligem-overlay::-webkit-scrollbar-track { background: transparent; }
    #intelligem-overlay::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
    .intelligem-header { 
      padding: 14px 16px 12px;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      background: white;
      border-radius: 16px 16px 0 0;
    }
    .intelligem-logo { display: flex; align-items: center; gap: 8px; }
    .intelligem-logo-icon { 
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #7C3AED, #2563EB);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 14px;
    }
    .intelligem-logo-text { font-size: 13px; font-weight: 700; color: #1a1a2e; }
    .intelligem-close {
      background: none; border: none; cursor: pointer;
      padding: 4px; border-radius: 6px;
      color: #6b7280; font-size: 16px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    .intelligem-close:hover { background: #f3f4f6; color: #1a1a2e; }
    .intelligem-content { padding: 16px; font-size: 14px; line-height: 1.7; color: #374151; }
    .intelligem-content p { margin-bottom: 8px; }
    .intelligem-content ul, .intelligem-content ol { padding-left: 20px; margin-bottom: 8px; }
    .intelligem-content li { margin-bottom: 4px; }
    .intelligem-content code { 
      background: #f3f4f6; padding: 1px 6px; border-radius: 4px;
      font-family: monospace; font-size: 12px; color: #7C3AED;
    }
    .intelligem-content pre {
      background: #1e1e2e; border-radius: 10px; padding: 12px;
      overflow-x: auto; margin: 10px 0;
      color: #cdd6f4; font-family: monospace; font-size: 12px; line-height: 1.6;
    }
    .intelligem-content pre code { background: transparent; color: inherit; padding: 0; }
    .intelligem-content strong { font-weight: 600; color: #1a1a2e; }
    .intelligem-content h1, .intelligem-content h2, .intelligem-content h3 { color: #1a1a2e; margin-bottom: 8px; }
    .intelligem-error { color: #EF4444; background: #fee2e2; padding: 10px; border-radius: 8px; }
    .intelligem-actions { padding: 12px 16px; border-top: 1px solid #f3f4f6; display: flex; gap: 8px; }
    .intelligem-btn {
      padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.15s;
    }
    .intelligem-btn-copy { background: #f3f4f6; color: #374151; }
    .intelligem-btn-copy:hover { background: #e5e7eb; }
    .intelligem-badge {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
      background: linear-gradient(135deg, #7C3AED22, #2563EB22);
      color: #7C3AED; text-transform: uppercase; letter-spacing: 0.5px;
    }
  `;

  document.head.appendChild(style);

  const header = document.createElement('div');
  header.className = 'intelligem-header';

  const logo = document.createElement('div');
  logo.className = 'intelligem-logo';
  logo.innerHTML = `<div class="intelligem-logo-icon">✨</div><div class="intelligem-logo-text">IntelliGEM</div>`;

  const rightGroup = document.createElement('div');
  rightGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const badge = document.createElement('span');
  badge.className = 'intelligem-badge';
  badge.textContent = type.replace(/-/g, ' ');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'intelligem-close';
  closeBtn.textContent = '✕';
  closeBtn.onclick = removeOverlay;

  rightGroup.appendChild(badge);
  rightGroup.appendChild(closeBtn);
  header.appendChild(logo);
  header.appendChild(rightGroup);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'intelligem-content';
  contentDiv.innerHTML = markdownToHtml(content);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'intelligem-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'intelligem-btn intelligem-btn-copy';
  copyBtn.textContent = '📋 Copy';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(content).then(() => {
      copyBtn.textContent = '✅ Copied!';
      setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
    });
  };

  actionsDiv.appendChild(copyBtn);

  overlay.appendChild(header);
  overlay.appendChild(contentDiv);
  overlay.appendChild(actionsDiv);
  document.body.appendChild(overlay);

  setTimeout(removeOverlay, 60000);
};

const removeOverlay = () => {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.style.animation = 'intelligemSlideIn 0.2s reverse';
    setTimeout(() => existing.remove(), 200);
  }
};

const markdownToHtml = (text) => {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|o|l|p])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_RESULT') {
    createOverlay(message.payload.result, message.payload.feature);
  }

  if (message.type === 'SHOW_ERROR') {
    createOverlay(`<div class="intelligem-error">❌ ${message.payload.message}</div>`, 'error');
  }

  if (message.type === 'SHOW_LOADING') {
    createOverlay('⏳ Generating response...', 'processing');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') removeOverlay();
});
