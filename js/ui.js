const $ = (id) => document.getElementById(id);

const dom = {
    q: $('search-input'),
    clear: $('clear-search'),
    drop: $('autocomplete-dropdown'),
    chips: $('quick-pills'),
    themeBtn: $('theme-toggle'),
    unitBtn: $('unit-toggle'),
    unitLbl: $('unit-label'),
    precipBtn: $('precip-toggle'),
    precipLbl: $('precip-label'),
    geoBtn: $('geo-btn'),
    toast: $('toast-notification'),
    toastMsg: $('toast-message'),

    empty: $('state-empty'),
    loading: $('state-loading'),
    dash: $('state-dashboard'),

    city: $('weather-city'),
    region: $('weather-region'),
    time: $('weather-time'),
    temp: $('weather-temp'),
    tempUnit: $('weather-unit-symbol'),
    condIcon: $('condition-icon-container'),
    cond: $('weather-condition'),
    high: $('weather-high'),
    low: $('weather-low'),
    feels: $('weather-feels'),

    humidity: $('metric-humidity'),
    humidityNote: $('metric-humidity-desc'),
    wind: $('metric-wind'),
    windNote: $('metric-wind-desc'),
    uv: $('metric-uv'),
    uvNote: $('metric-uv-desc'),
    pressure: $('metric-pressure'),
    pressureNote: $('metric-pressure-desc'),

    hours: $('hourly-scroll'),
    days: $('forecast-list')
};

const fmtTemp = (v) => `${Math.round(v)}°`;
const unitSym = () => state.unit === 'fahrenheit' ? '°F' : '°C';
const precipSym = () => state.precipUnit === 'inch' ? 'in' : 'mm';

function fmtPrecip(v) {
    const n = Number(v) || 0;
    return `${n.toFixed(n > 0 && n < 0.1 ? 2 : 1)} ${precipSym()}`;
}

function setThemeIcon(theme) {
    dom.themeBtn.innerHTML = `<i data-lucide="${theme === 'light' ? 'moon' : 'sun'}"></i>`;
    lucide.createIcons();
}

function paintUnits() {
    dom.unitLbl.textContent = unitSym();
    dom.precipLbl.textContent = precipSym();
}

function renderSuggest(rows) {
    dom.drop.innerHTML = '';
    state.idx = -1;

    if (!rows?.length) {
        closeSuggest();
        return;
    }

    rows.forEach((loc) => {
        const el = document.createElement('div');
        el.className = 'sug-item';
        el.setAttribute('role', 'option');

        const region = [loc.admin1, loc.country].filter(Boolean).join(', ');
        el.innerHTML = `
            <span class="sug-city"><i data-lucide="map-pin"></i>${loc.name}</span>
            <span class="sug-region">${region}</span>
        `;

        el.addEventListener('click', () => {
            dom.q.value = loc.name;
            closeSuggest();
            loadWx(loc);
        });

        dom.drop.appendChild(el);
    });

    dom.drop.classList.remove('hidden');
    dom.q.setAttribute('aria-expanded', 'true');
    lucide.createIcons();
}

function highlight(items) {
    items.forEach((el, i) => {
        el.classList.toggle('highlighted', i === state.idx);
    });

    const cur = items[state.idx];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
}

function closeSuggest() {
    dom.drop.classList.add('hidden');
    dom.q.setAttribute('aria-expanded', 'false');
    state.idx = -1;
}

function renderWx(loc, wx) {
    const cur = wx.current;
    const today = wx.daily;
    const hours = wx.hourly;

    dom.city.textContent = loc.name;
    const region = [loc.admin1, loc.country].filter(Boolean).join(', ');
    dom.region.textContent = region || `${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`;
    dom.time.textContent = `local ${new Date(cur.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    dom.temp.textContent = Math.round(cur.temperature_2m);
    dom.tempUnit.textContent = unitSym();

    const info = wxInfo(cur.weather_code);
    dom.cond.textContent = info.text;
    dom.condIcon.innerHTML = `<i data-lucide="${info.icon}"></i>`;

    dom.high.textContent = fmtTemp(today.temperature_2m_max[0]);
    dom.low.textContent = fmtTemp(today.temperature_2m_min[0]);
    dom.feels.textContent = fmtTemp(cur.apparent_temperature);

    dom.humidity.textContent = `${cur.relative_humidity_2m}%`;
    dom.humidityNote.textContent = humidityNote(cur.relative_humidity_2m);

    dom.wind.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
    dom.windNote.textContent = windNote(cur.wind_speed_10m);

    const uv = today.uv_index_max?.[0] ?? 0;
    dom.uv.textContent = uv.toFixed(1);
    dom.uvNote.textContent = uvNote(uv);

    const pressure = cur.pressure_msl ?? 1013;
    dom.pressure.textContent = `${Math.round(pressure)} hPa`;
    dom.pressureNote.textContent = pressureNote(pressure);

    dom.hours.innerHTML = '';
    const now = new Date(cur.time).getTime();
    const start = Math.max(0, hours.time.findIndex((t) => new Date(t).getTime() >= now));

    // open-meteo times are location wall time with no offset; anchoring to current.time
    // keeps the strip in the right place, but dst still bites
    // TODO: format from utc_offset_seconds instead of parsing wall time
    for (let i = start; i < start + 24 && i < hours.time.length; i++) {
        const d = new Date(hours.time[i]);
        const el = document.createElement('div');
        el.className = 'hour';
        el.innerHTML = `
            <span class="h-time">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            <i data-lucide="${wxInfo(hours.weather_code[i]).icon}"></i>
            <span class="h-temp">${fmtTemp(hours.temperature_2m[i])}</span>
        `;
        dom.hours.appendChild(el);
    }

    dom.days.innerHTML = '';
    const maxAll = Math.max(...today.temperature_2m_max);
    const minAll = Math.min(...today.temperature_2m_min);
    const range = maxAll - minAll || 1;

    today.time.forEach((iso, i) => {
        const d = new Date(`${iso}T12:00:00`);
        const hi = today.temperature_2m_max[i];
        const lo = today.temperature_2m_min[i];
        const prob = Math.round(today.precipitation_probability_max?.[i] ?? 0);
        const sum = today.precipitation_sum?.[i] ?? 0;
        const info = wxInfo(today.weather_code[i]);

        const left = Math.min(96, Math.max(0, ((lo - minAll) / range) * 100));
        const width = Math.max(4, Math.min(100 - left, ((hi - lo) / range) * 100));

        const el = document.createElement('div');
        el.className = 'drow';
        el.innerHTML = `
            <div class="dday">
                <span class="dname">${i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span class="ddate">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            <div class="dcond">
                <i data-lucide="${info.icon}"></i>
                <span>${info.text}</span>
            </div>
            <span class="dprecip">
                <span>${prob}%</span><span class="dsep">·</span><span class="dsum">${fmtPrecip(sum)}</span>
            </span>
            <span class="dlow">${fmtTemp(lo)}</span>
            <div class="dbar"><span class="dfill" style="left:${left}%;width:${width}%"></span></div>
            <span class="dhigh">${fmtTemp(hi)}</span>
        `;
        dom.days.appendChild(el);
    });

    lucide.createIcons();
}

function showOnly(view) {
    [dom.empty, dom.loading, dom.dash].forEach((el) => el.classList.add('hidden'));
    view.classList.remove('hidden');
    lucide.createIcons();
}

const showEmpty = () => showOnly(dom.empty);
const showLoading = () => showOnly(dom.loading);
const showDash = () => showOnly(dom.dash);

let toastTimer;

function showToast(msg, type = 'error') {
    dom.toastMsg.textContent = msg;
    dom.toast.className = `toast ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.add('hidden'), 4000);
}

const humidityNote = (v) => v < 30 ? 'dry' : v <= 60 ? 'normal' : 'humid';
const windNote = (v) => v < 10 ? 'light' : v <= 25 ? 'moderate' : 'strong';
const uvNote = (v) => v <= 2 ? 'low' : v <= 5 ? 'moderate' : v <= 7 ? 'high' : 'very high';
const pressureNote = (v) => v > 1018 ? 'high' : v < 1008 ? 'low' : 'steady';
