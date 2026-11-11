const state = {
    unit: localStorage.getItem('zaiim_weather_unit') || 'celsius',
    precipUnit: localStorage.getItem('zaiim_precip_unit') || 'mm',
    loc: null,
    idx: -1,
    timer: null
};

document.addEventListener('DOMContentLoaded', () => {
    const theme = localStorage.getItem('zaiim_theme') || 'dark';
    document.documentElement.dataset.theme = theme;
    setThemeIcon(theme);
    paintUnits();
    bind();

    console.debug(`[wx] boot ${theme} / ${state.unit} / ${state.precipUnit}`);

    const cached = localStorage.getItem('zaiim_last_location');
    if (cached) {
        try {
            loadWx(JSON.parse(cached), false);
        } catch {
            showEmpty();
        }
    } else {
        showEmpty();
    }

    lucide.createIcons();
});

function bind() {
    dom.themeBtn.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        document.documentElement.dataset.theme = next;
        localStorage.setItem('zaiim_theme', next);
        setThemeIcon(next);
    });

    dom.q.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        dom.clear.classList.toggle('hidden', !q);

        clearTimeout(state.timer);
        if (!q) {
            closeSuggest();
            return;
        }

        state.timer = setTimeout(async () => {
            renderSuggest(await suggest(q));
        }, 300);
    });

    dom.q.addEventListener('keydown', (e) => {
        const items = [...dom.drop.querySelectorAll('.sug-item')];

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.idx = Math.min(state.idx + 1, items.length - 1);
            highlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.idx = Math.max(state.idx - 1, -1);
            highlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (state.idx >= 0 && items[state.idx]) {
                items[state.idx].click();
            } else if (dom.q.value.trim()) {
                const q = dom.q.value.trim();
                closeSuggest();
                lookup(q);
            }
        } else if (e.key === 'Escape') {
            closeSuggest();
        }
    });

    dom.clear.addEventListener('click', () => {
        dom.q.value = '';
        dom.clear.classList.add('hidden');
        closeSuggest();
        dom.q.focus();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) closeSuggest();
    });

    dom.chips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        const loc = {
            name: chip.dataset.city,
            latitude: Number(chip.dataset.lat),
            longitude: Number(chip.dataset.lon),
            country: '',
            admin1: ''
        };

        dom.q.value = loc.name;
        dom.clear.classList.remove('hidden');
        loadWx(loc);
    });

    dom.geoBtn.addEventListener('click', locate);

    dom.unitBtn.addEventListener('click', async () => {
        state.unit = state.unit === 'celsius' ? 'fahrenheit' : 'celsius';
        localStorage.setItem('zaiim_weather_unit', state.unit);
        paintUnits();

        if (state.loc) await loadWx(state.loc, false);
    });

    dom.precipBtn.addEventListener('click', async () => {
        state.precipUnit = state.precipUnit === 'inch' ? 'mm' : 'inch';
        localStorage.setItem('zaiim_precip_unit', state.precipUnit);
        paintUnits();

        if (state.loc) await loadWx(state.loc, false);
    });
}

async function lookup(q) {
    showLoading();

    try {
        const loc = await geocode(q);
        await loadWx(loc);
    } catch (err) {
        showToast(err.message);
        showEmpty();
    }
}

function locate() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not available in this browser.');
        return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            await loadWx(await reverse(lat, lon));
        },
        (err) => {
            showToast(err.code === err.PERMISSION_DENIED
                ? 'Location permission denied.'
                : 'Could not get your location.');
            showEmpty();
        },
        { timeout: 10000, maximumAge: 60000 }
    );
}

async function loadWx(loc, save = true) {
    showLoading();
    state.loc = loc;

    if (save) {
        localStorage.setItem('zaiim_last_location', JSON.stringify(loc));
    }

    try {
        const wx = await getWx(loc.latitude, loc.longitude, state.unit, state.precipUnit);
        renderWx(loc, wx);
        showDash();
    } catch (err) {
        showToast(err.message);
        showEmpty();
    }
}
