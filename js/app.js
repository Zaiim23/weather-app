/**
 * app.js — Zaiim's Weather App Frontend Controller
 * Manages UI state, smart debounced search autocomplete, event listeners, and data rendering.
 */

// Application State
const state = {
    unit: localStorage.getItem('zaiim_weather_unit') || 'celsius', // 'celsius' or 'fahrenheit'
    currentLocation: null, // { latitude, longitude, name, country, admin1 }
    autocompleteIndex: -1,
    debounceTimer: null
};

// DOM Elements Cache
const dom = {
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search'),
    autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
    quickPills: document.getElementById('quick-pills'),
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

/**
 * Initialize App on DOM Content Loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    updateUnitToggleUI();
    initEventListeners();
    
    const savedLocation = localStorage.getItem('zaiim_last_location');
    if (savedLocation) {
        try {
            const loc = JSON.parse(savedLocation);
            loadWeather(loc, false);
        } catch (e) {
            showEmptyState();
        }
    } else {
        showEmptyState();
    }

    // Render all static Lucide icons on initial load
    lucide.createIcons();
});

/**
 * Sets up all interactive event listeners.
 */
function initEventListeners() {
    dom.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (query.length > 0) {
            dom.clearSearchBtn.classList.remove('hidden');
        } else {
            dom.clearSearchBtn.classList.add('hidden');
            hideAutocomplete();
            return;
        }

        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(async () => {
            const results = await fetchCitySuggestions(query);
            renderAutocomplete(results);
        }, 300);
    });

    dom.searchInput.addEventListener('keydown', (e) => {
        const items = dom.autocompleteDropdown.querySelectorAll('.autocomplete-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.autocompleteIndex = Math.min(state.autocompleteIndex + 1, items.length - 1);
            updateAutocompleteHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.autocompleteIndex = Math.max(state.autocompleteIndex - 1, -1);
            updateAutocompleteHighlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (state.autocompleteIndex >= 0 && items[state.autocompleteIndex]) {
                items[state.autocompleteIndex].click();
            } else {
                const query = dom.searchInput.value.trim();
                if (query) {
                    hideAutocomplete();
                    handleDirectSearch(query);
                }
            }
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        }
    });

    dom.clearSearchBtn.addEventListener('click', () => {
        dom.searchInput.value = '';
        dom.clearSearchBtn.classList.add('hidden');
        hideAutocomplete();
        dom.searchInput.focus();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            hideAutocomplete();
        }
    });

    dom.quickPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (pill) {
            const name = pill.getAttribute('data-city');
            const lat = parseFloat(pill.getAttribute('data-lat'));
            const lon = parseFloat(pill.getAttribute('data-lon'));
            const location = { name, latitude: lat, longitude: lon, country: "", admin1: "" };
            
            dom.searchInput.value = name;
            dom.clearSearchBtn.classList.remove('hidden');
            loadWeather(location, true);
        }
    });

    dom.geoBtn.addEventListener('click', () => {
        handleGeolocation();
    });

    dom.unitToggle.addEventListener('click', async () => {
        state.unit = state.unit === 'celsius' ? 'fahrenheit' : 'celsius';
        localStorage.setItem('zaiim_weather_unit', state.unit);
        updateUnitToggleUI();

        if (state.currentLocation) {
            await loadWeather(state.currentLocation, false);
        }
    });
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

async function handleDirectSearch(query) {
    showLoadingState();
    try {
        const location = await geocodeCity(query);
        await loadWeather(location, true);
    } catch (error) {
        showToast(error.message, 'error');
        showEmptyState();
    }
}

function handleGeolocation() {
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", "error");
        return;
    }

    showLoadingState();

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Use reverse geocoding to get the actual city name
            const location = await reverseGeocode(lat, lon);
            
            await loadWeather(location, true);
        },
        (error) => {
            let msg = "Unable to retrieve your location.";
            if (error.code === error.PERMISSION_DENIED) {
                msg = "Location permission denied. Please search manually.";
            }
            showToast(msg, "error");
            showEmptyState();
        },
        { timeout: 10000, maximumAge: 60000 }
    );
}

async function loadWeather(location, saveToStorage = true) {
    showLoadingState();
    
    if (saveToStorage) {
        state.currentLocation = location;
        localStorage.setItem('zaiim_last_location', JSON.stringify(location));
    }

    try {
        const weatherData = await fetchWeather(location.latitude, location.longitude, state.unit);
        renderDashboard(location, weatherData);
        showDashboardState();
    } catch (error) {
        showToast(error.message, "error");
        showEmptyState();
    }
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
    
    // Ensure icons inside empty state render correctly
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
