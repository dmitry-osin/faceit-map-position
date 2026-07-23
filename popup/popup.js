const DEFAULT_POSITIONS = {
  'de_mirage': 'mid / a',
  'de_inferno': 'mid / b',
  'de_dust2': 'a long / mid',
  'de_nuke': 'outside / ramp',
  'de_overpass': 'water / a short',
  'de_ancient': 'mid / b',
  'de_vertigo': 'mid / b',
  'de_anubis': 'mid / a',
  'de_cache': 'mid / a',
};

const MAP_NAMES = {
  'de_mirage': 'Mirage',
  'de_inferno': 'Inferno',
  'de_dust2': 'Dust 2',
  'de_nuke': 'Nuke',
  'de_overpass': 'Overpass',
  'de_ancient': 'Ancient',
  'de_vertigo': 'Vertigo',
  'de_anubis': 'Anubis',
  'de_cache': 'Cache',
};

const LOCALES = {
  en: {
    enabledTitle: 'Extension active',
    enabledDesc: 'Auto-send position to chat',
    mapSettings: 'Map Settings',
    addMap: 'Add map',
    save: 'Save',
    reset: 'Reset',
    saved: 'Saved!',
    addAtLeastOne: 'Add at least one map',
    resetConfirm: 'Reset all settings?',
    cancel: 'Cancel',
    welcomeText: 'This extension has no viruses, keyloggers, or miners. It is fully open source. Report bugs in Issues, suggest ideas in Discussions, submit features via Pull Requests.',
    welcomeIssues: 'Issues',
    welcomeDiscussions: 'Discussions',
    welcomePullRequests: 'Pull Requests',
    introTitle: 'Welcome to Faceit Map Position',
    introGotIt: 'Got it',
    mapCount: (n) => `${n} ${n === 1 ? 'map' : 'maps'}`,
  },
  ru: {
    enabledTitle: 'Расширение активно',
    enabledDesc: 'Автоматически отправлять позицию в чат',
    mapSettings: 'Настройка карт',
    addMap: 'Добавить карту',
    save: 'Сохранить',
    reset: 'Сбросить',
    saved: 'Сохранено!',
    addAtLeastOne: 'Добавьте хотя бы одну карту',
    resetConfirm: 'Сбросить все настройки?',
    cancel: 'Отмена',
    welcomeText: 'Расширение не содержит вирусов, кейлоггеров или майнеров. Исходный код полностью открыт. Сообщайте о багах в Issues, предлагайте идеи в Discussions, добавляйте фичи через Pull Requests.',
    welcomeIssues: 'Issues',
    welcomeDiscussions: 'Discussions',
    welcomePullRequests: 'Pull Requests',
    introTitle: 'Добро пожаловать в Faceit Map Position',
    introGotIt: 'Понятно',
    mapCount: (n) => {
      if (n === 1) return `${n} карта`;
      if (n < 5) return `${n} карты`;
      return `${n} карт`;
    },
  },
};

const mapsList = document.getElementById('maps-list');
const addBtn = document.getElementById('add-map');
const saveBtn = document.getElementById('save');
const resetBtn = document.getElementById('reset');
const enabledCheckbox = document.getElementById('enabled');
const statusEl = document.getElementById('status');
const mapCountEl = document.getElementById('map-count');
const themeBtns = document.querySelectorAll('.theme-btn');
const langBtn = document.getElementById('lang-btn');
const modal = document.getElementById('modal');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const welcomeEl = document.getElementById('welcome');
const welcomeClose = document.getElementById('welcome-close');
const introModal = document.getElementById('modal-intro');
const introGotIt = document.getElementById('intro-gotit');

let savedState = null;
let currentTheme = 'dark';
let currentLang = 'en';

function t(key, ...args) {
  const hasOverride = currentLang !== chrome.i18n.getUILanguage().slice(0, 2);
  if (!hasOverride && typeof LOCALES[currentLang][key] !== 'function') {
    const msg = chrome.i18n.getMessage(key);
    if (msg) return msg;
  }
  const msg = LOCALES[currentLang][key];
  return typeof msg === 'function' ? msg(...args) : msg;
}

function applyLang(lang) {
  currentLang = lang;
  langBtn.textContent = lang === 'en' ? 'EN' : 'RU';
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  updateMapCount();
  chrome.storage.sync.set({ lang });
}

function getMapDisplayName(key) {
  return MAP_NAMES[key] || key;
}

function updateMapCount() {
  const count = mapsList.querySelectorAll('.map-item').length;
  mapCountEl.textContent = t('mapCount', count);
}

function checkChanges() {
  if (!savedState) {
    saveBtn.disabled = true;
    return;
  }

  const current = {
    enabled: enabledCheckbox.checked,
    positions: getPositionsFromDOM(),
  };

  const changed =
    current.enabled !== savedState.enabled ||
    JSON.stringify(current.positions) !== JSON.stringify(savedState.positions);

  saveBtn.disabled = !changed;
}

function createMapItem(key, value) {
  const div = document.createElement('div');
  div.className = 'map-item';

  const row = document.createElement('div');
  row.className = 'row';

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'map-key';
  keyInput.value = key;
  keyInput.placeholder = 'de_mirage';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-remove';
  removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  removeBtn.addEventListener('click', () => {
    div.remove();
    updateMapCount();
    checkChanges();
  });

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.className = 'map-value';
  valueInput.value = value;
  valueInput.placeholder = 'mid / a';

  const nameHint = document.createElement('div');
  nameHint.className = 'map-name';

  function updateHint() {
    const displayName = getMapDisplayName(keyInput.value.trim());
    nameHint.textContent = displayName && displayName !== keyInput.value.trim()
      ? `${displayName}`
      : '';
  }

  keyInput.addEventListener('input', () => {
    updateHint();
    checkChanges();
  });
  keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') valueInput.focus();
  });
  valueInput.addEventListener('input', checkChanges);
  valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.focus();
  });

  row.appendChild(keyInput);
  row.appendChild(removeBtn);
  div.appendChild(row);
  div.appendChild(valueInput);
  div.appendChild(nameHint);

  setTimeout(updateHint, 0);

  return div;
}

function renderPositions() {
  mapsList.innerHTML = '';
  for (const [key, value] of Object.entries(savedState?.positions || {})) {
    mapsList.appendChild(createMapItem(key, value));
  }
  updateMapCount();
}

function getPositionsFromDOM() {
  const result = {};
  const items = mapsList.querySelectorAll('.map-item');
  for (const item of items) {
    const key = item.querySelector('.map-key').value.trim();
    const value = item.querySelector('.map-value').value.trim();
    if (key && value) {
      result[key] = value;
    }
  }
  return result;
}

function showConfirm(text) {
  return new Promise((resolve) => {
    modal.querySelector('[data-i18n="resetConfirm"]').textContent = text;
    modal.classList.add('open');

    function cleanup() {
      modal.classList.remove('open');
      modalConfirm.removeEventListener('click', onConfirm);
      modalCancel.removeEventListener('click', onCancel);
    }

    function onConfirm() {
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    modalConfirm.addEventListener('click', onConfirm);
    modalCancel.addEventListener('click', onCancel);
  });
}

function showStatus(text, type = 'success') {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
  clearTimeout(statusEl._timeout);
  statusEl._timeout = setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status';
  }, 2500);
}

function applyTheme(theme) {
  currentTheme = theme;
  document.body.className = `theme-${theme}`;
  themeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  chrome.storage.sync.set({ theme });
}

introGotIt.addEventListener('click', () => {
  introModal.classList.remove('open');
  chrome.storage.sync.set({ introSeen: true });
});

langBtn.addEventListener('click', () => {
  applyLang(currentLang === 'en' ? 'ru' : 'en');
});

addBtn.addEventListener('click', () => {
  const item = createMapItem('', '');
  mapsList.appendChild(item);
  item.querySelector('.map-key').focus();
  updateMapCount();
  checkChanges();
});

saveBtn.addEventListener('click', () => {
  const data = getPositionsFromDOM();
  if (Object.keys(data).length === 0) {
    showStatus(t('addAtLeastOne'), 'error');
    return;
  }

  chrome.storage.sync.set(
    { positions: data, enabled: enabledCheckbox.checked },
    () => {
      savedState = { positions: data, enabled: enabledCheckbox.checked };
      showStatus(t('saved'));
      checkChanges();
    }
  );
});

resetBtn.addEventListener('click', async () => {
  const ok = await showConfirm(t('resetConfirm'));
  if (!ok) return;
  savedState = { positions: { ...DEFAULT_POSITIONS }, enabled: true };
  enabledCheckbox.checked = true;
  renderPositions();
  saveBtn.click();
});

themeBtns.forEach((btn) => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

enabledCheckbox.addEventListener('change', checkChanges);

chrome.storage.sync.get(['positions', 'enabled', 'theme', 'lang', 'introSeen'], (result) => {
  const p = result.positions && Object.keys(result.positions).length > 0
    ? result.positions
    : { ...DEFAULT_POSITIONS };

  if (result.enabled !== undefined) {
    enabledCheckbox.checked = result.enabled;
  }

  savedState = { positions: p, enabled: enabledCheckbox.checked };
  applyTheme(result.theme || 'dark');
  applyLang(result.lang || 'en');
  renderPositions();
  checkChanges();

  if (!result.introSeen) {
    introModal.classList.add('open');
  }
});
