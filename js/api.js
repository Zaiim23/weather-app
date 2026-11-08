/**
 * api.js — Open-Meteo & Nominatim API Integration and WMO Weather Mapping
 * Handles Geocoding, Reverse Geocoding, Autocomplete Suggestions, and Meteorological Forecasts.
 */

/**
 * Maps WMO weather interpretation codes to human-readable descriptions and Lucide icon names.
 * @param {number} code - WMO weather code
 * @returns {Object} Object with text description and iconName
 */
function getWeatherInfo(code) {
    const weatherMap = {
        0: { text: "Clear Sky", icon: "sun" },
        1: { text: "Mainly Clear", icon: "cloud-sun" },
        2: { text: "Partly Cloudy", icon: "cloud-sun" },
        3: { text: "Overcast", icon: "cloud" },
        45: { text: "Foggy", icon: "cloud-fog" },
        48: { text: "Depositing Rime Fog", icon: "cloud-fog" },
        51: { text: "Light Drizzle", icon: "cloud-rain" },
        53: { text: "Moderate Drizzle", icon: "cloud-rain" },
        55: { text: "Dense Drizzle", icon: "cloud-rain" },
        56: { text: "Light Freezing Drizzle", icon: "cloud-snow" },
        57: { text: "Dense Freezing Drizzle", icon: "cloud-snow" },
        61: { text: "Slight Rain", icon: "cloud-rain" },
        63: { text: "Moderate Rain", icon: "cloud-rain" },
        65: { text: "Heavy Rain", icon: "cloud-rain" },
        66: { text: "Light Freezing Rain", icon: "cloud-snow" },
        67: { text: "Heavy Freezing Rain", icon: "cloud-snow" },
        71: { text: "Slight Snow Fall", icon: "cloud-snow" },
        73: { text: "Moderate Snow Fall", icon: "cloud-snow" },
        75: { text: "Heavy Snow Fall", icon: "cloud-snow" },
        77: { text: "Snow Grains", icon: "cloud-snow" },
        80: { text: "Slight Rain Showers", icon: "cloud-rain" },
        81: { text: "Moderate Rain Showers", icon: "cloud-rain" },
        82: { text: "Violent Rain Showers", icon: "cloud-rain" },
        85: { text: "Slight Snow Showers", icon: "cloud-snow" },
        86: { text: "Heavy Snow Showers", icon: "cloud-snow" },
        95: { text: "Thunderstorm", icon: "cloud-lightning" },
        96: { text: "Thunderstorm with Hail", icon: "cloud-lightning" },
        99: { text: "Thunderstorm with Heavy Hail", icon: "cloud-lightning" }
    };

    return weatherMap[code] || { text: "Atmospheric Conditions", icon: "cloud" };
}

/**
 * Fetches city suggestions for autocomplete search.
 * @param {string} query - Search query string
 * @returns {Promise<Array>} Array of location objects
 */
async function fetchCitySuggestions(query) {
    if (!query || query.trim().length < 2) return [];

    const encoded = encodeURIComponent(query.trim());
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=5&language=en&format=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Geocoding HTTP error: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("Autocomplete fetch exception:", error);
        return [];
    }
}

/**
 * Searches for exact city location.
 * @param {string} cityName - City name
 * @returns {Promise<Object>} Location object
 */
async function geocodeCity(cityName) {
    if (!cityName || !cityName.trim()) {
        throw new Error("Please enter a valid location name.");
    }

    const encoded = encodeURIComponent(cityName.trim());
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=1&language=en&format=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Geocoding API error response: ${errorText}`);
            throw new Error(`Geocoding service error (${response.statusText})`);
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error(`Location "${cityName}" not found. Try searching for another city.`);
        }

        return data.results[0];
    } catch (error) {
        if (error.message.includes("not found") || error.message.includes("Please enter")) {
            throw error;
        }
        console.error("Geocoding exception:", error);
        throw new Error("Unable to connect to geocoding service. Please check your network.");
    }
}

/**
 * Performs reverse geocoding using OpenStreetMap Nominatim to get city name from coordinates.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Location metadata object
 */
async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ZaiimsWeatherApp/1.0'
            }
        });

        if (!response.ok) {
            throw new Error("Reverse geocoding network error");
        }

        const data = await response.json();
        const address = data.address || {};
        const name = address.city || address.town || address.village || address.county || "Current Location";
        const country = address.country || "";
        const admin1 = address.state || address.region || "";

        return {
            latitude: lat,
            longitude: lon,
            name: name,
            country: country,
            admin1: admin1
        };
    } catch (error) {
        console.warn("Reverse geocoding warning, falling back to coordinates:", error);
        return {
            latitude: lat,
            longitude: lon,
            name: "Current Location",
            country: "",
            admin1: `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`
        };
    }
}

/**
 * Fetches comprehensive weather forecast data from Open-Meteo.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} unit - Temperature unit ('celsius' or 'fahrenheit')
 * @returns {Promise<Object>} Complete weather data payload
 */
async function fetchWeather(lat, lon, unit = 'celsius') {
    const tempUnitParam = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset&timezone=auto&temperature_unit=${tempUnitParam}&wind_speed_unit=kmh`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Open-Meteo API 400 Bad Request error body:`, errorBody);
            throw new Error(`Weather service error (${response.status}: Bad Request)`);
        }

        const data = await response.json();
        if (!data.current || !data.hourly || !data.daily) {
            throw new Error("Incomplete weather payload received from server.");
        }

        return data;
    } catch (error) {
        if (error.message.includes("Weather service error") || error.message.includes("Incomplete weather")) {
            throw error;
        }
        console.error("Weather fetch exception:", error);
        throw new Error("Failed to fetch weather forecast. Please check your network connection.");
    }
}
