# ⛅ Zaiim's Weather App

A high-end, production-ready weather web application designed with the precision of Apple, Linear, and Vercel. Built with vanilla JavaScript (ES6+), HTML5, and CSS3, featuring smart debounced search autocomplete, real-time hourly and 7-day forecasts, geolocation support, and a sleek dark glassmorphism UI with zero emojis.

---

## ✨ Key Features

- **Smart Search with Autocomplete**:
  - Debounced search bar (~300ms) with instant dropdown suggestions.
  - Full keyboard navigation (Arrow keys, Enter to select, Escape to close).
- **High-End Minimalist Aesthetic**:
  - Deep dark mode palette (Zinc/Slate) with vibrant electric blue accents and subtle backdrop glassmorphism.
  - **Zero Emojis**: 100% professional UI utilizing crisp Lucide SVG icons.
- **Comprehensive Meteorological Data**:
  - Current weather hero card with high/low temperatures and feels-like metrics.
  - Interactive metrics grid (Humidity, Wind Speed, UV Index, and Surface Pressure).
  - Horizontal scrollable hourly forecast timeline (next 24 hours).
  - 7-day extended forecast with relative temperature range distribution bars.
- **Resilient Error Handling & UI States**:
  - Graceful top-center sliding toast notifications for failed searches or network errors.
  - Skeleton loading shimmers and minimalist welcome states.
- **Client-Side Perfection**:
  - No backend server or API keys required, powered by the open **Open-Meteo API**.
  - Unit toggle (°C / °F) with persistent storage via `localStorage`.

---

## 🔌 API Credit

- **Geocoding API**: [Open-Meteo Geocoding API](https://open-meteo.com/) for location search and autocomplete suggestions.
- **Forecast API**: [Open-Meteo Forecast API](https://open-meteo.com/) for hyper-accurate weather metrics.

---

## 📂 File Structure

```text
simple-weather-app/
├── index.html          # Semantic HTML markup & Lucide SVG integration
├── css/
│   └── style.css       # Premium dark glassmorphism stylesheet
├── js/
│   ├── api.js          # API fetch wrappers, pressure_msl handling, & WMO weather code mapping
│   └── app.js          # Autocomplete debounce, state management, & DOM rendering
└── README.md           # Project documentation
```

---

## 🏃‍♂️ How to Run Locally

1. Clone or download this repository.
2. Open the `simple-weather-app` folder.
3. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge), or use the **Live Server** extension in VS Code for hot-reloading development.
