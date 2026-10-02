import { DEFAULT_CLIMATE, SEASONS, WEATHERS, type ClimateOptions } from '../data/climate';

const seasonCopy = [
  ['✿', 'Spring', 'Fresh greens & drifting petals'],
  ['☀', 'Summer', 'Deep canopies & long warm days'],
  ['❧', 'Autumn', 'Copper leaves & amber fields'],
  ['❄', 'Winter', 'Quiet branches & snow-covered hills'],
];
const weatherCopy = [
  ['☀', 'Fair skies'],
  ['☁', 'Overcast'],
  ['☂', 'Rain'],
  ['❄', 'Snowfall'],
];
export function climatePanel(
  root: HTMLElement,
  options: ClimateOptions,
  change: (options: ClimateOptions) => void,
) {
  const draft = { ...options };
  const slider = (name: string, key: 'intensity' | 'clouds' | 'wind', hint: string) =>
    `<label class="climate-slider"><span>${name}<output data-climate-output="${key}">${Math.round(draft[key] * 100)}%</output></span><input type="range" data-climate="${key}" min="0" max="1" step="0.01" value="${draft[key]}" aria-label="${name}"><small>${hint}</small></label>`;
  root.innerHTML = `<section class="time-panel climate-panel" aria-label="Weather and seasons">
    <div class="modal-head"><p class="eyebrow">THE VALLEY, THROUGH THE YEAR</p><button class="close" data-action="resume" aria-label="Close weather controls">×</button></div>
    <h2>A change in the air.</h2><p class="small">Choose a season. Watch the whole landscape settle into it.</p>
    <div class="season-grid">${SEASONS.map((s, i) => `<button data-season="${s}" class="${draft.season === s ? 'active' : ''}" aria-pressed="${draft.season === s}"><span>${seasonCopy[i][0]}</span><strong>${seasonCopy[i][1]}</strong><small>${seasonCopy[i][2]}</small></button>`).join('')}</div>
    <h3>Overhead</h3><div class="weather-grid">${WEATHERS.map((w, i) => `<button data-weather="${w}" class="${draft.weather === w ? 'active' : ''}" aria-pressed="${draft.weather === w}"><span>${weatherCopy[i][0]}</span>${weatherCopy[i][1]}</button>`).join('')}</div>
    ${slider('Cloud cover', 'clouds', 'From open blue skies to a deep cloud deck.')}
    ${slider('Rain / snow intensity', 'intensity', 'Precipitation settles in gradually.')}
    <h3>Feel the breeze</h3>${slider('Wind strength', 'wind', 'Leaves, grass, falling rain and snow share the same air.')}
    <label class="setting-row">Wind toward<select id="wind-direction" aria-label="Wind direction">${[
      [0, 'North'],
      [45, 'Northeast'],
      [90, 'East'],
      [135, 'Southeast'],
      [180, 'South'],
      [225, 'Southwest'],
      [270, 'West'],
      [315, 'Northwest'],
    ]
      .map(
        ([n, label]) =>
          `<option value="${n}" ${(Math.round(draft.direction / 45) * 45) % 360 === n ? 'selected' : ''}>${label}</option>`,
      )
      .join('')}</select></label>
    <label class="setting-row">Let the weather change<input id="weather-automatic" type="checkbox" ${draft.automatic ? 'checked' : ''}></label>
    <p class="small">${draft.automatic ? 'Slow weather fronts move through the valley while you explore.' : 'Your chosen weather stays until you change it.'} Graphics quality controls cloud detail and particle density.</p>
    <div class="climate-links"><button class="text-btn" data-action="time">Choose the light ↗</button><button class="text-btn" id="reset-weather">Summer defaults</button></div>
    <button class="primary green" data-action="resume">Step into the season <span>↗</span></button><p class="status-note">K to return · saved on this device</p>
  </section>`;
  const commit = () => change({ ...draft });
  root.querySelectorAll<HTMLButtonElement>('[data-season]').forEach((b) =>
    b.addEventListener('click', () => {
      draft.season = b.dataset.season as ClimateOptions['season'];
      commit();
      climatePanel(root, draft, change);
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-weather]').forEach((b) =>
    b.addEventListener('click', () => {
      draft.weather = b.dataset.weather as ClimateOptions['weather'];
      draft.automatic = false;
      commit();
      climatePanel(root, draft, change);
    }),
  );
  root.querySelectorAll<HTMLInputElement>('[data-climate]').forEach((input) =>
    input.addEventListener('input', () => {
      const key = input.dataset.climate as 'intensity' | 'clouds' | 'wind';
      draft[key] = Number(input.value);
      root.querySelector(`[data-climate-output="${key}"]`)!.textContent = `${Math.round(draft[key] * 100)}%`;
      commit();
    }),
  );
  root.querySelector<HTMLSelectElement>('#wind-direction')!.addEventListener('change', (e) => {
    draft.direction = Number((e.target as HTMLSelectElement).value);
    commit();
  });
  root.querySelector<HTMLInputElement>('#weather-automatic')!.addEventListener('change', (e) => {
    draft.automatic = (e.target as HTMLInputElement).checked;
    commit();
    climatePanel(root, draft, change);
  });
  root.querySelector('#reset-weather')!.addEventListener('click', () => {
    change({ ...DEFAULT_CLIMATE });
    climatePanel(root, DEFAULT_CLIMATE, change);
  });
}
