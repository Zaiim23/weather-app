const WMO = {
    0: ['Clear sky', 'sun'],
    1: ['Mainly clear', 'cloud-sun'],
    2: ['Partly cloudy', 'cloud-sun'],
    3: ['Overcast', 'cloud'],
    45: ['Fog', 'cloud-fog'],
    48: ['Rime fog', 'cloud-fog'],
    51: ['Light drizzle', 'cloud-rain'],
    53: ['Drizzle', 'cloud-rain'],
    55: ['Dense drizzle', 'cloud-rain'],
    56: ['Freezing drizzle', 'cloud-snow'],
    57: ['Freezing drizzle', 'cloud-snow'],
    61: ['Light rain', 'cloud-rain'],
    63: ['Rain', 'cloud-rain'],
    65: ['Heavy rain', 'cloud-rain'],
    66: ['Freezing rain', 'cloud-snow'],
    67: ['Freezing rain', 'cloud-snow'],
    71: ['Light snow', 'cloud-snow'],
    73: ['Snow', 'cloud-snow'],
    75: ['Heavy snow', 'cloud-snow'],
    77: ['Snow grains', 'cloud-snow'],
    80: ['Light showers', 'cloud-rain'],
    81: ['Showers', 'cloud-rain'],
    82: ['Heavy showers', 'cloud-rain'],
    85: ['Snow showers', 'cloud-snow'],
    86: ['Heavy snow showers', 'cloud-snow'],
    95: ['Thunderstorm', 'cloud-lightning'],
    96: ['Thunderstorm, hail', 'cloud-lightning'],
    99: ['Thunderstorm, heavy hail', 'cloud-lightning']
};

function wxInfo(code) {
    const [text, icon] = WMO[code] || ['Cloudy', 'cloud'];
    return { text, icon };
}

async function suggest(q) {
    if (!q || q.trim().length < 2) return [];

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=5&language=en&format=json`;

    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.results || [];
    } catch {
        return [];
    }
}

async function geocode(name) {
    if (!name || !name.trim()) throw new Error('Enter a location.');

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name.trim())}&count=1&language=en&format=json`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
        const data = await res.json();
        if (!data.results?.length) throw new Error(`No match for "${name}"`);
        return data.results[0];
    } catch (err) {
        if (err.message.startsWith('No match')) throw err;
        throw new Error('Geocoding is unavailable. Check your connection.');
    }
}

async function reverse(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;

    try {
        // nominatim asks for <=1 req/s; okay for a manual "nearby" click
        const res = await fetch(url, {
            headers: { 'User-Agent': 'zaiim-weather/1.0' }
        });
        if (!res.ok) throw new Error(`nominatim ${res.status}`);

        const addr = (await res.json()).address || {};
        return {
            latitude: lat,
            longitude: lon,
            name: addr.city || addr.town || addr.village || addr.county || 'Current location',
            country: addr.country || '',
            admin1: addr.state || addr.region || ''
        };
    } catch {
        return {
            latitude: lat,
            longitude: lon,
            name: 'Current location',
            country: '',
            admin1: `${lat.toFixed(2)}, ${lon.toFixed(2)}`
        };
    }
}

async function getWx(lat, lon, unit = 'celsius') {
    const tempUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=kmh`;

    const res = await fetch(url).catch(() => {
        throw new Error('Weather service unreachable.');
    });

    if (!res.ok) throw new Error(`Weather service returned ${res.status}`);

    const data = await res.json();
    if (!data.current || !data.hourly || !data.daily) {
        throw new Error('Incomplete weather payload.');
    }

    return data;
}
