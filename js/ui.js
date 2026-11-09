/**
 * ui.js — DOM caching, rendering, and presentational helpers
 * Reads the shared application state defined in app.js.
 */

// DOM Elements Cache
const dom = {
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search'),
    autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
    quickPills: document.getElementById('quick-pills'),
    themeToggle: document.getElementById('theme-toggle'),
    unitToggle: document.getElementById('unit-toggle'),
    unitLabel: document.getElementById('unit-label'),
    geoBtn: document.getElementById('geo-btn'),
    toastNotification: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message'),

    // Viewports / States
    stateEmpty: document.getElementById('state-empty'),
    stateLoading: document.getElementById('state-loading'),
    stateDashboard: document.getElementById('state-dashboard'),

    // Weather Hero Elements
    weatherCity: document.getElementById('weather-city'),
    weatherRegion: document.getElementById('weather-region'),
    weatherTime: document.getElementById('weather-time'),
    weatherTemp: document.getElementById('weather-temp'),
    weatherUnitSymbol: document.getElementById('weather-unit-symbol'),
    conditionIconContainer: document.getElementById('condition-icon-container'),
    weatherCondition: document.getElementById('weather-condition'),
    weatherHigh: document.getElementById('weather-high'),
    weatherLow: document.getElementById('weather-low'),
    weatherFeels: document.getElementById('weather-feels'),

    // Metrics Elements
    metricHumidity: document.getElementById('metric-humidity'),
    metricHumidityDesc: document.getElementById('metric-humidity-desc'),
    metricWind: document.getElementById('metric-wind'),
    metricWindDesc: document.getElementById('metric-wind-desc'),
    metricUv: document.getElementById('metric-uv'),
    metricUvDesc: document.getElementById('metric-uv-desc'),
    metricPressure: document.getElementById('metric-pressure'),
    metricPressureDesc: document.getElementById('metric-pressure-desc'),

    // Forecast Elements
    hourlyScroll: document.getElementById('hourly-scroll'),
    forecastList: document.getElementById('forecast-list')
};

function updateThemeIcon(theme) {
    dom.themeToggle.innerHTML = theme === 'light' ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
    lucide.createIcons();
}

function updateUnitToggleUI() {
    dom.unitLabel.textContent = state.unit === 'fahrenheit' ? '°F' : '°C';
}

function renderAutocomplete(results) {
    dom.autocompleteDropdown.innerHTML = '';
    state.autocompleteIndex = -1;

    if (!results || results.length === 0) {
        hideAutocomplete();
        return;
    }

    results.forEach((city) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.setAttribute('role', 'option');

        const regionText = city.admin1 ? `${city.admin1}, ` : '';
        const countryText = city.country || '';

        item.innerHTML = `
            <div class="city-main-info">
                <i data-lucide="map-pin"></i>
                <span>${city.name}</span>
            </div>
            <span class="city-sub-info">${regionText}${countryText}</span>
        `;

        item.addEventListener('click', () => {
            dom.searchInput.value = city.name;
            hideAutocomplete();
            loadWeather(city, true);
        });

        dom.autocompleteDropdown.appendChild(item);
    });

    dom.autocompleteDropdown.classList.remove('hidden');
    dom.searchInput.setAttribute('aria-expanded', 'true');
    lucide.createIcons();
}

function updateAutocompleteHighlight(items) {
    items.forEach((item, index) => {
        if (index === state.autocompleteIndex) {
            item.classList.add('highlighted');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('highlighted');
        }
    });
}

function hideAutocomplete() {
    dom.autocompleteDropdown.classList.add('hidden');
    dom.searchInput.setAttribute('aria-expanded', 'false');
    state.autocompleteIndex = -1;
}

function renderDashboard(location, data) {
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    dom.weatherCity.textContent = location.name;
    const region = location.admin1 ? `${location.admin1}, ` : '';
    dom.weatherRegion.textContent = `${region}${location.country}`.trim() || "Coordinates View";

    const now = new Date();
    dom.weatherTime.textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const unitSymbol = state.unit === 'fahrenheit' ? '°F' : '°C';
    dom.weatherTemp.textContent = Math.round(current.temperature_2m);
    dom.weatherUnitSymbol.textContent = unitSymbol;

    const weatherInfo = getWeatherInfo(current.weather_code);
    dom.weatherCondition.textContent = weatherInfo.text;
    dom.conditionIconContainer.innerHTML = `<i data-lucide="${weatherInfo.icon}"></i>`;

    const todayMax = Math.round(daily.temperature_2m_max[0]);
    const todayMin = Math.round(daily.temperature_2m_min[0]);
    dom.weatherHigh.textContent = `${todayMax}${unitSymbol}`;
    dom.weatherLow.textContent = `${todayMin}${unitSymbol}`;
    dom.weatherFeels.textContent = `${Math.round(current.apparent_temperature)}${unitSymbol}`;

    dom.metricHumidity.textContent = `${current.relative_humidity_2m}%`;
    dom.metricHumidityDesc.textContent = getHumidityDescription(current.relative_humidity_2m);

    dom.metricWind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    dom.metricWindDesc.textContent = getWindDescription(current.wind_speed_10m);

    const uvMax = daily.uv_index_max ? daily.uv_index_max[0] : 0;
    dom.metricUv.textContent = uvMax.toFixed(1);
    dom.metricUvDesc.textContent = getUvDescription(uvMax);

    const pressure = current.pressure_msl !== undefined ? current.pressure_msl : 1013;
    dom.metricPressure.textContent = `${pressure} hPa`;
    dom.metricPressureDesc.textContent = pressure > 1013 ? "High Pressure" : "Low Pressure";

    dom.hourlyScroll.innerHTML = '';
    const currentHourIndex = hourly.time.findIndex(t => new Date(t) >= new Date()) || 0;
    const startIndex = Math.max(0, currentHourIndex);

    for (let i = startIndex; i < startIndex + 24 && i < hourly.time.length; i++) {
        const timeStr = hourly.time[i];
        const dateObj = new Date(timeStr);
        const hourFormatted = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        const temp = Math.round(hourly.temperature_2m[i]);
        const hInfo = getWeatherInfo(hourly.weather_code[i]);

        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <span class="hourly-time">${hourFormatted}</span>
            <i data-lucide="${hInfo.icon}" class="hourly-icon"></i>
            <span class="hourly-temp">${temp}${unitSymbol}</span>
        `;
        dom.hourlyScroll.appendChild(card);
    }

    dom.forecastList.innerHTML = '';

    const allMax = Math.max(...daily.temperature_2m_max);
    const allMin = Math.min(...daily.temperature_2m_min);
    const tempRange = allMax - allMin || 1;

    for (let i = 0; i < daily.time.length; i++) {
        const dateObj = new Date(daily.time[i]);
        const dayName = i === 0 ? "Today" : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStrFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const maxT = Math.round(daily.temperature_2m_max[i]);
        const minT = Math.round(daily.temperature_2m_min[i]);
        const dInfo = getWeatherInfo(daily.weather_code[i]);

        const leftPercent = Math.max(0, Math.min(100, ((minT - allMin) / tempRange) * 100));
        const widthPercent = Math.max(10, Math.min(100 - leftPercent, ((maxT - minT) / tempRange) * 100));

        const row = document.createElement('div');
        row.className = 'forecast-row';
        row.innerHTML = `
            <div class="forecast-day-info">
                <span class="forecast-day-name">${dayName}</span>
                <span class="forecast-date-str">${dateStrFormatted}</span>
            </div>
            <div class="forecast-icon-wrapper">
                <i data-lucide="${dInfo.icon}"></i>
                <span>${dInfo.text}</span>
            </div>
            <div class="forecast-bar-wrapper">
                <span class="forecast-min-temp">${minT}°</span>
                <div class="temp-bar-bg">
                    <div class="temp-bar-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
                </div>
                <span class="forecast-max-temp">${maxT}°</span>
            </div>
            <div class="forecast-minmax">
                <span class="forecast-max-temp">${maxT}${unitSymbol}</span>
                <span class="forecast-min-temp">${minT}${unitSymbol}</span>
            </div>
        `;
        dom.forecastList.appendChild(row);
    }

    lucide.createIcons();
}

function showEmptyState() {
    dom.stateLoading.classList.add('hidden');
    dom.stateDashboard.classList.add('hidden');
    dom.stateEmpty.classList.remove('hidden');
    lucide.createIcons();
}

function showLoadingState() {
    dom.stateEmpty.classList.add('hidden');
    dom.stateDashboard.classList.add('hidden');
    dom.stateLoading.classList.remove('hidden');
}

function showDashboardState() {
    dom.stateEmpty.classList.add('hidden');
    dom.stateLoading.classList.add('hidden');
    dom.stateDashboard.classList.remove('hidden');
}

function showToast(message, type = 'error') {
    dom.toastMessage.textContent = message;
    dom.toastNotification.className = `toast-notification ${type}`;
    dom.toastNotification.classList.remove('hidden');

    setTimeout(() => {
        dom.toastNotification.classList.add('hidden');
    }, 5000);
}

function getHumidityDescription(humidity) {
    if (humidity < 30) return "Dry & crisp air";
    if (humidity <= 60) return "Comfortable & pleasant";
    return "Humid atmosphere";
}

function getWindDescription(speed) {
    if (speed < 10) return "Light breeze";
    if (speed <= 25) return "Moderate winds";
    return "Strong gusts";
}

function getUvDescription(uv) {
    if (uv <= 2) return "Low risk";
    if (uv <= 5) return "Moderate risk";
    if (uv <= 7) return "High risk";
    return "Very high risk";
}
