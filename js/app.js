/**
 * app.js — Zaiim's Weather App Frontend Controller
 * Owns shared application state, event listeners, and the loading flow.
 * API access lives in api.js and rendering lives in ui.js.
 */

// Application State (shared with ui.js)
const state = {
    unit: localStorage.getItem('zaiim_weather_unit') || 'celsius',
    currentLocation: null,
    autocompleteIndex: -1,
    debounceTimer: null
};

/**
 * Initialize App on DOM Content Loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    const savedTheme = localStorage.getItem('zaiim_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

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

    lucide.createIcons();
});

/**
 * Sets up all interactive event listeners.
 */
function initEventListeners() {
    // Theme Toggle
    dom.themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('zaiim_theme', newTheme);
        updateThemeIcon(newTheme);
    });

    // Search input typing with debounce (300ms)
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

    state.currentLocation = location;

    if (saveToStorage) {
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
