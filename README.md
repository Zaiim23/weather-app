# zaiim weather

[![Lint](https://github.com/Zaiim23/weather-app/actions/workflows/lint.yml/badge.svg)](https://github.com/Zaiim23/weather-app/actions/workflows/lint.yml)

### [Live demo](https://zaiim23.github.io/weather-app/)

A small weather dashboard built with vanilla JS. It pulls current conditions, an hourly strip and a seven-day forecast from Open-Meteo. No build step and no API key.

## Features

- Debounced location search with keyboard navigation and autocomplete
- Current temperature, high/low, feels-like, humidity, wind, UV and pressure
- Scrollable 24-hour forecast and a seven-day temperature range table
- Geolocation with reverse geocoding, falling back to coordinates
- °C/°F toggle and light/dark theme persisted in `localStorage`
- Flat, high-density UI with system-friendly sans and mono type

## Data

- [Open-Meteo forecast](https://open-meteo.com/) for weather data
- [Open-Meteo geocoding](https://open-meteo.com/) for search and autocomplete
- [Nominatim](https://nominatim.openstreetmap.org/) for reverse geocoding. Keep requests under 1/s.

## Structure

```text
simple-weather-app/
├── index.html          # panels, toolbar, state containers
├── css/
│   └── style.css       # tokens, layout, light/dark themes
├── js/
│   ├── api.js          # fetch helpers and WMO code mapping
│   ├── ui.js           # DOM cache and rendering
│   └── app.js          # state, events, loading flow
├── .github/
│   └── workflows/
│       └── lint.yml    # syntax, asset and CSS brace checks
├── LICENSE
└── README.md
```

## Run locally

Open `index.html` in a browser, or serve the folder with any static server:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Notes

- Open-Meteo returns location-local timestamps without an offset. The hourly strip anchors to `current.time`, but DST still needs work (see the TODO in `js/ui.js`).
- Reverse geocoding uses Nominatim's public endpoint; the UA header is set in `js/api.js`.
