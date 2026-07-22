const CHAT_INPUT_SELECTORS = [
  'textarea[data-testid="chat-input"]',
  'textarea[placeholder*="chat"]',
  'textarea[placeholder*="Chat"]',
  'div[contenteditable="true"][data-testid*="chat"]',
  'textarea',
];

const MAP_SELECTORS = [
  '[data-testid="match-map-name"]',
  '.match-map-name',
  '[class*="map"] img[alt*="de_"]',
  '[class*="voting"] [class*="map"]',
  'img[alt*="de_"]',
  '[class*="map-name"]',
  '[class*="match"] [class*="map"]',
];

function getMapName() {
  for (const sel of MAP_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) {
      if (el.tagName === 'IMG') {
        const alt = el.getAttribute('alt') || '';
        if (alt) return alt;
        const src = el.getAttribute('src') || '';
        const match = src.match(/(de_\w+)/);
        if (match) return match[1];
      }
      const text = el.textContent?.trim();
      if (text && text.length < 50) return text;
    }
  }

  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent || '';
    const match = text.match(/"map"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
  }

  const allText = document.body.innerText || '';
  const mapMatch = allText.match(/\b(de_[a-z0-9_]+)\b/i);
  if (mapMatch) return mapMatch[1].toLowerCase();

  return null;
}

function waitForElementByText(tag, text, timeout = 30000) {
  return new Promise((resolve) => {
    function find() {
      const elements = document.querySelectorAll(tag);
      for (const el of elements) {
        if (el.textContent?.trim().toLowerCase() === text.toLowerCase()) {
          return el;
        }
      }
      return null;
    }

    const found = find();
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const found = find();
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

function clickButtonByText(text) {
  const allButtons = document.querySelectorAll('button, a, [role="button"]');
  for (const btn of allButtons) {
    if (btn.textContent?.trim().toLowerCase() === text.toLowerCase()) {
      btn.click();
      return true;
    }
  }

  const xpath = `//*[text()="${text}"]`;
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  if (result.singleNodeValue) {
    result.singleNodeValue.click();
    return true;
  }

  return false;
}

function waitForChatInput(timeout = 30000) {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = timeout / 500;

    function checkInput() {
      attempts++;
      for (const sel of CHAT_INPUT_SELECTORS) {
        const el = document.querySelector(sel);
        if (el) return resolve(el);
      }

      if (attempts >= maxAttempts) return resolve(null);

      setTimeout(checkInput, 500);
    }

    checkInput();
  });
}

function typeText(input, text) {
  if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (input.isContentEditable) {
    input.focus();
    input.textContent = text;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  }

  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
  );
  input.dispatchEvent(
    new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
  );
  input.dispatchEvent(
    new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
  );

  const form = input.closest('form');
  if (form) {
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true }));
  }
}

async function connectAndSendMessage(message) {
  const connected =
    clickButtonByText('Connect to chat') ||
    clickButtonByText('Join chat') ||
    clickButtonByText('Connect');

  if (!connected) {
    const chatInput = await waitForChatInput(5000);
    if (chatInput) {
      typeText(chatInput, message);
      return true;
    }
    return false;
  }

  const input = await waitForChatInput(15000);
  if (input) {
    await new Promise((r) => setTimeout(r, 1000));
    typeText(input, message);
    return true;
  }

  return false;
}

async function trySend() {
  const mapName = getMapName();
  if (!mapName) return;

  const result = await chrome.storage.sync.get(['positions', 'enabled']);
  if (result.enabled === false) return;

  const positions = result.positions || {};
  let message = null;

  const mapKey = Object.keys(positions).find(
    (k) => mapName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(mapName.toLowerCase())
  );

  if (mapKey) {
    message = positions[mapKey];
  }

  if (!message) return;

  const connectBtn = await waitForElementByText('button', 'Connect to chat', 60000);
  if (!connectBtn) return;

  await connectAndSendMessage(message);
}

function startObserving() {
  if (window.location.pathname.includes('/room/')) {
    trySend();
  }

  let lastPath = window.location.pathname;
  const bodyObserver = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      if (lastPath.includes('/room/')) {
        setTimeout(trySend, 3000);
      }
    }
  });

  bodyObserver.observe(document.querySelector('main') || document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserving);
} else {
  startObserving();
}

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (location.pathname.includes('/room/')) {
      setTimeout(trySend, 3000);
    }
  }
}).observe(document, { subtree: true, childList: true });
