const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadApp({ fetchResponse } = {}) {
  const elements = new Map();
  const alerts = [];
  const preloads = [];

  function createElement() {
    const listeners = new Map();

    return {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      dispatch(type) {
        listeners.get(type)?.({ preventDefault() {} });
      },
      listeners,
      setAttribute(name, value) {
        this[name] = value;
      },
      src: '',
      style: {},
      textContent: '',
      value: '',
    };
  }

  function createPreload() {
    const listeners = new Map();

    const preload = {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      dispatch(type) {
        listeners.get(type)?.();
      },
      get src() {
        return this._src;
      },
      set src(value) {
        this._src = value;
      },
    };

    preloads.push(preload);
    return preload;
  }

  for (const id of ['img', 'info', 'pokeLogo', 'searchBox', 'searchForm']) {
    elements.set(id, createElement());
  }

  const context = {
    Image: function Image() {
      return createPreload();
    },
    Swal: { fire: (...args) => alerts.push(args) },
    document: { getElementById: (id) => elements.get(id) },
    fetch: async (...args) => typeof fetchResponse === 'function'
      ? fetchResponse(...args)
      : fetchResponse ?? ({ ok: true, json: async () => ({}) }),
  };

  const scriptPath = path.join(__dirname, '..', 'assets', 'js', 'script.js');
  vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), context);

  return { alerts, elements, preloads };
}

test('rejects decimal Pokédex entries on submission instead of truncating them', () => {
  const { alerts, elements } = loadApp();
  const searchBox = elements.get('searchBox');

  searchBox.value = '1.5';
  elements.get('searchForm').dispatch('submit');

  assert.deepEqual(alerts, [['Choose between 1 and 1025', '', 'warning']]);
  assert.equal(searchBox.value, '');
});

test('keeps the result hidden when the API returns an error response', async () => {
  const { alerts, elements } = loadApp({
    fetchResponse: { ok: false, json: async () => ({ name: 'should-not-display' }) },
  });
  const searchBox = elements.get('searchBox');
  const image = elements.get('img');

  searchBox.value = '25';
  elements.get('searchForm').dispatch('submit');
  await new Promise(setImmediate);

  assert.deepEqual(alerts, [['No Pokémon found', '', 'error']]);
  assert.equal(image.style.display, 'none');
  assert.equal(elements.get('info').textContent, '');
});

test('uses official artwork when the default sprite is unavailable', async () => {
  const { elements, preloads } = loadApp({
    fetchResponse: {
      ok: true,
      json: async () => ({
        name: 'pikachu',
        sprites: {
          front_default: null,
          other: { 'official-artwork': { front_default: 'official-pikachu.png' } },
        },
      }),
    },
  });
  const searchBox = elements.get('searchBox');

  searchBox.value = '25';
  elements.get('searchForm').dispatch('submit');
  await new Promise(setImmediate);
  preloads[0].dispatch('load');

  assert.equal(elements.get('img').src, 'official-pikachu.png');
  assert.equal(elements.get('info').textContent, 'PIKACHU');
});

test('does not replace a newer result when an earlier request finishes later', async () => {
  let resolveFirst;
  let resolveSecond;
  const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });
  const secondResponse = new Promise((resolve) => { resolveSecond = resolve; });
  const { elements, preloads } = loadApp({
    fetchResponse: (url) => url.endsWith('/1') ? firstResponse : secondResponse,
  });
  const searchBox = elements.get('searchBox');
  const searchForm = elements.get('searchForm');

  searchBox.value = '1';
  searchForm.dispatch('submit');
  searchBox.value = '2';
  searchForm.dispatch('submit');

  resolveSecond({
    ok: true,
    json: async () => ({ name: 'ivysaur', sprites: { front_default: 'ivysaur.png', other: {} } }),
  });
  await new Promise(setImmediate);
  preloads[0].dispatch('load');
  resolveFirst({
    ok: true,
    json: async () => ({ name: 'bulbasaur', sprites: { front_default: 'bulbasaur.png', other: {} } }),
  });
  await new Promise(setImmediate);

  assert.equal(elements.get('info').textContent, 'IVYSAUR');
  assert.equal(elements.get('img').src, 'ivysaur.png');
});

test('does not clear a partially typed entry before the user submits', () => {
  const { alerts, elements } = loadApp();
  const searchBox = elements.get('searchBox');

  searchBox.value = '1e';
  searchBox.dispatch('input');

  assert.deepEqual(alerts, []);
  assert.equal(searchBox.value, '1e');
});

test('does not show a pending result after an invalid submission', async () => {
  let resolveResponse;
  const response = new Promise((resolve) => { resolveResponse = resolve; });
  const { alerts, elements } = loadApp({ fetchResponse: () => response });
  const searchBox = elements.get('searchBox');
  const searchForm = elements.get('searchForm');

  searchBox.value = '1';
  searchForm.dispatch('submit');
  searchBox.value = '0';
  searchForm.dispatch('submit');
  resolveResponse({
    ok: true,
    json: async () => ({ name: 'bulbasaur', sprites: { front_default: 'bulbasaur.png', other: {} } }),
  });
  await new Promise(setImmediate);

  assert.deepEqual(alerts, [['Choose between 1 and 1025', '', 'warning']]);
  assert.equal(elements.get('img').style.display, 'none');
  assert.equal(elements.get('info').textContent, '');
});

test('hides the result when the artwork cannot be loaded', async () => {
  const { alerts, elements, preloads } = loadApp({
    fetchResponse: {
      ok: true,
      json: async () => ({ name: 'pikachu', sprites: { front_default: 'missing.png', other: {} } }),
    },
  });
  const searchBox = elements.get('searchBox');

  searchBox.value = '25';
  elements.get('searchForm').dispatch('submit');
  await new Promise(setImmediate);
  preloads[0].dispatch('error');

  assert.deepEqual(alerts, [['Pokémon artwork is unavailable', '', 'error']]);
  assert.equal(elements.get('img').style.display, 'none');
  assert.equal(elements.get('info').textContent, '');
});

test('reports a network error when the fetch request rejects', async () => {
  const { alerts, elements } = loadApp({
    fetchResponse: () => Promise.reject(new Error('offline')),
  });
  const searchBox = elements.get('searchBox');

  searchBox.value = '25';
  elements.get('searchForm').dispatch('submit');
  await new Promise(setImmediate);

  assert.deepEqual(alerts, [['There was a network error', '', 'error']]);
  assert.equal(elements.get('img').style.display, 'none');
  assert.equal(elements.get('info').textContent, '');
});

test('reports unavailable details when the API provides no usable artwork', async () => {
  const { alerts, elements } = loadApp({
    fetchResponse: {
      ok: true,
      json: async () => ({ name: 'mew', sprites: { front_default: null, other: {} } }),
    },
  });
  const searchBox = elements.get('searchBox');

  searchBox.value = '151';
  elements.get('searchForm').dispatch('submit');
  await new Promise(setImmediate);

  assert.deepEqual(alerts, [['Pokémon details are unavailable', '', 'error']]);
  assert.equal(elements.get('img').style.display, 'none');
  assert.equal(elements.get('info').textContent, '');
});

test('ignores an artwork error from an older result', async () => {
  let resolveFirst;
  let resolveSecond;
  const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });
  const secondResponse = new Promise((resolve) => { resolveSecond = resolve; });
  const { alerts, elements, preloads } = loadApp({
    fetchResponse: (url) => url.endsWith('/1') ? firstResponse : secondResponse,
  });
  const searchBox = elements.get('searchBox');
  const searchForm = elements.get('searchForm');

  searchBox.value = '1';
  searchForm.dispatch('submit');
  resolveFirst({
    ok: true,
    json: async () => ({ name: 'bulbasaur', sprites: { front_default: 'bulbasaur.png', other: {} } }),
  });
  await new Promise(setImmediate);

  searchBox.value = '2';
  searchForm.dispatch('submit');
  resolveSecond({
    ok: true,
    json: async () => ({ name: 'ivysaur', sprites: { front_default: 'ivysaur.png', other: {} } }),
  });
  await new Promise(setImmediate);
  preloads[0].dispatch('error');
  preloads[1].dispatch('load');

  assert.deepEqual(alerts, []);
  assert.equal(elements.get('img').src, 'ivysaur.png');
  assert.equal(elements.get('info').textContent, 'IVYSAUR');
});
