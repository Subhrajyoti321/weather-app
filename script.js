// ─────────────────────────────────────────────────────────
//  CONFIGURATION — paste your free API key from
//  https://openweathermap.org/api  (takes ~10 min to activate)
// ─────────────────────────────────────────────────────────
const API_KEY = 'YOUR_API_KEY_HERE';
const BASE    = 'https://api.openweathermap.org/data/2.5';

// ── State ─────────────────────────────────────────────────
let isCelsius  = true;
let lastData   = null;   // cache last API response for unit switching

// ── DOM refs ──────────────────────────────────────────────
const cityInput      = document.getElementById('cityInput');
const searchBtn      = document.getElementById('searchBtn');
const errorMsg       = document.getElementById('errorMsg');
const loader         = document.getElementById('loader');
const weatherCard    = document.getElementById('weatherCard');
const bgLayer        = document.getElementById('bgLayer');
const celsiusBtn     = document.getElementById('celsiusBtn');
const fahrenheitBtn  = document.getElementById('fahrenheitBtn');
const apiNote        = document.getElementById('apiNote');

// ── Search triggers ───────────────────────────────────────
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
});

// ── Unit toggle ───────────────────────────────────────────
celsiusBtn.addEventListener('click', () => {
  if (!isCelsius) {
    isCelsius = true;
    celsiusBtn.classList.add('active');
    fahrenheitBtn.classList.remove('active');
    if (lastData) renderWeather(lastData);
  }
});
fahrenheitBtn.addEventListener('click', () => {
  if (isCelsius) {
    isCelsius = false;
    fahrenheitBtn.classList.add('active');
    celsiusBtn.classList.remove('active');
    if (lastData) renderWeather(lastData);
  }
});

// ── Main fetch ────────────────────────────────────────────
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return;

  if (API_KEY === 'YOUR_API_KEY_HERE') {
    showError('Please add your OpenWeatherMap API key in script.js');
    showDemo(city);   // show demo data so UI is visible
    return;
  }

  showError('');
  showLoader(true);
  hideCard();

  try {
    const res  = await fetch(`${BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`);
    const data = await res.json();

    if (data.cod !== 200) {
      throw new Error(data.message || 'City not found');
    }

    lastData = data;
    showLoader(false);
    renderWeather(data);
    apiNote.style.display = 'none';

  } catch (err) {
    showLoader(false);
    showError(err.message.charAt(0).toUpperCase() + err.message.slice(1));
  }
}

// ── Render ────────────────────────────────────────────────
function renderWeather(data) {
  const tempC   = data.main.temp;
  const feelsC  = data.main.feels_like;
  const temp    = isCelsius ? Math.round(tempC)  : toF(tempC);
  const feels   = isCelsius ? Math.round(feelsC) : toF(feelsC);
  const unit    = isCelsius ? '°C' : '°F';

  // Location & time
  document.getElementById('cityName').textContent    = data.name;
  document.getElementById('countryCode').textContent = data.sys.country;
  document.getElementById('localTime').textContent   = localTime(data.timezone);

  // Temperature
  document.getElementById('tempDisplay').textContent = `${temp}${unit}`;
  document.getElementById('feelsLike').textContent   = `${feels}${unit}`;

  // Condition
  const desc = data.weather[0].description;
  document.getElementById('conditionLabel').textContent = desc;
  document.getElementById('conditionIcon').textContent  = weatherEmoji(data.weather[0].id, data.weather[0].icon);

  // Stats
  document.getElementById('humidity').textContent   = `${data.main.humidity}%`;
  document.getElementById('wind').textContent       = `${Math.round(data.wind.speed)} m/s`;
  document.getElementById('pressure').textContent   = `${data.main.pressure} hPa`;
  document.getElementById('cloudCover').textContent = `${data.clouds.all}%`;
  document.getElementById('visibility').textContent = data.visibility
    ? `${(data.visibility / 1000).toFixed(1)} km`
    : '—';

  // UV index — basic estimate from cloud cover (OWM free tier doesn't include UV)
  const uvEst = estimateUV(data.clouds.all, data.weather[0].id);
  document.getElementById('uvIndex').textContent = uvEst;

  // Sun times
  document.getElementById('sunrise').textContent = unixToTime(data.sys.sunrise, data.timezone);
  document.getElementById('sunset').textContent  = unixToTime(data.sys.sunset,  data.timezone);

  // Background
  applyBackground(data.weather[0].id, data.weather[0].icon);

  // Show card
  weatherCard.classList.add('visible');
}

// ── Demo data (shown when no API key) ─────────────────────
function showDemo(city) {
  lastData = {
    name: city || 'London',
    sys: { country: 'GB', sunrise: 1713760000, sunset: 1713810000 },
    timezone: 3600,
    main: { temp: 18, feels_like: 16, humidity: 64, pressure: 1015 },
    wind: { speed: 4.2 },
    clouds: { all: 35 },
    visibility: 9000,
    weather: [{ id: 801, description: 'few clouds', icon: '02d' }]
  };
  renderWeather(lastData);
  apiNote.style.display = '';
}

// ── Helpers ───────────────────────────────────────────────
function toF(c)         { return Math.round(c * 9/5 + 32); }

function unixToTime(unix, offsetSec) {
  const d = new Date((unix + offsetSec) * 1000);
  return d.toUTCString().slice(17, 22);
}

function localTime(offsetSec) {
  const d   = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const loc = new Date(utc + offsetSec * 1000);
  return loc.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function estimateUV(clouds, id) {
  // rough estimate — 0-11 scale
  if (id >= 200 && id < 700) return '0–1';
  const base = Math.round(11 * (1 - clouds / 100) * 0.85);
  return Math.max(0, base).toString();
}

function weatherEmoji(id, icon) {
  const night = icon && icon.endsWith('n');
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌦️';
  if (id >= 500 && id < 510) return '🌧️';
  if (id === 511)             return '🌨️';
  if (id >= 520 && id < 532) return '🌧️';
  if (id >= 600 && id < 700) return '❄️';
  if (id === 701 || id === 741) return '🌫️';
  if (id >= 700 && id < 800) return '🌀';
  if (id === 800)             return night ? '🌙' : '☀️';
  if (id === 801)             return night ? '🌤️' : '🌤️';
  if (id === 802)             return '⛅';
  if (id >= 803)              return '☁️';
  return '🌡️';
}

function applyBackground(id, icon) {
  bgLayer.className = 'bg-layer';
  if (id >= 200 && id < 300)          bgLayer.classList.add('thunder');
  else if (id >= 300 && id < 700)     bgLayer.classList.add('rain');
  else if (id >= 600 && id < 700)     bgLayer.classList.add('snow');
  else if (id === 800)                bgLayer.classList.add('clear');
  else                                bgLayer.classList.add('clouds');
}

// ── UI helpers ────────────────────────────────────────────
function showLoader(on)  { loader.classList.toggle('visible', on); }
function hideCard()      { weatherCard.classList.remove('visible'); }
function showError(msg)  { errorMsg.textContent = msg; }

// ── Auto-load a demo on first visit ──────────────────────
window.addEventListener('load', () => showDemo('London'));
