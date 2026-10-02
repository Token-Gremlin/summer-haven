import {
  HAIR,
  TOPS,
  BOTTOMS,
  SHOES,
  ACCESSORIES,
  SKIN,
  HAIR_COLORS,
  EYES,
  CLOTH,
  copyAppearance,
  DEFAULT_APPEARANCE,
  type Appearance,
} from '../data/appearance';
import { PRESETS, type Settings, type Save, type Quality } from '../core/save';
import { DAYLIGHT, formatTime } from '../data/time';
import type { ClimateOptions } from '../data/climate';
import { climatePanel } from './climate-panel';
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export interface UICallbacks {
  start: () => void;
  create: () => void;
  appearance: (a: Appearance) => void;
  confirm: (a: Appearance) => void;
  cancel: () => void;
  resume: () => void;
  settings: (s: Settings) => void;
  setTime: (t: number) => void;
  climate: (options:ClimateOptions) => void;
  recover: () => void;
  home: () => void;
  photo: () => void;
  capture: () => void;
  reset: () => void;
  rotate: (d: number) => void;
  dialogueClose: () => void;
}
export class UI {
  root = document.querySelector<HTMLElement>('#ui')!;
  mode = 'loading';
  category = 0;
  draft = copyAppearance(DEFAULT_APPEARANCE);
  toastTimer = 0;
  settings!: Settings;
  callbacks!: UICallbacks;
  constructor() {
    this.root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!b) return;
      this.action(b.dataset.action!, b);
    });
  }
  loading(message: string, p: number) {
    const text = document.querySelector('#load-message'),
      bar = document.querySelector<HTMLElement>('#progress');
    if (text) text.textContent = message;
    if (bar) bar.style.width = `${p * 100}%`;
  }
  title(saved: boolean) {
    this.mode = 'title';
    this.root.innerHTML = `<div class="title-screen"><div class="brand"><span>⌂</span> SUMMER HAVEN</div><span class="top-caption">A LIVING SUMMER WORLD</span><div class="title-copy"><p class="eyebrow">THE DAYS ARE LONG HERE</p><h1>Summer<br>Haven</h1><p class="intro">A little village, somewhere between the hills and the sea. An entire summer to call your own.</p><button class="primary" data-action="${saved ? 'start' : 'create'}">${saved ? 'Welcome home' : 'Make yourself at home'} <span>↗</span></button><div><button class="text-btn" data-action="settings">Settings & sound</button></div></div><div class="title-footer"><span>TAKE YOUR TIME. STAY A WHILE.</span><span>HILLS, RIVER, AND THE LONG WAY HOME</span></div></div>`;
  }
  creator(a: Appearance) {
    this.mode = 'creator';
    this.draft = copyAppearance(a);
    this.drawCreator();
  }
  drawCreator() {
    const a = this.draft;
    const choice = (key: keyof Appearance, labels: readonly string[]) =>
      `<div class="option-grid">${labels.map((l, i) => `<button class="option ${a[key] === i ? 'active' : ''}" data-action="choice" data-key="${key}" data-value="${i}">${l}</button>`).join('')}</div>`;
    const swatch = (key: keyof Appearance, colors: string[]) =>
      `<div class="swatches">${colors.map((c, i) => `<button class="swatch ${a[key] === i ? 'active' : ''}" style="--c:${c}" data-action="choice" data-key="${key}" data-value="${i}" aria-label="${key} ${i + 1}" title="${key} ${i + 1}"></button>`).join('')}</div>`;
    const field = (label: string, content: string) =>
      `<div class="field"><label>${label}</label>${content}</div>`;
    let content = '';
    if (this.category === 0)
      content =
        field(
          'What should we call you?',
          `<input id="character-name" type="text" value="${esc(a.name)}" maxlength="24" aria-label="Character name">`,
        ) +
        field(
          'Body',
          `<div class="segmented"><button class="option ${a.body === 'feminine' ? 'active' : ''}" data-action="body" data-value="feminine">Feminine</button><button class="option ${a.body === 'masculine' ? 'active' : ''}" data-action="body" data-value="masculine">Masculine</button></div>`,
        ) +
        field('Skin tone', swatch('skin', SKIN)) +
        field('Features', choice('face', ['Soft', 'Defined', 'Gentle']));
    if (this.category === 1)
      content =
        field('A little personality', choice('hair', HAIR)) +
        field('Hair color', swatch('hairColor', HAIR_COLORS)) +
        field('Eye color', swatch('eyes', EYES));
    if (this.category === 2)
      content =
        field('Top', choice('top', TOPS)) +
        field('Color', swatch('topColor', CLOTH)) +
        field('Bottom', choice('bottom', BOTTOMS)) +
        field('Color', swatch('bottomColor', CLOTH)) +
        field('Shoes', choice('shoes', SHOES));
    if (this.category === 3)
      content =
        field(
          'The finishing touches',
          ACCESSORIES.map(
            (label, i) =>
              `<label class="check-line"><input type="checkbox" data-accessory="${i}" ${a.accessories[i] ? 'checked' : ''}>${label}</label>`,
          ).join(''),
        ) +
        '<p class="small">Bring a sunhat for the fields, a bag for your little finds, or simply yourself.</p>';
    this.root.innerHTML = `<div class="creator-header"><p class="eyebrow">BEFORE THE SUMMER BEGINS</p><h2>You, this summer.</h2><p>A familiar face in a new place.<br>There is no wrong way to belong.</p></div><section class="creator-panel"><div class="panel-title"><span>MAKE YOURSELF AT HOME</span><span>✳</span></div><nav class="tabs">${['Character', 'Hair', 'Outfit', 'Details'].map((t, i) => `<button data-action="tab" data-value="${i}" class="${this.category === i ? 'active' : ''}">${t}</button>`).join('')}</nav><div class="creator-fields">${content}</div><footer class="creator-footer"><div class="creator-subactions"><button data-action="reset-appearance">Reset appearance</button><button data-action="cancel">Return</button></div><button class="primary green" data-action="confirm">This feels like me <span>↗</span></button><p class="status-note">You can change again at your wardrobe.</p></footer></section><div class="preview-tools"><button data-action="rotate-left" aria-label="Rotate left">↶</button><span>DRAG TO ROTATE · SCROLL TO ZOOM</span><button data-action="rotate-right" aria-label="Rotate right">↷</button></div>`;
    document.querySelector('#character-name')?.addEventListener('input', (e) => {
      a.name = (e.target as HTMLInputElement).value;
    });
    this.root.querySelectorAll<HTMLInputElement>('[data-accessory]').forEach((i) =>
      i.addEventListener('change', () => {
        a.accessories[Number(i.dataset.accessory)] = i.checked;
        this.callbacks.appearance(a);
      }),
    );
  }
  hud() {
    this.mode = 'play';
    this.root.innerHTML = `<div class="hud"><div class="location"><div class="location-icon">⌂</div><div><p class="eyebrow">SUMMER HAVEN</p><h3 id="location">Haven village</h3></div></div><button class="clock" data-action="time" aria-label="Change time of day" title="Time of day · T"><span id="weather-icon">☀</span><span id="clock">14:20</span><kbd>T</kbd></button><div class="hud-bottom"><button data-action="journal"><kbd>J</kbd> JOURNAL</button><button data-action="photo"><kbd>P</kbd> PHOTO</button><button data-action="climate"><kbd>K</kbd> WEATHER</button><button data-action="pause"><kbd>ESC</kbd> PAUSE</button></div><div class="movement-hint"><kbd>W A S D</kbd> walk &nbsp; <kbd>SHIFT</kbd> jog &nbsp; DRAG to look</div><div id="prompt"></div></div><div class="vignette"></div>`;
  }
  updateHud(location: string, clock: string, prompt: string, key = 'E') {
    const loc = document.querySelector('#location'),
      time = document.querySelector('#clock'),
      p = document.querySelector<HTMLElement>('#prompt');
    if (loc) loc.textContent = location;
    if (time) time.textContent = clock;
    if (p) {
      p.style.display = prompt ? 'block' : 'none';
      p.innerHTML = prompt ? `<kbd>${key}</kbd>${esc(prompt)}` : '';
    }
  }
  pause() {
    this.mode = 'pause';
    this.root.innerHTML = `<div class="scrim"><section class="modal"><p class="eyebrow">THE VILLAGE CAN WAIT</p><h2>A little pause.</h2><div class="menu-list"><button data-action="resume">Return to the afternoon <span>↗</span></button><button data-action="time">Choose the light <span>☀</span></button><button data-action="climate">Weather & seasons <span>❧</span></button><button data-action="settings">Settings & sound <span>＋</span></button><button data-action="journal">Your summer journal <span>↗</span></button><button data-action="recover">Bring my bicycle nearby <span>♧</span></button><button data-action="home">Return safely to my house <span>⌂</span></button><button data-action="reset-game">Start a new summer <span>↺</span></button></div><p class="small">Your appearance, settings, discoveries, and a safe return location are saved on this device.</p></section></div>`;
  }
  showSettings(s: Settings) {
    this.mode = 'settings';
    this.settings = { ...s };
    const row = (label: string, key: keyof Settings, min = 0, max = 1, step = 0.05) =>
      `<label class="setting-row">${label}<input data-setting="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}" aria-label="${label}"></label>`;
    const check = (label: string, key: keyof Settings) =>
      `<label class="setting-row">${label}<input type="checkbox" data-setting="${key}" ${s[key] ? 'checked' : ''}></label>`;
    const select = (label: string, key: keyof Settings, options: [string, string][]) =>
      `<label class="setting-row">${label}<select data-setting="${key}">${options.map(([v, l]) => `<option value="${v}" ${String(s[key]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    this.root.innerHTML = `<div class="scrim"><section class="modal settings"><div class="modal-head"><p class="eyebrow">MAKE YOURSELF COMFORTABLE</p><button class="close" data-action="resume" aria-label="Close settings">×</button></div><h2>Just your pace.</h2>${select(
      'Quality preset',
      'quality',
      [
        ['low', 'Low'],
        ['medium', 'Medium'],
        ['high', 'High'],
        ['ultra', 'Ultra'],
      ],
    )}<p class="small quality-help">Low prioritizes speed. Medium balances detail and response. High and Ultra add denser scenery, finer shadows and richer light.</p><h3>Scenery visibility</h3>${select(
      'Render scenery',
      'visibility',
      [
        ['nearby', 'As I approach · smoother'],
        ['full', 'Entire landscape · longest view'],
      ],
    )}<p class="small">${s.visibility === 'full' ? 'Keep every area of the village visible at any distance. Detail and vegetation density still follow your quality settings. More demanding on your GPU.' : 'Nearby scenery stays detailed. Distant objects fade in gradually; mountains and the ground remain visible.'}</p>${s.visibility === 'nearby' ? row('Scenery distance (m)', 'distance', 60, 500, 10) : ''}<h3>Picture</h3>${row('Resolution scale', 'resolution', 0.5, 1.5, 0.05)}${select(
      'Shadows',
      'shadows',
      [
        ['512', 'Soft / 512'],
        ['1024', 'Medium / 1024'],
        ['2048', 'High / 2048'],
        ['4096', 'Ultra / 4096'],
      ],
    )}${row('Vegetation density', 'vegetation', 0.25, 1, 0.05)}${check('Water reflections', 'reflections')}${select(
      'Anti-aliasing',
      'aa',
      [
        ['1', 'FXAA · faster'],
        ['0', 'SMAA'],
        ['2', '2× MSAA'],
        ['4', '4× MSAA'],
      ],
    )}${check('Painterly post-processing', 'post')}<h3>Sound</h3>${row('Master volume', 'master')}${row('Countryside ambience', 'ambience')}${row('Bicycle & effects', 'effects')}<h3>Camera & time</h3>${row('Mouse sensitivity', 'sensitivity', 0.25, 2, 0.05)}${check('Invert vertical look', 'invertY')}${check('Hold this time of day', 'freezeTime')}<button class="text-btn" data-action="time">Choose time of day ↗</button><button class="text-btn" data-action="climate">Weather & seasons ↗</button>${check('Show gentle hints', 'hints')}<p class="small">Drag the view to look around. Scroll to move closer. All changes are saved automatically.</p></section></div>`;
    this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]').forEach((el) =>
      el.addEventListener('input', () => {
        const k = el.dataset.setting as keyof Settings;
        const value =
          el instanceof HTMLInputElement && el.type === 'checkbox'
            ? el.checked
            : k === 'quality' || k === 'visibility'
              ? el.value
              : Number(el.value);
        (this.settings as unknown as Record<string, unknown>)[k] = value;
        if (k === 'quality') Object.assign(this.settings, PRESETS[value as Quality]);
        this.callbacks.settings(this.settings);
        if (k === 'quality' || k === 'visibility') this.showSettings(this.settings);
      }),
    );
  }
  dialogue(name: string, text: string) {
    this.mode = 'dialogue';
    this.root.innerHTML = `<div class="dialogue"><p class="speaker">${esc(name)}</p><p class="words">${esc(text)}</p><div class="dialogue-actions"><button data-action="dialogue-close">Continue &nbsp; <kbd>E</kbd></button></div></div>`;
  }
  showTime(time: number, settings: Settings, season = 'summer') {
    this.mode = 'time';
    this.settings = { ...settings };
    this.root.innerHTML = `<section class="time-panel"><div class="modal-head"><p class="eyebrow">AN AFTERNOON OF YOUR OWN</p><button class="close" data-action="resume" aria-label="Close time controls">×</button></div><h2>Chase the light.</h2><p class="small">Find your favorite light. The view changes as you slide.</p><div class="time-display"><span id="time-label">${formatTime(time)}</span><span>${season.toUpperCase()} / HAVEN VILLAGE</span></div><label class="time-slider-label"><span>14:00</span><span>20:30</span><input id="daylight-slider" aria-label="Time of day" type="range" min="0" max="1" step="0.0025" value="${time}"></label><div class="daylight-presets">${DAYLIGHT.map((p) => `<button data-time="${p.time}" title="${p.description}"><span>${p.icon}</span>${p.label}</button>`).join('')}</div><label class="setting-row">Keep this light<input id="hold-time" type="checkbox" ${settings.freezeTime ? 'checked' : ''}></label><label class="setting-row">Passing of time <output id="time-speed-label">${settings.timeSpeed}×</output><input id="time-speed" type="range" min="0.25" max="4" step="0.25" value="${settings.timeSpeed}" aria-label="Time speed"></label><p class="small">Time pauses while you choose. Drag the scenery to look around.</p><button class="primary green" data-action="resume">Stay in this moment <span>↗</span></button><button class="text-btn" data-action="climate">Weather & seasons ↗</button><p class="status-note">T to return here, or click the clock.</p></section>`;
    const slider = this.root.querySelector<HTMLInputElement>('#daylight-slider')!;
    const set = (value: number) => {
      slider.value = String(value);
      this.root.querySelector('#time-label')!.textContent = formatTime(value);
      this.root.querySelectorAll<HTMLButtonElement>('[data-time]').forEach((b) => {
        const active = Math.abs(Number(b.dataset.time) - value) < 0.015;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      this.callbacks.setTime(value);
    };
    slider.addEventListener('input', () => set(Number(slider.value)));
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-time]')
      .forEach((b) => b.addEventListener('click', () => set(Number(b.dataset.time))));
    this.root.querySelector<HTMLInputElement>('#hold-time')!.addEventListener('change', (e) => {
      this.settings.freezeTime = (e.target as HTMLInputElement).checked;
      this.callbacks.settings(this.settings);
    });
    this.root.querySelector<HTMLInputElement>('#time-speed')!.addEventListener('input', (e) => {
      this.settings.timeSpeed = Number((e.target as HTMLInputElement).value);
      this.root.querySelector('#time-speed-label')!.textContent = `${this.settings.timeSpeed}×`;
      this.callbacks.settings(this.settings);
    });
  }
  showClimate(options:ClimateOptions){
    this.mode='climate';
    climatePanel(this.root,options,this.callbacks.climate);
  }
  journal(s: Save) {
    this.mode = 'journal';
    const acts = [
      [
        'cat',
        'A familiar orange face',
        s.activities.cat === 2
          ? 'Mikan was sleeping beside the café. Aya is relieved.'
          : s.activities.cat === 1
            ? 'Aya’s cat has found a cool place to nap. Try the shaded side of the café.'
            : 'Say hello to Aya, the gardener by your house.',
      ],
      [
        'delivery',
        'Something for the workshop',
        s.activities.delivery === 2
          ? 'The parcel is with Ren. The workshop smells of fresh cedar.'
          : s.activities.delivery === 1
            ? 'A small parcel from Mori’s shop. Ren is working near the southern street.'
            : 'Mori at the general store could use a small favor.',
      ],
      [
        'photo',
        'The whole afternoon',
        s.activities.photo === 2
          ? 'A photograph from Windbell hill, to remember this summer.'
          : s.activities.photo === 1
            ? 'Follow the field path uphill. Photograph the view from Windbell hill.'
            : 'Sora knows a lovely place above the fields.',
      ],
    ];
    this.root.innerHTML = `<div class="scrim"><section class="modal journal"><div class="modal-head"><p class="eyebrow">${esc(s.appearance.name.toUpperCase())}’S SUMMER</p><button class="close" data-action="resume" aria-label="Close journal">×</button></div><h2>Little things.</h2><p class="small">No hurry. No checklist to finish.<br>Just a few reasons to take the long way.</p>${acts.map(([id, title, desc]) => `<article><div class="stamp">${s.activities[id] === 2 ? '✓' : '✳'}</div><div><h3>${title}</h3><p>${desc}</p></div></article>`).join('')}<p class="small">${s.discoveries.length} familiar places · saved on this device</p></section></div>`;
  }
  photo() {
    this.mode = 'photo';
    this.root.innerHTML = `<div class="photo-top">SUMMER HAVEN / A MOMENT TO KEEP</div><div class="photo-controls"><span>DRAG · orbit &nbsp; WASD · frame &nbsp; R / C · height</span><button data-action="capture">◉ &nbsp; Take photograph</button><button data-action="hide-photo">H &nbsp; Hide UI</button><button data-action="resume">Return</button></div>`;
  }
  toast(text: string) {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    this.root.append(el);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.remove(), 4500);
  }
  action(action: string, el: HTMLElement) {
    const cb = this.callbacks;
    if (action === 'tab') {
      this.category = Number(el.dataset.value);
      this.drawCreator();
      return;
    }
    if (action === 'body') {
      if (this.draft.body !== el.dataset.value && (this.draft.hair === 0 || this.draft.hair === 4))
        this.draft.hair = el.dataset.value === 'masculine' ? 4 : 0;
      this.draft.body = el.dataset.value as Appearance['body'];
      cb.appearance(this.draft);
      this.drawCreator();
      return;
    }
    if (action === 'choice') {
      (this.draft as unknown as Record<string, unknown>)[el.dataset.key!] = Number(el.dataset.value);
      cb.appearance(this.draft);
      this.drawCreator();
      return;
    }
    if (action === 'reset-appearance') {
      this.draft = copyAppearance(DEFAULT_APPEARANCE);
      cb.appearance(this.draft);
      this.drawCreator();
      return;
    }
    if (action === 'confirm') {
      this.draft.name = this.draft.name.trim() || 'Haru';
      cb.confirm(this.draft);
      return;
    }
    if (action === 'rotate-left' || action === 'rotate-right') {
      cb.rotate(action === 'rotate-left' ? -0.4 : 0.4);
      return;
    }
    if (action === 'hide-photo') {
      this.root.classList.toggle('photo-hidden');
      return;
    }
    if (action === 'reset-game') {
      this.root.innerHTML = `<div class="scrim"><section class="modal"><h2>A new summer?</h2><p class="small">This replaces your character, discoveries and activities on this device.</p><br><button class="primary green" data-action="confirm-reset">Start fresh</button><button class="text-btn" data-action="resume"> &nbsp; Keep this summer</button></section></div>`;
      return;
    }
    if (action === 'confirm-reset') {
      cb.reset();
      return;
    }
    if (action === 'dialogue-close') {
      cb.dialogueClose();
      return;
    }
    this.root.dispatchEvent(new CustomEvent('ui-action', { detail: action }));
  }
}
