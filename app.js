/* =============================================================================
   PERIODIC TABLE — APP CORE
   =============================================================================
   The periodic table interface itself: layout grid, six-dimension filtering
   system, histogram panel, modal, atom viewer (Bohr + orbital cloud), the
   hamburger menu, fullscreen suggestion toast, and the dark-mode toggle
   wiring. The DOMContentLoaded handler at the bottom of this file kicks all
   of that off.

   FILES IN THIS PROJECT
   ---------------------
   - index.html   markup, dark-mode boot inline, then loads scripts in order
   - styles.css   the entire design system (was the <style> block)
   - elements.js  pure data: ELEMENTS[], ELEMENT_EXTRA{}, ELEMENT_ORIGIN{},
                  CATEGORIES{}, ORIGIN_CONFIG[] — attached to window
   - app.js       this file — the table app and all its subsystems
   - games.js     PeriodicGames namespace: launcher overlay, difficulty
                  system, floating game bar, and individual games (Elementle
                  first; five more planned). Loads after app.js and registers
                  its own DOMContentLoaded handlers.

   LOAD ORDER MATTERS: elements.js must load before app.js (data is read at
   buildTable). games.js loads last and may call top-level functions defined
   here (e.g. closeMenu); it does not depend on the app's DOMContentLoaded
   handler having finished, only on the DOM being ready.

   DATA
   ----
   Three element-keyed structures live in elements.js:
   - ELEMENTS[]       positional array. Tuple is [number, symbol, name, mass,
                      category, group, period, electronConfig, electronegativity,
                      meltingK, boilingK, density, discoveredBy, year, description].
   - ELEMENT_EXTRA{}  supplemental fields per atomic number:
                      [empirical_radius_pm, abundance_mg_per_kg, state_at_RT,
                      radioactive].
   - ELEMENT_ORIGIN{} nucleosynthetic origin per atomic number. One of:
                      bigbang, cosmicray, smallstars, bigstars, supernova,
                      merger, synthetic. Used by the Stardust filter.

   FILTERING SYSTEM
   ----------------
   Filters compose via intersection (AND). Six filter dimensions:
   - 4 sliders: year, density, radius, abundance — stored 0-100 in sliderState,
     mapped to real values via getXThreshold(pos).
   - 1 toggle group: state-at-RT (solid/liquid/gas, radio behaviour) plus
     synthetic and radioactive flags — stored in toggleState.states (Set),
     toggleState.synthetic, and toggleState.radioactive. Phase chips and
     flag chips are orthogonal dimensions that AND-combine at filter time.
   - 1 single-select toggle: stardust origin — stored in toggleState.origins.
     Originally multi-select; locked to single-select by renderStardustControls.
   Plus: search box (#search) and category-legend click filter (activeFilter).

   applyFilters() is the central re-evaluation. Call after any mutation.
   It toggles .faded on element cells (grayscale + reduced opacity).

   HISTOGRAM PANEL
   ---------------
   Floating panel that opens on chip click, anchored just below the chip rail.
   Shows live distribution of the active dimension across the 118 elements,
   with the threshold draggable directly on the histogram. Closes on:
   second click of the same chip, click outside, or open of a different
   panel. histoState tracks {activeFilter, panelEl, abortController}.

   MODAL + ATOM VIEWER
   -------------------
   Click an element → modal slides up with full detail card and the 3D atom
   viewer (Three.js). Bohr model is the default; an "Orbital cloud" toggle
   swaps in a probability-density volumetric render. Both share an animation
   frame and dispose properly when the modal closes.

   GAP CONTROL PANEL
   -----------------
   The floating panel that lives in the upper-right gap (groups 13-17,
   periods 1-2). Houses the search box, dark-mode toggle, fullscreen
   button, and category legend. Position is calculated relative to the
   table layout grid in positionGapControl(); recomputed on resize and
   after the chip rail collapses/expands.
   ============================================================================= */


// Build the layout grid
function buildTable() {
  const table = document.getElementById('table');
  const ELEMENT_BY_NUMBER = {};
  ELEMENTS.forEach(e => ELEMENT_BY_NUMBER[e[0]] = e);

  // Standard periodic table layout (period x group => atomic number, or null/series)
  // 7 periods, 18 groups
  const LAYOUT = [
    [1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2],
    [3,4,null,null,null,null,null,null,null,null,null,null,5,6,7,8,9,10],
    [11,12,null,null,null,null,null,null,null,null,null,null,13,14,15,16,17,18],
    [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
    [37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54],
    [55,56,'La-Lu',72,73,74,75,76,77,78,79,80,81,82,83,84,85,86],
    [87,88,'Ac-Lr',104,105,106,107,108,109,110,111,112,113,114,115,116,117,118]
  ];

  LAYOUT.forEach(row => {
    row.forEach(cell => {
      if (cell === null) {
        const ph = document.createElement('div');
        ph.className = 'element placeholder';
        table.appendChild(ph);
      } else if (typeof cell === 'string') {
        const marker = document.createElement('div');
        marker.className = 'series-marker';
        marker.textContent = cell;
        table.appendChild(marker);
      } else {
        const el = ELEMENT_BY_NUMBER[cell];
        table.appendChild(createElementCell(el));
      }
    });
  });

  // Inject the gap-control container into the upper-gap region of the table.
  // This is where the active filter's slider/toggles render. Hidden until a chip is selected.
  const gapControl = document.createElement('div');
  gapControl.className = 'gap-control';
  gapControl.id = 'gapControl';
  gapControl.hidden = true;
  table.appendChild(gapControl);

  // Lanthanide row (separate)
  const lanRow = document.createElement('div');
  lanRow.className = 'lanthanide-row';
  // Empty cells for groups 1-2, then lanthanides 57-71 in groups 3-17, then nothing
  for (let i = 0; i < 2; i++) {
    const ph = document.createElement('div');
    ph.className = 'element placeholder';
    lanRow.appendChild(ph);
  }
  // Marker
  const lanMarker = document.createElement('div');
  lanMarker.className = 'series-marker';
  lanMarker.textContent = '6';
  lanMarker.style.fontStyle = 'normal';
  lanRow.appendChild(lanMarker);
  for (let n = 57; n <= 71; n++) {
    lanRow.appendChild(createElementCell(ELEMENT_BY_NUMBER[n]));
  }
  table.parentNode.insertBefore(lanRow, document.getElementById('legendBelow'));

  // Actinide row
  const actRow = document.createElement('div');
  actRow.className = 'actinide-row';
  for (let i = 0; i < 2; i++) {
    const ph = document.createElement('div');
    ph.className = 'element placeholder';
    actRow.appendChild(ph);
  }
  const actMarker = document.createElement('div');
  actMarker.className = 'series-marker';
  actMarker.textContent = '7';
  actMarker.style.fontStyle = 'normal';
  actRow.appendChild(actMarker);
  for (let n = 89; n <= 103; n++) {
    actRow.appendChild(createElementCell(ELEMENT_BY_NUMBER[n]));
  }
  table.parentNode.insertBefore(actRow, document.getElementById('legendBelow'));
}

function createElementCell(data) {
  const [number, symbol, name, mass, category] = data;
  const cell = document.createElement('div');
  cell.className = 'element';
  cell.dataset.number = number;
  cell.dataset.category = category;
  cell.style.setProperty('--cat-color', `var(--cat-${category})`);

  cell.innerHTML = `
    <div class="number">${number}</div>
    <div class="symbol">${symbol}</div>
    <div class="name">${name}</div>
    <div class="mass">${typeof mass === 'number' && mass < 300 ? mass.toFixed(mass > 100 ? 2 : 3) : mass}</div>
  `;

  cell.addEventListener('click', () => openModal(data));
  return cell;
}

function buildLegend() {
  const legend = document.getElementById('legend');
  Object.entries(CATEGORIES).forEach(([key, info]) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.dataset.category = key;
    item.innerHTML = `<span class="legend-swatch" style="background:${info.color}"></span><span>${info.label}</span>`;
    item.addEventListener('click', () => filterByCategory(key));
    legend.appendChild(item);
  });
}

let activeFilter = null;

// Tracks which filter chip is currently expanded (showing its histogram/controls)
const histoState = {
  activeFilter: null    // 'year' | 'density' | 'radius' | 'abundance' | 'state' | null
};

// Slider/toggle filter state
// Each slider is a two-handle range: lo and hi positions on a 0-100 scale.
// Default {lo: 0, hi: 100} = full range, no filter applied.
// Filter is "active" when lo > 0 OR hi < 100. Year/density/radius use
// pos directly as a value-domain mapping (0 = lowest data value, 100 = highest).
// Abundance is on a log scale where pos 0 = most abundant and pos 100 = rarest;
// dragging the lo handle right excludes the most-abundant elements, dragging hi
// left excludes the rarest. Same range-filter semantics applies uniformly.
const sliderState = {
  year:      { lo: 0, hi: 100 },
  density:   { lo: 0, hi: 100 },
  radius:    { lo: 0, hi: 100 },
  abundance: { lo: 0, hi: 100 }
};
const toggleState = {
  states: new Set(),       // active phase chips: solid, liquid, gas (mutually exclusive — radio behaviour)
  synthetic: false,        // synthetic-only flag (independent of phase, AND-combined)
  radioactive: false,      // radioactive-only flag (independent of phase, AND-combined)
  origins: new Set()       // active stardust origin chips
};

// Temperature filter state — semantically distinct from the show/hide filters
// above. When active, every element tile is recolored by the state it would
// be in (solid / liquid / gas) at tempK — category colors are overridden via
// the body.temperature-mode + .state-* class pairing in styles.css. Doesn't
// hide any elements, so it doesn't participate in matchCount or the empty
// state banner.
const tempState = {
  active: false,           // when true, body.temperature-mode is set and tiles are recolored
  tempK: 293               // current temperature in Kelvin (293K ≈ room temp, the default)
};

// Tracks whether the user has dismissed the empty-state overlay for the
// current run of zero matches. Auto-clears in applyFilters() the moment the
// match count returns to non-zero, so the overlay re-earns visibility on
// the next zero-match combination instead of staying dismissed forever.
let emptyStateDismissed = false;

// Tracks whether the user has dismissed the "looks better in fullscreen"
// suggestion this session. Once dismissed, suppress for the remainder of
// the page session — re-shows on reload, which is the right behaviour
// since a fresh session may be a different user or different viewport.
let fullscreenSuggestionDismissed = false;

// Compute data ranges for slider mapping
let DATA_RANGES = null;
function computeDataRanges() {
  const years = ELEMENTS.map(e => e[13]).filter(y => y !== null);
  const densities = ELEMENTS.map(e => e[11]).filter(d => d !== null && !isNaN(d));
  const radii = Object.values(ELEMENT_EXTRA).map(x => x[0]).filter(r => r !== null);
  const abundances = Object.values(ELEMENT_EXTRA).map(x => x[1]).filter(a => a !== null && a > 0);

  DATA_RANGES = {
    yearMin: Math.min(...years),  // includes -7000 BCE
    yearMax: 2026,
    densityMin: Math.min(...densities),
    densityMax: Math.max(...densities),
    radiusMin: Math.min(...radii),
    radiusMax: Math.max(...radii),
    // Abundance is log-scaled
    abundanceLogMin: Math.log10(Math.min(...abundances)),
    abundanceLogMax: Math.log10(Math.max(...abundances))
  };
}

function filterByCategory(cat) {
  if (activeFilter === cat) {
    activeFilter = null;
  } else {
    activeFilter = cat;
  }
  applyFilters();
}

// Convert slider position (0-100) to threshold values
function getYearThreshold(pos) {
  // pos 0 = ancient, pos 100 = today.
  // Use a piecewise mapping so the modern era (where most discoveries happened)
  // gets more slider resolution. First 25% covers ancient → 1700; rest covers 1700 → today.
  const yearMin = DATA_RANGES.yearMin;
  const yearMax = DATA_RANGES.yearMax;
  const breakpoint = 25;
  const breakYear = 1700;
  if (pos <= breakpoint) {
    return yearMin + (pos / breakpoint) * (breakYear - yearMin);
  }
  return breakYear + ((pos - breakpoint) / (100 - breakpoint)) * (yearMax - breakYear);
}

function getDensityThreshold(pos) {
  // pos 0 = lightest, pos 100 = densest. Element must be ≤ threshold to show.
  return DATA_RANGES.densityMin + (pos / 100) * (DATA_RANGES.densityMax - DATA_RANGES.densityMin);
}

function getRadiusThreshold(pos) {
  return DATA_RANGES.radiusMin + (pos / 100) * (DATA_RANGES.radiusMax - DATA_RANGES.radiusMin);
}

function getAbundanceThreshold(pos) {
  // Log-scale, INVERTED: pos 100 = no filter (include all), pos 0 = only most abundant.
  // Element must have abundance ≥ threshold to show.
  // We invert pos so that lower pos values produce HIGHER thresholds.
  const inverted = 100 - pos;
  const logVal = DATA_RANGES.abundanceLogMin + (inverted / 100) * (DATA_RANGES.abundanceLogMax - DATA_RANGES.abundanceLogMin);
  return Math.pow(10, logVal);
}

// Compute the real-value [min, max] range for a two-handle slider, or null
// if the slider is at full extent (lo=0, hi=100) and not actively filtering.
// Each filter's getThreshold function maps slider pos to a real value;
// taking min/max of the two endpoint values handles slider polarity uniformly
// (year/density/radius are pos↑value↑; abundance is pos↑value↓).
function sliderRangeFor(key) {
  const { lo, hi } = sliderState[key];
  if (lo === 0 && hi === 100) return null;
  const valLo = FILTER_CONFIG[key].getThreshold(lo);
  const valHi = FILTER_CONFIG[key].getThreshold(hi);
  return { min: Math.min(valLo, valHi), max: Math.max(valLo, valHi) };
}

// =====================================================
// TEMPERATURE FILTER HELPERS
// =====================================================
// Hybrid slider scale: 0K..6000K. Linear in the lower 70% of the slider
// (covering 0..2000K, where 95% of state-change drama happens — water boils
// at 373K, iron melts at 1811K, etc.), then accelerated in the upper 30%
// to reach the highest boiling points in the data (~5870K for Re/W).
// Without the hybrid stretch, all the interesting state changes get squeezed
// into the leftmost ~33% of a linear slider.
const TEMP_MIN_K     = 0;
const TEMP_MAX_K     = 6000;
const TEMP_BREAK_POS = 70;     // slider position where the linear/accelerated segments meet
const TEMP_BREAK_K   = 2000;   // temperature at the breakpoint

function posToTempK(pos) {
  if (pos <= TEMP_BREAK_POS) return (pos / TEMP_BREAK_POS) * TEMP_BREAK_K;
  return TEMP_BREAK_K + ((pos - TEMP_BREAK_POS) / (100 - TEMP_BREAK_POS)) * (TEMP_MAX_K - TEMP_BREAK_K);
}

function tempKToPos(tempK) {
  if (tempK <= TEMP_BREAK_K) return (tempK / TEMP_BREAK_K) * TEMP_BREAK_POS;
  return TEMP_BREAK_POS + ((tempK - TEMP_BREAK_K) / (TEMP_MAX_K - TEMP_BREAK_K)) * (100 - TEMP_BREAK_POS);
}

// Compute the phase an element would be in at the given temperature in Kelvin.
// Returns 'solid' | 'liquid' | 'gas'. Falls back to 'solid' for elements
// with unknown melting/boiling points (a few late transuranics) — those are
// solid at any reasonable temperature anyway.
function stateAt(tempK, elementRow) {
  const melting = elementRow[9];
  const boiling = elementRow[10];
  if (melting == null || boiling == null) return 'solid';
  if (tempK < melting) return 'solid';
  if (tempK >= boiling) return 'gas';
  return 'liquid';
}

// Format a temperature reading for the chip + panel readouts.
// Always shows K and °C (kelvin matches the underlying data, celsius is
// what humans actually feel temperature in).
function formatTempReadout(tempK) {
  const c = Math.round(tempK - 273.15);
  return `${Math.round(tempK)} K (${c >= 0 ? '+' : ''}${c}°C)`;
}

function formatYearReadout(year) {
  if (year < 0) return `c. ${Math.abs(Math.round(year))} BCE`;
  return `${Math.round(year)}`;
}

function formatAbundance(mgPerKg) {
  if (mgPerKg >= 10000) return `${(mgPerKg / 10000).toFixed(1)}%`;
  if (mgPerKg >= 1) return `${mgPerKg.toFixed(1)} mg/kg`;
  if (mgPerKg >= 0.001) return `${mgPerKg.toFixed(3)} mg/kg`;
  return `${mgPerKg.toExponential(1)} mg/kg`;
}

// Configuration for each filter dimension.
// Fields used: label (chip default text), icon (gap-control header), tip (always-visible
// explainer text below the slider), getThreshold (slider position 0-100 → real value),
// activeText (formatted threshold for chip + readouts).
const FILTER_CONFIG = {
  year: {
    label: 'Year of Discovery',
    icon: '📅',
    tip: 'Drag the handles to narrow the timeline. Most of the table was discovered between 1750 and 1950 — chemistry\'s golden century.',
    getThreshold: (pos) => getYearThreshold(pos),
    activeText: (t) => `Before ${formatYearReadout(t)}`
  },
  density: {
    label: 'Density',
    icon: '⚖',
    tip: 'Drag the handles to isolate a density range. The densest elements (osmium, iridium, platinum) cluster in one corner of the table.',
    getThreshold: (pos) => getDensityThreshold(pos),
    activeText: (t) => `≤ ${t.toFixed(2)} g/cm³`
  },
  radius: {
    label: 'Atomic Radius',
    icon: '⌖',
    tip: 'Drag the handles to isolate an atomic-radius range. Atoms shrink across a period and grow down a group — narrow the window to see this trend.',
    getThreshold: (pos) => getRadiusThreshold(pos),
    activeText: (t) => `≤ ${Math.round(t)} pm`
  },
  abundance: {
    label: "Earth's Crust Abundance",
    icon: '🌍',
    tip: 'Drag the handles to isolate an abundance range. Oxygen and silicon dominate the crust; gold and platinum are vanishingly rare. Uses a log scale.',
    getThreshold: (pos) => getAbundanceThreshold(pos),
    activeText: (t) => `≥ ${formatAbundance(t)}`
  }
};

// Format a range chip label. Renders the per-filter chip text based on the
// current lo/hi range, with one of four states:
//   { lo: 0,  hi: 100 } → null (chip falls back to default name, inactive)
//   { lo: 0,  hi: <100 } → "≤ valHi"
//   { lo: >0, hi: 100 } → "≥ valLo"
//   { lo: >0, hi: <100 } → "valLo – valHi"
function formatRangeLabel(key) {
  const { lo, hi } = sliderState[key];
  if (lo === 0 && hi === 100) return null;

  // Pull the lo/hi real values, then sort min..max (handles polarity).
  const valLo = FILTER_CONFIG[key].getThreshold(lo);
  const valHi = FILTER_CONFIG[key].getThreshold(hi);
  const minVal = Math.min(valLo, valHi);
  const maxVal = Math.max(valLo, valHi);

  // Per-filter compact value formatters for chip labels (separate from
  // mile-marker formatters because chip space is even tighter and units
  // matter for clarity).
  const fmt = {
    year:      v => v < 0 ? `${Math.abs(Math.round(v))} BCE` : `${Math.round(v)}`,
    density:   v => `${v.toFixed(1)}`,
    radius:    v => `${Math.round(v)}`,
    abundance: v => formatAbundance(v)
  }[key];
  const unit = { year: '', density: ' g/cm³', radius: ' pm', abundance: '' }[key];

  if (lo === 0)   return `≤ ${fmt(maxVal)}${unit}`;
  if (hi === 100) return `≥ ${fmt(minVal)}${unit}`;
  return `${fmt(minVal)} – ${fmt(maxVal)}${unit}`;
}

function updateChipLabels() {
  // Helper to set a slider chip's text + has-filter class based on its range.
  const setSliderChip = (key, defaultText) => {
    const chip = document.querySelector(`[data-filter="${key}"]`);
    const text = document.getElementById(`chip-text-${key}`);
    if (!chip || !text) return;
    const rangeLabel = formatRangeLabel(key);
    if (rangeLabel) {
      text.textContent = rangeLabel;
      chip.classList.add('has-filter');
    } else {
      text.textContent = defaultText;
      chip.classList.remove('has-filter');
    }
  };

  setSliderChip('year',      'Year of Discovery');
  setSliderChip('density',   'Density');
  setSliderChip('radius',    'Atomic Radius');
  setSliderChip('abundance', 'Crust Abundance');

  // State chip — summarises any active phase / synthetic / radioactive toggles
  const stateChip = document.querySelector('[data-filter="state"]');
  const stateText = document.getElementById('chip-text-state');
  const parts = [];
  if (toggleState.states.size > 0) {
    parts.push(Array.from(toggleState.states).map(s =>
      s.charAt(0).toUpperCase() + s.slice(1)).join('/'));
  }
  if (toggleState.synthetic) parts.push('Synthetic');
  if (toggleState.radioactive) parts.push('Radioactive');
  if (parts.length > 0) {
    stateText.textContent = parts.join(' · ');
    stateChip.classList.add('has-filter');
  } else {
    stateText.textContent = 'State & Type';
    stateChip.classList.remove('has-filter');
  }

  // Temperature chip — shows the current temperature when the filter is
  // active, falls back to the default label when it's off.
  const tempChip = document.querySelector('[data-filter="temperature"]');
  const tempText = document.getElementById('chip-text-temperature');
  if (tempChip && tempText) {
    if (tempState.active) {
      tempText.textContent = formatTempReadout(tempState.tempK);
      tempChip.classList.add('has-filter');
    } else {
      tempText.textContent = 'Temperature';
      tempChip.classList.remove('has-filter');
    }
  }

  // Stardust chip — summarises selected origin processes
  const stardustChip = document.querySelector('[data-filter="stardust"]');
  const stardustText = document.getElementById('chip-text-stardust');
  if (toggleState.origins.size > 0) {
    if (toggleState.origins.size === 1) {
      const key = Array.from(toggleState.origins)[0];
      const cfg = ORIGIN_CONFIG.find(o => o.key === key);
      stardustText.textContent = cfg ? cfg.short : 'Stardust';
    } else {
      stardustText.textContent = `${toggleState.origins.size} origins`;
    }
    stardustChip.classList.add('has-filter');
  } else {
    stardustText.textContent = 'Stardust';
    stardustChip.classList.remove('has-filter');
  }

}

// =====================================================
// HISTOGRAM PANEL
// =====================================================

function openFilterPanel(key) {
  // If clicking the already-active chip, close instead
  if (histoState.activeFilter === key) {
    closeFilterPanel();
    return;
  }

  // Clear any active search term when opening a filter panel — searching and
  // chip-filtering at the same time is rarely what the user wants, and the
  // search input is about to be hidden behind the panel anyway. Direct
  // applyFilters() call because setting .value doesn't fire 'input'.
  const searchInput = document.getElementById('search');
  if (searchInput && searchInput.value !== '') {
    searchInput.value = '';
    applyFilters();
  }

  histoState.activeFilter = key;

  // Update chip expanded states
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('expanded', chip.dataset.filter === key);
  });

  const gap = document.getElementById('gapControl');
  gap.hidden = false;
  gap.dataset.activeFilter = key;
  positionGapControl();

  if (key === 'state') {
    renderStateControls();
  } else if (key === 'stardust') {
    renderStardustControls();
  } else if (key === 'temperature') {
    // Opening the panel auto-activates the filter so the user immediately
    // sees the visual effect — there's no other reason to open this panel.
    // The toggle inside the panel lets them turn coloring off without
    // closing the panel (e.g., to compare colored vs uncolored views).
    if (!tempState.active) {
      tempState.active = true;
      applyTemperatureColoring();
      updateChipLabels();
    }
    renderTemperatureControls();
  } else {
    renderHistogram(key);
  }
}

function closeFilterPanel() {
  histoState.activeFilter = null;
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.remove('expanded');
  });
  document.getElementById('gapControl').hidden = true;
}

// Pin the gap-control's top/height — and the search bar's vertical position —
// to actual cell heights via runtime measurement. Both occupy the same band:
// top edge at the middle of row 1, bottom edge at the middle of row 3.
// The gap-control fills that band; the search bar is single-line and sits
// vertically centered within it.
//
// Width and left for both elements are set via CSS calc (those work correctly
// because they're percentages of the parent's width).
function positionGapControl() {
  const firstCell = document.querySelector('.element:not(.placeholder)');
  if (!firstCell) return;
  const cellH = firstCell.getBoundingClientRect().height;
  const gapPx = 3; // matches CSS gap value on .table
  const bandTop = cellH * 0.5;
  const bandHeight = cellH * 2 + gapPx * 2;

  // Gap-control fills the entire band when visible
  const gap = document.getElementById('gapControl');
  if (gap && !gap.hidden) {
    gap.style.top = `${bandTop}px`;
    gap.style.height = `${bandHeight}px`;
  }

  // Search bar sits vertically centered in the same band (regardless of
  // whether the gap-control is open — the panel just overlays it)
  const search = document.getElementById('search');
  if (search) {
    const searchH = search.getBoundingClientRect().height;
    search.style.top = `${bandTop + (bandHeight - searchH) / 2}px`;
  }
}

// Format a single mile-marker label for a given filter at a given slider %.
// Each filter has its own number-formatting needs: years are integers (with
// BCE suffix for negative), density wants smart precision, radius is plain
// integers + pm unit (skipped to keep labels short), abundance is log-scale
// and uses scientific notation in compact form.
//
// The 100% marker (rightmost) gets the unit appended — convention from
// compact chart design: numbers labelled along the axis, unit shown once
// at the end. Year stays unit-less since "2026 AD" reads worse than "2026".
function formatMarkerLabel(key, pos) {
  const value = FILTER_CONFIG[key].getThreshold(pos);
  const isLast = pos === 100;
  const unit = { density: 'g/cm³', radius: 'pm', abundance: 'mg/kg' }[key] || '';
  const withUnit = (numStr) => isLast && unit
    ? `${numStr} <span class="histo-marker-unit">${unit}</span>`
    : numStr;

  if (key === 'year') {
    const yr = Math.round(value);
    return yr < 0 ? `${Math.abs(yr)} BCE` : `${yr}`;
  }
  if (key === 'density') {
    // Range spans ~0.00009 (hydrogen gas) to ~22.6 (osmium). For mile-marker
    // labels, very-near-zero values are friendlier as "~0" than "9e-5";
    // otherwise show 1-2 decimals depending on magnitude.
    if (value < 0.05) return withUnit('~0');
    if (value < 1) return withUnit(value.toFixed(2));
    return withUnit(value.toFixed(1));
  }
  if (key === 'radius') {
    return withUnit(`${Math.round(value)}`);
  }
  if (key === 'abundance') {
    // Log scale spans many orders of magnitude — power-of-10 notation is
    // most honest. e.g. value 0.001 → "10⁻³", value 100 → "10²".
    if (value <= 0) return '';
    const exp = Math.round(Math.log10(value));
    // Render small integers in superscript using Unicode where available
    const supers = { '-': '⁻', '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
    const expStr = String(exp).split('').map(c => supers[c] || c).join('');
    return withUnit(`10${expStr}`);
  }
  return '';
}

function renderHistogram(key) {
  const config = FILTER_CONFIG[key];
  const gap = document.getElementById('gapControl');

  // Compute bins by mapping each element's value to a slider position 0-100,
  // then bucketing those positions evenly.
  const positions = [];
  ELEMENTS.forEach(el => {
    const num = el[0];
    let value = null;
    if (key === 'year') value = el[13];
    else if (key === 'density') value = el[11];
    else if (key === 'radius') value = ELEMENT_EXTRA[num] ? ELEMENT_EXTRA[num][0] : null;
    else if (key === 'abundance') value = ELEMENT_EXTRA[num] ? ELEMENT_EXTRA[num][1] : null;
    if (value === null || isNaN(value) || value === undefined) return;
    if (key === 'abundance' && value <= 0) return;
    const pos = valueToSliderPos(key, value);
    if (pos !== null) positions.push(pos);
  });

  // Compact bin count for the small in-table region. Doubled from 18 to 36
  // for finer dragging feedback — with two-handle range filtering, users
  // make smaller adjustments and need to see bars toggle in/out at higher
  // resolution. Each bar is now ~10-11px wide on a typical chart.
  const binCount = 36;
  const bins = new Array(binCount).fill(0);
  positions.forEach(pos => {
    const idx = Math.min(binCount - 1, Math.floor(pos / 100 * binCount));
    bins[idx]++;
  });
  const maxBin = Math.max(...bins, 1);

  // Mile markers at 0/25/50/75/100% of the slider — each shows the real
  // value at that position. Useful for the two-handle range model where
  // users care about absolute values, not just abstract slider positions.
  const markerPositions = [0, 25, 50, 75, 100];
  const markersHtml = markerPositions.map(p => {
    const label = formatMarkerLabel(key, p);
    // Edge markers (0 and 100) align flush; middle markers center on their position
    const styleAttr = (p === 0 || p === 100) ? '' : ` style="left: ${p}%; transform: translateX(-50%);"`;
    return `<span class="histo-marker" data-pos="${p}"${styleAttr}>${label}</span>`;
  }).join('');

  const { lo, hi } = sliderState[key];

  // Build compact chart DOM. Two thumbs (lo + hi) + markers row below
  // the chart. Drag layer covers the chart area but routes pointer events
  // to whichever thumb is closer to the click. The opacity drop on
  // excluded bars (via paintBars) is the sole signal of which range is
  // selected — no separate fill bar needed.
  gap.innerHTML = `
    <div class="gap-control-header">
      <span class="gap-control-icon">${config.icon}</span>
      <span class="gap-control-label">${config.label}</span>
    </div>
    <div class="histo-chart" id="histoChart">
      <div class="histo-bars" id="histoBars"></div>
      <div class="histo-drag" id="histoDrag"></div>
      <div class="histo-thumb histo-thumb-lo" data-handle="lo" style="left: ${lo}%"></div>
      <div class="histo-thumb histo-thumb-hi" data-handle="hi" style="left: ${hi}%"></div>
    </div>
    <div class="histo-markers">${markersHtml}</div>
    <div class="gap-control-explainer">${config.tip}</div>
  `;

  const barsContainer = document.getElementById('histoBars');
  bins.forEach(count => {
    const bar = document.createElement('div');
    bar.className = 'histo-bar';
    bar.style.height = `${(count / maxBin) * 100}%`;
    barsContainer.appendChild(bar);
  });

  paintBars(key);
  attachHistoDrag(key);
}

function valueToSliderPos(key, value) {
  // Inverse of getXThreshold — finds the slider position (0-100) at which
  // the threshold crosses this value. Used for bin placement.
  if (key === 'year') {
    const yearMin = DATA_RANGES.yearMin;
    const yearMax = DATA_RANGES.yearMax;
    const breakpoint = 25, breakYear = 1700;
    if (value <= breakYear) {
      return ((value - yearMin) / (breakYear - yearMin)) * breakpoint;
    }
    return breakpoint + ((value - breakYear) / (yearMax - breakYear)) * (100 - breakpoint);
  }
  if (key === 'density') {
    return ((value - DATA_RANGES.densityMin) / (DATA_RANGES.densityMax - DATA_RANGES.densityMin)) * 100;
  }
  if (key === 'radius') {
    return ((value - DATA_RANGES.radiusMin) / (DATA_RANGES.radiusMax - DATA_RANGES.radiusMin)) * 100;
  }
  if (key === 'abundance') {
    if (value <= 0) return null;
    const log = Math.log10(value);
    const fraction = (log - DATA_RANGES.abundanceLogMin) / (DATA_RANGES.abundanceLogMax - DATA_RANGES.abundanceLogMin);
    return 100 - fraction * 100;
  }
  return null;
}

function paintBars(key) {
  // Two-handle range model: a bar is "in range" if its bin center sits
  // between the lo and hi thumbs (inclusive). Class names below-threshold
  // and above-threshold are kept for backwards compatibility with the
  // existing per-filter palette CSS — they now mean "included" and
  // "excluded" rather than the old single-threshold semantics. The
  // opacity drop on excluded bars is the user's sole visual cue for
  // which range is selected (deliberately minimalist — no extra fill bar).
  const { lo, hi } = sliderState[key];
  const bars = document.querySelectorAll('#histoBars .histo-bar');
  const binCount = bars.length;
  bars.forEach((bar, idx) => {
    const binCenter = ((idx + 0.5) / binCount) * 100;
    const included = binCenter >= lo && binCenter <= hi;
    bar.classList.toggle('below-threshold', included);
    bar.classList.toggle('above-threshold', !included);
  });
}

function attachHistoDrag(key) {
  const chart = document.getElementById('histoChart');
  const drag = document.getElementById('histoDrag');
  const thumbLo = chart.querySelector('.histo-thumb-lo');
  const thumbHi = chart.querySelector('.histo-thumb-hi');
  // Minimum gap between thumbs (in slider %) so they stay visually distinct
  // and the user can always grab them apart again after collapsing them.
  const MIN_GAP = 1;

  // Which thumb is currently being dragged ('lo' | 'hi' | null). Set on
  // pointerdown by picking whichever thumb is closer to the click.
  let activeHandle = null;

  // Convert pointer X to a 0-100 slider position relative to the chart rect.
  // The drag layer is wider than the chart (hit-zone extension trick), but
  // 0% and 100% should still align with the chart's actual edges, so we
  // measure against the chart, not the drag layer.
  function clientXToPos(clientX) {
    const rect = chart.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return Math.round((x / rect.width) * 100);
  }

  // Apply a new position to whichever handle is active, with cross-over
  // prevention. Updates state, repaints, and re-runs filters.
  function setHandlePos(handle, pos) {
    const state = sliderState[key];
    if (handle === 'lo') {
      // lo can move from 0 up to (hi - MIN_GAP)
      const max = state.hi - MIN_GAP;
      state.lo = Math.max(0, Math.min(max, pos));
      thumbLo.style.left = `${state.lo}%`;
    } else {
      // hi can move from (lo + MIN_GAP) up to 100
      const min = state.lo + MIN_GAP;
      state.hi = Math.min(100, Math.max(min, pos));
      thumbHi.style.left = `${state.hi}%`;
    }
    paintBars(key);
    updateChipLabels();
    applyFilters();
  }

  drag.addEventListener('pointerdown', (e) => {
    const pos = clientXToPos(e.clientX);
    const { lo, hi } = sliderState[key];
    // Pick whichever thumb is closer to the click. Ties go to lo (arbitrary
    // but consistent). When both thumbs are at the same position, prefer
    // the one whose direction the click came from — clicking left of the
    // pair grabs lo, clicking right grabs hi.
    let handle;
    if (lo === hi) {
      handle = pos < lo ? 'lo' : 'hi';
    } else {
      handle = Math.abs(pos - lo) <= Math.abs(pos - hi) ? 'lo' : 'hi';
    }
    activeHandle = handle;
    drag.setPointerCapture(e.pointerId);
    setHandlePos(handle, pos);
  });
  drag.addEventListener('pointermove', (e) => {
    if (!activeHandle) return;
    setHandlePos(activeHandle, clientXToPos(e.clientX));
  });
  drag.addEventListener('pointerup', (e) => {
    activeHandle = null;
    drag.releasePointerCapture(e.pointerId);
  });
  drag.addEventListener('pointercancel', () => {
    activeHandle = null;
  });
}

// Per-key science copy for the State & Type panel. Mirrors STARDUST_COPY.
// Default appears whenever 0 or 2+ chips are active (multi-select model);
// a single-chip selection swaps in the matching body line.
const STATE_COPY = {
  default:     'Filter by physical state, or show only radioactive elements. Most are solid; mercury and bromine are the only liquids.',
  solid:       'Most of the table — metals, metalloids, carbon, sulphur, iodine, phosphorus, and the noble metals at room temperature.',
  liquid:      'Just two: mercury and bromine. Liquid at standard room temperature; the rest melt only at higher temperatures.',
  gas:         'Hydrogen, nitrogen, oxygen, fluorine, chlorine, and the noble gases — the lightest and least bonded elements.',
  synthetic:   'Made in particle accelerators, never found in nature. Most decay within seconds of being created.',
  radioactive: 'All elements past bismuth (83), plus a few exceptions like technetium and promethium. Their nuclei are unstable.'
};

// Returns the body text for the State explainer based on current selection.
// Per-key science copy for the State & Type panel. Mirrors STARDUST_COPY.
// Default appears whenever 0 or 2+ chips are active (multi-select model);
// a single-chip selection swaps in the matching body line.
// Multi-select rule: exactly one active chip → that chip's copy.
// Zero or more-than-one active → default.
function stateBodyText() {
  const activeKeys = [...toggleState.states];
  if (toggleState.synthetic) activeKeys.push('synthetic');
  if (toggleState.radioactive) activeKeys.push('radioactive');
  return activeKeys.length === 1 ? STATE_COPY[activeKeys[0]] : STATE_COPY.default;
}

function renderStateControls() {
  const gap = document.getElementById('gapControl');

  // Phase chips (Solid/Liquid/Gas) behave as a radio group — at most one active —
  // since an element can only be in one physical state at room temperature.
  // Synthetic and Radioactive are orthogonal flags that AND-combine with phase
  // (and each other) at filter time. The vertical divider in the markup signals
  // this split visually.
  const PHASE_CHIPS = ['solid', 'liquid', 'gas'];

  gap.innerHTML = `
    <div class="gap-control-header">
      <span class="gap-control-icon">❄</span>
      <span class="gap-control-label">State &amp; Type</span>
    </div>
    <div class="state-controls">
      <button class="toggle-chip ${toggleState.states.has('solid') ? 'active' : ''}" data-state="solid">Solid</button>
      <button class="toggle-chip ${toggleState.states.has('liquid') ? 'active' : ''}" data-state="liquid">Liquid</button>
      <button class="toggle-chip ${toggleState.states.has('gas') ? 'active' : ''}" data-state="gas">Gas</button>
      <span class="state-divider" aria-hidden="true"></span>
      <button class="toggle-chip ${toggleState.synthetic ? 'active' : ''}" data-flag="synthetic">Synthetic</button>
      <button class="toggle-chip ${toggleState.radioactive ? 'active' : ''}" data-flag="radioactive">☢ Radioactive</button>
    </div>
    <div class="gap-control-explainer state-explainer">
      <div class="state-prompt">What state is each element in at room temperature?</div>
      <div class="state-body" id="stateBody">${stateBodyText()}</div>
    </div>
  `;

  // Helper — refresh the dynamic body line in place after any chip toggle.
  const refreshBody = () => {
    const body = document.getElementById('stateBody');
    if (body) body.textContent = stateBodyText();
  };

  // Phase chips: radio behaviour over Solid/Liquid/Gas.
  gap.querySelectorAll('.toggle-chip[data-state]').forEach(chip => {
    chip.addEventListener('click', () => {
      const s = chip.dataset.state;
      const wasActive = toggleState.states.has(s);

      // Clear any other active phase first, then apply the standard toggle.
      PHASE_CHIPS.forEach(p => {
        if (p !== s) {
          toggleState.states.delete(p);
          const otherChip = gap.querySelector(`.toggle-chip[data-state="${p}"]`);
          if (otherChip) otherChip.classList.remove('active');
        }
      });

      if (wasActive) {
        toggleState.states.delete(s);
        chip.classList.remove('active');
      } else {
        toggleState.states.add(s);
        chip.classList.add('active');
      }

      refreshBody();
      updateChipLabels();
      applyFilters();
    });
  });

  // Flag chips: independent toggles (Synthetic, Radioactive). Each has its own
  // boolean on toggleState; the filter AND-combines them with phase. Same
  // handler for both — the chip's data-flag attribute names the boolean.
  gap.querySelectorAll('.toggle-chip[data-flag]').forEach(chip => {
    chip.addEventListener('click', () => {
      const flag = chip.dataset.flag; // 'synthetic' | 'radioactive'
      toggleState[flag] = !toggleState[flag];
      chip.classList.toggle('active', toggleState[flag]);
      refreshBody();
      updateChipLabels();
      applyFilters();
    });
  });
}

// Per-origin science copy. Shown in the lower line of the explainer when an
// origin is selected. ~100 chars each, comfortably fits in 2 lines at 11px
// inside the ~456px-wide gap-control. Default (no selection) describes the
// filter itself.
const STARDUST_COPY = {
  default:    'Filter by nucleosynthetic origin: the Big Bang, fusion in stars, supernova explosions, neutron-star mergers, or human-made in a lab.',
  bigbang:    'Hydrogen, helium, and a whisper of lithium — forged in the first 20 minutes after the universe began.',
  cosmicray:  'Lithium, beryllium, and boron — chipped from heavier nuclei by cosmic rays striking interstellar gas.',
  smallstars: 'Carbon, nitrogen, and many heavier elements — built up by nuclear fusion in low- and medium-mass stars over billions of years.',
  bigstars:   'Oxygen through iron — forged in the cores of massive stars during their lives.',
  supernova:  'Many heavy elements past iron — flung into space when massive stars exploded.',
  merger:     'Gold, platinum, and the heaviest natural elements — born when neutron stars collided.',
  synthetic:  'Synthetic elements past uranium — created in particle accelerators and nuclear reactors.'
};

function renderStardustControls() {
  const gap = document.getElementById('gapControl');

  const chipsHtml = ORIGIN_CONFIG.map(o =>
    `<button class="toggle-chip stardust-chip ${toggleState.origins.has(o.key) ? 'active' : ''}" data-origin="${o.key}">${o.short}</button>`
  ).join('');

  // Determine which copy to show based on current selection (single-select model)
  const activeOrigin = toggleState.origins.size === 1 ? Array.from(toggleState.origins)[0] : null;
  const bodyText = activeOrigin ? STARDUST_COPY[activeOrigin] : STARDUST_COPY.default;

  gap.innerHTML = `
    <div class="gap-control-header">
      <span class="gap-control-icon">✨</span>
      <span class="gap-control-label">Stardust — Cosmic Origins</span>
    </div>
    <div class="state-controls stardust-controls">${chipsHtml}</div>
    <div class="gap-control-explainer stardust-explainer">
      <div class="stardust-prompt">Where in the universe was each element forged?</div>
      <div class="stardust-body" id="stardustBody">${bodyText}</div>
    </div>
  `;

  gap.querySelectorAll('.toggle-chip[data-origin]').forEach(chip => {
    chip.addEventListener('click', () => {
      const o = chip.dataset.origin;
      const wasActive = toggleState.origins.has(o);

      // Single-select behaviour: clicking always clears prior selections.
      // Then either toggle the clicked one off (if it was already active)
      // or activate it as the sole selection.
      toggleState.origins.clear();
      gap.querySelectorAll('.toggle-chip[data-origin]').forEach(c => c.classList.remove('active'));

      if (!wasActive) {
        toggleState.origins.add(o);
        chip.classList.add('active');
      }

      // Update the dynamic explainer body in place (no re-render)
      const newOrigin = toggleState.origins.size === 1 ? Array.from(toggleState.origins)[0] : null;
      const body = document.getElementById('stardustBody');
      if (body) body.textContent = newOrigin ? STARDUST_COPY[newOrigin] : STARDUST_COPY.default;

      updateChipLabels();
      applyFilters();
    });
  });
}

// Render the temperature filter's gap-control panel: a horizontal slider
// (single handle) with hot/cold gradient track, a big readout showing the
// current temp in K + °C, an enable/disable toggle, and a color-legend
// strip showing what solid/liquid/gas tiles look like at this temperature.
//
// Unlike the histogram filters, this is a single-handle slider on a hybrid
// scale (linear 0..2000K, accelerated 2000..6000K) — see posToTempK above.
// We keep position internally as 0..100 so the existing pixel-math pattern
// from attachHistoDrag works unchanged.
function renderTemperatureControls() {
  const gap = document.getElementById('gapControl');
  const pos = tempKToPos(tempState.tempK);

  gap.innerHTML = `
    <div class="gap-control-header">
      <span class="gap-control-icon">🌡</span>
      <span class="gap-control-label">Temperature — State of Matter</span>
      <button type="button" class="temp-toggle ${tempState.active ? 'active' : ''}" id="tempToggle">
        ${tempState.active ? 'Coloring: ON' : 'Coloring: OFF'}
      </button>
    </div>
    <div class="temp-readout" id="tempReadout">${formatTempReadout(tempState.tempK)}</div>
    <div class="temp-slider" id="tempSlider">
      <div class="temp-slider-track"></div>
      <div class="temp-slider-drag" id="tempSliderDrag"></div>
      <div class="temp-slider-thumb" id="tempSliderThumb" style="left: ${pos}%"></div>
    </div>
    <div class="temp-legend">
      <span class="temp-legend-item"><span class="temp-swatch state-solid-swatch"></span>Solid</span>
      <span class="temp-legend-item"><span class="temp-swatch state-liquid-swatch"></span>Liquid</span>
      <span class="temp-legend-item"><span class="temp-swatch state-gas-swatch"></span>Gas</span>
    </div>
    <div class="gap-control-explainer">Drag to set the temperature. Each tile is recolored by the state it would be in (solid / liquid / gas). Default is room temperature (293 K, 20°C). Range covers absolute zero through 6000 K — hot enough to boil tungsten.</div>
  `;

  attachTempSliderDrag();

  document.getElementById('tempToggle').addEventListener('click', () => {
    tempState.active = !tempState.active;
    document.getElementById('tempToggle').textContent =
      tempState.active ? 'Coloring: ON' : 'Coloring: OFF';
    document.getElementById('tempToggle').classList.toggle('active', tempState.active);
    applyTemperatureColoring();
    updateChipLabels();
  });
}

// Pointer-drag handler for the temperature slider thumb. Mirrors the
// attachHistoDrag pattern but with a single handle.
function attachTempSliderDrag() {
  const slider = document.getElementById('tempSlider');
  const drag = document.getElementById('tempSliderDrag');
  const thumb = document.getElementById('tempSliderThumb');
  const readout = document.getElementById('tempReadout');

  function clientXToPos(clientX) {
    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (x / rect.width) * 100;
  }

  function setPos(pos) {
    const clamped = Math.max(0, Math.min(100, pos));
    tempState.tempK = posToTempK(clamped);
    thumb.style.left = `${clamped}%`;
    readout.textContent = formatTempReadout(tempState.tempK);
    applyTemperatureColoring();
    updateChipLabels();
  }

  drag.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    drag.setPointerCapture(e.pointerId);
    setPos(clientXToPos(e.clientX));

    const move = (ev) => setPos(clientXToPos(ev.clientX));
    const up = (ev) => {
      drag.removeEventListener('pointermove', move);
      drag.removeEventListener('pointerup', up);
      drag.removeEventListener('pointercancel', up);
      try { drag.releasePointerCapture(ev.pointerId); } catch {}
    };
    drag.addEventListener('pointermove', move);
    drag.addEventListener('pointerup', up);
    drag.addEventListener('pointercancel', up);
  });
}

function isAnyFilterActive() {
  // A two-handle slider is active when its lo or hi has moved off either
  // extreme — i.e., the range is narrower than [0, 100].
  const sliderActive = key => {
    const s = sliderState[key];
    return s.lo > 0 || s.hi < 100;
  };
  return activeFilter !== null
    || document.getElementById('search').value.trim() !== ''
    || sliderActive('year')
    || sliderActive('density')
    || sliderActive('radius')
    || sliderActive('abundance')
    || toggleState.states.size > 0
    || toggleState.synthetic
    || toggleState.radioactive
    || toggleState.origins.size > 0
    || tempState.active;
}

function applyFilters() {
  const searchTerm = document.getElementById('search').value.trim().toLowerCase();

  // Update legend states
  document.querySelectorAll('.legend-item').forEach(item => {
    if (activeFilter && item.dataset.category !== activeFilter) {
      item.classList.add('dimmed');
    } else {
      item.classList.remove('dimmed');
    }
  });

  // Compute slider ranges once per call. For each two-handle slider, translate
  // the lo and hi positions to real-world values and take min/max — this works
  // uniformly across all four sliders regardless of polarity (year/density/
  // radius increase with position; abundance decreases with position because
  // it's on a flipped log scale). The slider is "active" — and contributes
  // a real filter — only when lo > 0 OR hi < 100; otherwise the range covers
  // the full data span and we skip the clause to also let null-valued
  // elements through.
  const yearRange      = sliderRangeFor('year');
  const densityRange   = sliderRangeFor('density');
  const radiusRange    = sliderRangeFor('radius');
  const abundanceRange = sliderRangeFor('abundance');

  // Track how many real elements (excluding placeholders) survive all filters,
  // so we can surface an empty-state message when the combination matches none.
  let matchCount = 0;

  document.querySelectorAll('.element:not(.placeholder)').forEach(el => {
    const num = parseInt(el.dataset.number);
    const data = ELEMENTS.find(e => e[0] === num);
    if (!data) return;

    const [, symbol, name, , category, , , , , , , density, , year] = data;
    const extra = ELEMENT_EXTRA[num];
    const radius = extra ? extra[0] : null;
    const abundance = extra ? extra[1] : null;
    const state = extra ? extra[2] : null;
    const radioactive = extra ? extra[3] : false;

    let matches = true;

    // Category filter (legend)
    if (activeFilter && category !== activeFilter) matches = false;

    // Search filter
    if (searchTerm) {
      const matchesSearch =
        symbol.toLowerCase().includes(searchTerm) ||
        name.toLowerCase().includes(searchTerm) ||
        String(num) === searchTerm ||
        String(num).startsWith(searchTerm);
      if (!matchesSearch) matches = false;
    }

    // Range slider: year — element's discovery year must fall within range
    if (yearRange && (year < yearRange.min || year > yearRange.max)) matches = false;

    // Range slider: density — null/NaN values are excluded when the filter is active
    if (densityRange) {
      if (density === null || isNaN(density) || density < densityRange.min || density > densityRange.max) matches = false;
    }

    // Range slider: atomic radius
    if (radiusRange) {
      if (radius === null || radius < radiusRange.min || radius > radiusRange.max) matches = false;
    }

    // Range slider: crustal abundance (log-scale data, but range filter math is the same)
    if (abundanceRange) {
      if (abundance === null || abundance < abundanceRange.min || abundance > abundanceRange.max) matches = false;
    }

    // Toggle: phase at room temperature (solid / liquid / gas). Synthetic is
    // its own clause below — it's an orthogonal dimension that AND-combines
    // with phase. Solid + Synthetic now correctly returns Tc, Pm, the late
    // actinides, and the superheavy solids.
    if (toggleState.states.size > 0) {
      if (!state || !toggleState.states.has(state)) matches = false;
    }

    // Toggle: synthetic-only (orthogonal to phase, sourced from the
    // ELEMENT_SYNTHETIC Set so the data model treats it independently)
    if (toggleState.synthetic && !ELEMENT_SYNTHETIC.has(num)) matches = false;

    // Toggle: radioactive-only (AND with everything else)
    if (toggleState.radioactive && !radioactive) matches = false;

    // Toggle: stardust origin (multi-select; element matches if its origin is selected)
    if (toggleState.origins.size > 0) {
      const origin = ELEMENT_ORIGIN[num];
      if (!origin || !toggleState.origins.has(origin)) matches = false;
    }

    // Apply visual: 'faded' class for slider-based filtering (greyscale + translucent),
    // 'dimmed' for category/search (opacity-based)
    el.classList.toggle('faded', !matches);
    if (matches) matchCount++;
  });

  // Empty-state banner: shown only when at least one filter is active, nothing
  // matches, and the user hasn't actively dismissed it. The dismissed flag
  // auto-clears whenever match count returns to non-zero (see top of file),
  // so removing a filter and then hitting zero again re-shows the banner.
  const emptyBanner = document.getElementById('emptyStateBanner');
  if (emptyBanner) {
    const filtersActive = isAnyFilterActive();
    if (matchCount > 0) emptyStateDismissed = false;
    emptyBanner.hidden = !(filtersActive && matchCount === 0 && !emptyStateDismissed);
  }

  // Update reset button enabled state
  const resetBtn = document.getElementById('resetAllBtn');
  if (resetBtn) resetBtn.disabled = !isAnyFilterActive();
}

// Apply temperature-mode coloring. Separate from applyFilters() because this
// COLORS elements rather than HIDING them — it doesn't affect matchCount, the
// empty-state banner, or the .faded class. Toggles body.temperature-mode (so
// CSS knows to override category colors) and stamps a state-{solid,liquid,gas}
// class on every element cell based on the current tempState.tempK.
function applyTemperatureColoring() {
  document.body.classList.toggle('temperature-mode', tempState.active);
  document.querySelectorAll('.element[data-number]').forEach(el => {
    const num = parseInt(el.dataset.number);
    const data = ELEMENTS.find(e => e[0] === num);
    el.classList.remove('state-solid', 'state-liquid', 'state-gas');
    if (!tempState.active || !data) return;
    el.classList.add(`state-${stateAt(tempState.tempK, data)}`);
  });
}

function resetAllFilters() {
  // Reset sliders to full range (lo=0, hi=100 = no filter)
  sliderState.year      = { lo: 0, hi: 100 };
  sliderState.density   = { lo: 0, hi: 100 };
  sliderState.radius    = { lo: 0, hi: 100 };
  sliderState.abundance = { lo: 0, hi: 100 };

  // Reset toggles
  toggleState.states.clear();
  toggleState.synthetic = false;
  toggleState.radioactive = false;
  toggleState.origins.clear();

  // Reset temperature filter (keep tempK at the default so re-activating
  // starts at room temp, not wherever the user last left it)
  tempState.active = false;
  tempState.tempK = 293;
  applyTemperatureColoring();

  // Reset category & search
  activeFilter = null;
  document.getElementById('search').value = '';

  updateChipLabels();
  applyFilters();

  // If a panel is open, refresh its UI to reflect reset
  if (histoState.activeFilter === 'state') {
    renderStateControls();
  } else if (histoState.activeFilter === 'stardust') {
    renderStardustControls();
  } else if (histoState.activeFilter === 'temperature') {
    renderTemperatureControls();
  } else if (histoState.activeFilter) {
    // For a histogram filter, repainting bars and re-positioning both
    // thumbs is enough — markers stay valid since the chart axis didn't
    // change. (A full renderHistogram would also work but causes a flash.)
    const key = histoState.activeFilter;
    paintBars(key);
    const lo = document.querySelector('#histoChart .histo-thumb-lo');
    const hi = document.querySelector('#histoChart .histo-thumb-hi');
    if (lo) lo.style.left = '0%';
    if (hi) hi.style.left = '100%';
  }
}

// =====================================================
// MODAL
// =====================================================

// Maps a discoverer string from the ELEMENTS data to a Wikipedia URL,
// or returns null if no link is appropriate. The vast majority of named
// individuals follow Wikipedia's natural URL convention (replace spaces
// with underscores), but a few historical figures sit at non-obvious
// page titles and need explicit overrides. Research institutions
// (GSI, JINR, RIKEN, etc.) are intentionally not linked — keeps the
// "person hyperlink" pattern visually consistent across the table.
const DISCOVERER_WIKI_OVERRIDES = {
  // Lecoq de Boisbaudran's Wikipedia page is at his full name
  'Lecoq de Boisbaudran': 'Paul_Émile_Lecoq_de_Boisbaudran'
};

const NON_PERSON_DISCOVERERS = new Set([
  'Ancient', 'GSI', 'RIKEN', 'LBNL', 'JINR / LBNL', 'JINR / LLNL', 'ORNL / JINR'
]);

function discovererToWikiUrl(name) {
  if (!name || NON_PERSON_DISCOVERERS.has(name)) return null;
  const slug = DISCOVERER_WIKI_OVERRIDES[name] || name.replace(/ /g, '_');
  return `https://en.wikipedia.org/wiki/${encodeURI(slug)}`;
}

function openModal(data) {
  const [number, symbol, name, mass, category, group, period, config, electroneg, melting, boiling, density, discoverer, year, description] = data;
  const cat = CATEGORIES[category];

  const formatYear = (y) => {
    if (y < 0) return `c. ${Math.abs(y)} BCE`;
    return y;
  };

  // Build the "Discovered by …" sentence. Three cases:
  //   1. "Ancient"  → "Known since c. 9000 BCE." (no person, no link)
  //   2. Institution (GSI, RIKEN, etc.) → "Discovered by GSI in 1996." (no link)
  //   3. Named individual → "Discovered by <a>Joseph Louis Gay-Lussac</a> in 1808."
  let discoveredHtml;
  if (discoverer === 'Ancient') {
    discoveredHtml = `<span class="prop-discovered">Known since <strong>${formatYear(year)}</strong>.</span>`;
  } else {
    const wikiUrl = discovererToWikiUrl(discoverer);
    const nameHtml = wikiUrl
      ? `<a href="${wikiUrl}" target="_blank" rel="noopener noreferrer">${discoverer}</a>`
      : `<strong>${discoverer}</strong>`;
    discoveredHtml = `<span class="prop-discovered">Discovered by ${nameHtml} in <strong>${formatYear(year)}</strong>.</span>`;
  }

  // Zone 1 — hero: identity column on the left, properties grid on the right.
  // The 7 prop cells lay out as 3 rows × 2 cols + 1 doublewide bottom row.
  // Order is chosen so heavier numeric props (mass, density) sit at the top
  // and the human-context discovered-by sentence anchors the bottom.
  // --cat-color is set on .modal (the outer container) rather than on
  // .modal-header so that all descendants — header, the full-height left
  // border, the category pill, the atom viewer — read the same value.
  const modal = document.querySelector('#modal .modal');
  if (modal) modal.style.setProperty('--cat-color', cat.color);
  const header = document.getElementById('modalHeader');
  header.innerHTML = `
    <div class="modal-identity">
      <div class="modal-meta">
        <span>No. ${String(number).padStart(3, '0')}</span>
        <span>Group ${group || '—'} &nbsp;·&nbsp; Period ${period}</span>
      </div>
      <div class="modal-symbol">${symbol}</div>
      <div class="modal-name">${name}</div>
      <div class="modal-category-tag" style="background:${cat.color}">${cat.label}</div>
    </div>
    <div class="properties">
      <div class="prop">
        <div class="prop-label">Atomic Mass</div>
        <div class="prop-value">${mass}<span class="unit">u</span></div>
      </div>
      <div class="prop">
        <div class="prop-label">Density</div>
        <div class="prop-value">${density}<span class="unit">g/cm³</span></div>
      </div>
      <div class="prop">
        <div class="prop-label">Electron Configuration</div>
        <div class="prop-value prop-config">${config}</div>
      </div>
      <div class="prop">
        <div class="prop-label">Electronegativity</div>
        <div class="prop-value">${electroneg !== null ? electroneg : '—'}<span class="unit">${electroneg !== null ? 'Pauling' : ''}</span></div>
      </div>
      <div class="prop">
        <div class="prop-label">Melting Point</div>
        <div class="prop-value">${melting !== null ? melting : '—'}<span class="unit">${melting !== null ? 'K' : ''}</span></div>
      </div>
      <div class="prop">
        <div class="prop-label">Boiling Point</div>
        <div class="prop-value">${boiling !== null ? boiling : '—'}<span class="unit">${boiling !== null ? 'K' : ''}</span></div>
      </div>
      <div class="prop prop-doublewide">
        ${discoveredHtml}
      </div>
    </div>
  `;

  // Zone 2 — body: description strip on top (a thin horizontal hook for
  // the element's most interesting fact), atom viewer at full width below.
  // Description-first reads like a museum placard before the artifact.
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="description">${description}</div>
    <div class="atom-viewer" id="atomViewer" style="--cat-color: ${cat.color}">
      <div class="atom-header">
        <div class="atom-label">Atomic Structure</div>
        <div class="model-toggle" id="modelToggle"></div>
      </div>
      <canvas class="atom-canvas" id="atomCanvas"></canvas>
      <div class="atom-legend" id="atomLegend"></div>
      <div class="atom-note" id="atomNote"></div>
    </div>
  `;

  initAtomViewer(data);

  document.getElementById('modal').classList.add('active');
  document.body.style.overflow = 'hidden';

  // Defer the overflow check until after layout settles. The modal opens
  // with a transform transition + Three.js canvas init, both of which can
  // cause reflow. ~80ms is comfortably past the transition end without
  // feeling laggy to the user.
  setTimeout(maybeShowFullscreenSuggestion, 80);
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.body.style.overflow = '';
  disposeAtomViewer();
  // The suggestion is contextual to the modal that triggered it — once
  // the modal closes, the prompt no longer applies. Hide it (without
  // changing the dismissed flag, since this is auto-hide not user dismiss).
  hideFullscreenPrompt();
}

// =====================================================
// FULLSCREEN SUGGESTION TOAST
// =====================================================
// When an element modal opens but content overflows the viewport (i.e.,
// the modal needs a scrollbar), nudge the user toward fullscreen mode
// where there's room to display the whole card cleanly. The suggestion
// shows as a bottom-center toast plus a throb on the top-right fullscreen
// button. Suppress when already in fullscreen, or after the user has
// explicitly dismissed once this session.

function maybeShowFullscreenSuggestion() {
  if (fullscreenSuggestionDismissed) return;
  if (document.fullscreenElement) return; // already in fullscreen
  // If the modal closed before this deferred check fired (rapid open/close),
  // skip — the prompt would appear over an empty page.
  const backdrop = document.getElementById('modal');
  if (!backdrop || !backdrop.classList.contains('active')) return;
  const modalCard = document.querySelector('#modal .modal');
  if (!modalCard) return;
  // The modal scrolls when its content exceeds its max-height (90vh) —
  // scrollHeight > clientHeight catches that case directly.
  if (modalCard.scrollHeight <= modalCard.clientHeight) return;
  showFullscreenPrompt();
}

function showFullscreenPrompt() {
  const prompt = document.getElementById('fullscreenPrompt');
  const btn = document.getElementById('fullscreenBtn');
  if (prompt) prompt.hidden = false;
  if (btn) btn.classList.add('urging');
}

function hideFullscreenPrompt() {
  const prompt = document.getElementById('fullscreenPrompt');
  const btn = document.getElementById('fullscreenBtn');
  if (prompt) prompt.hidden = true;
  if (btn) btn.classList.remove('urging');
}

// =====================================================
// HAMBURGER MENU
// =====================================================
// Single dropdown panel anchored below the menu button. The three top-level
// items always render; "About this table" expands an accordion below the
// list when clicked, and a Hide button inside the accordion collapses it.
// Compact view is a body class toggled directly; reset just delegates to
// resetAllFilters().

function openMenu() {
  const panel = document.getElementById('menuPanel');
  const btn = document.getElementById('menuBtn');
  if (!panel || !btn) return;
  panel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  // Always start with the About accordion collapsed when re-opening the
  // menu, so the user gets a consistent first impression.
  collapseAbout();
}

function closeMenu() {
  const panel = document.getElementById('menuPanel');
  const btn = document.getElementById('menuBtn');
  if (!panel || !btn) return;
  panel.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
}

function expandAbout() {
  const about = document.getElementById('menuAbout');
  const trigger = document.querySelector('.menu-item[data-action="about"]');
  if (about) {
    about.classList.add('expanded');
    about.setAttribute('aria-hidden', 'false');
  }
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
}

function collapseAbout() {
  const about = document.getElementById('menuAbout');
  const trigger = document.querySelector('.menu-item[data-action="about"]');
  if (about) {
    about.classList.remove('expanded');
    about.setAttribute('aria-hidden', 'true');
  }
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function toggleAbout() {
  const about = document.getElementById('menuAbout');
  if (!about) return;
  if (about.classList.contains('expanded')) collapseAbout();
  else expandAbout();
}

// Helper — sync both UI surfaces (menu item + floating corner button) for
// a given toggle. The menu uses aria-pressed for state; the corner button
// uses both aria-pressed (for assistive tech) and the .is-on class (for
// the visual filled-blue state).
function syncToggleUI(menuAction, cornerBtnId, on) {
  const item = document.querySelector(`.menu-item[data-action="${menuAction}"]`);
  if (item) item.setAttribute('aria-pressed', String(on));
  const btn = document.getElementById(cornerBtnId);
  if (btn) {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-on', on);
  }
}

function toggleCompactView() {
  const on = document.body.classList.toggle('compact-view');
  syncToggleUI('compact', 'compactViewBtn', on);
  // Cell heights may have changed (header shrunk); re-pin search bar.
  requestAnimationFrame(positionGapControl);
}

// Dark mode — flips the body class which switches the design token values
// (surfaces, inks, rules, shadows, dot grid, accent tint) under the
// `body.dark` selector. Brand colors, category palette, histogram filter
// palettes, the stardust panel, and the atom viewer all stay unchanged
// by design — those elements either ARE the brand signal or are already
// dark in both modes. Persists the user's choice via localStorage.
const DARK_MODE_STORAGE_KEY = 'periodic-table-dark-mode';

function toggleDarkMode() {
  const on = document.body.classList.toggle('dark');
  syncToggleUI('dark', 'darkModeBtn', on);
  try {
    localStorage.setItem(DARK_MODE_STORAGE_KEY, on ? '1' : '0');
  } catch (e) {
    // Storage may be unavailable (private mode, blocked, etc.) — toggle
    // still works for this session, just won't persist on reload.
  }
}

// Sync the menu and corner button toggle states to whatever the inline
// boot script in <body> already decided. The dark class is applied
// before any paint — this just makes sure the UI controls' active
// states are correct once the DOM exists.
function initDarkMode() {
  if (document.body.classList.contains('dark')) {
    syncToggleUI('dark', 'darkModeBtn', true);
  }
}

// =====================================================
// ATOM VIEWER — Three.js
// =====================================================

// Elements that get the orbital probability cloud option
const ORBITAL_ELEMENTS = {
  1: { // Hydrogen: 1s¹
    note: "Hydrogen has a single electron in a spherical 1s orbital. The Bohr ring is a useful cartoon — the actual electron exists as a fuzzy probability cloud, denser near the nucleus and fading outward.",
    orbitals: [
      { type: 's', shell: 1, electrons: 1 }
    ]
  },
  6: { // Carbon: 1s² 2s² 2p²
    note: "Carbon's six electrons fill the 1s and 2s spherical orbitals, with two more in dumbbell-shaped 2p orbitals. The dumbbells are why carbon bonds so versatilely — they reach in different directions and rearrange when atoms combine.",
    orbitals: [
      { type: 's', shell: 1, electrons: 2 },
      { type: 's', shell: 2, electrons: 2 },
      { type: 'p', shell: 2, electrons: 2, axes: ['x', 'y'] }
    ]
  },
  8: { // Oxygen: 1s² 2s² 2p⁴
    note: "Oxygen has the same orbital shapes as carbon — spheres for s, dumbbells for p — but more 2p electrons. Notice how the same shapes repeat across elements; that pattern is what makes the periodic table periodic.",
    orbitals: [
      { type: 's', shell: 1, electrons: 2 },
      { type: 's', shell: 2, electrons: 2 },
      { type: 'p', shell: 2, electrons: 4, axes: ['x', 'y', 'z'] }
    ]
  }
};

let atomState = null;

function disposeAtomViewer() {
  if (!atomState) return;
  if (atomState.animationId) cancelAnimationFrame(atomState.animationId);
  if (atomState.renderer) {
    atomState.renderer.dispose();
    atomState.renderer.forceContextLoss();
  }
  if (atomState.scene) {
    atomState.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
  if (atomState.resizeHandler) window.removeEventListener('resize', atomState.resizeHandler);
  atomState = null;
}

function initAtomViewer(elementData) {
  const [number, symbol, name, mass] = elementData;
  const protons = number;
  const neutrons = Math.max(0, Math.round(mass) - protons);

  const canvas = document.getElementById('atomCanvas');
  const toggle = document.getElementById('modelToggle');
  const note = document.getElementById('atomNote');
  const legend = document.getElementById('atomLegend');

  const hasOrbitals = ORBITAL_ELEMENTS[number] !== undefined;

  // Build toggle buttons
  toggle.innerHTML = `<button data-mode="bohr" class="active">Bohr Model</button>` +
    (hasOrbitals ? `<button data-mode="orbital">Orbital Cloud</button>` : '');

  // Set up renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0d0c);

  const width = canvas.clientWidth || 600;
  const height = 180;
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0, 60);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(10, 10, 10);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffd9b0, 0.3);
  fillLight.position.set(-10, -5, 5);
  scene.add(fillLight);

  const root = new THREE.Group();
  scene.add(root);

  atomState = {
    scene, camera, renderer, root,
    animationId: null,
    mode: 'bohr',
    rotation: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 },
    autoRotate: true,
    elementData,
    protons, neutrons
  };

  // Build initial Bohr model
  buildBohrModel(elementData);
  updateLegend('bohr');
  note.textContent = `Simplified Bohr model — protons and neutrons in the nucleus, electrons in shells. Click and drag to rotate.`;

  // Mouse interaction
  let isDragging = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    atomState.autoRotate = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    atomState.targetRotation.y += dx * 0.008;
    atomState.targetRotation.x += dy * 0.008;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  canvas.addEventListener('pointerup', (e) => {
    isDragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  // Toggle handlers
  toggle.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === atomState.mode) return;
      toggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      atomState.mode = mode;
      clearGroup(root);
      if (mode === 'bohr') {
        buildBohrModel(elementData);
        note.textContent = `Simplified Bohr model — protons and neutrons in the nucleus, electrons in shells. Click and drag to rotate.`;
      } else {
        buildOrbitalModel(elementData);
        note.textContent = ORBITAL_ELEMENTS[number].note;
      }
      updateLegend(mode);
    });
  });

  // Resize
  const resizeHandler = () => {
    const w = canvas.clientWidth;
    if (w === 0) return;
    camera.aspect = w / height;
    camera.updateProjectionMatrix();
    renderer.setSize(w, height, false);
  };
  atomState.resizeHandler = resizeHandler;
  window.addEventListener('resize', resizeHandler);
  // First-paint catch-up: when the modal opens, the canvas's clientWidth
  // may still be 0 because the modal hasn't fully laid out yet. Defer one
  // frame and re-read so the renderer matches the actual rendered size.
  // Especially important now that the canvas spans full body width — the
  // 600px fallback would otherwise leave a stretched render until the
  // first window resize.
  requestAnimationFrame(() => resizeHandler());

  // Animate
  function animate() {
    atomState.animationId = requestAnimationFrame(animate);

    if (atomState.autoRotate) {
      atomState.targetRotation.y += 0.003;
    }

    // Smooth rotation
    atomState.rotation.x += (atomState.targetRotation.x - atomState.rotation.x) * 0.1;
    atomState.rotation.y += (atomState.targetRotation.y - atomState.rotation.y) * 0.1;
    root.rotation.x = atomState.rotation.x;
    root.rotation.y = atomState.rotation.y;

    // Animate electrons in Bohr mode
    if (atomState.mode === 'bohr' && atomState.electronShells) {
      const t = performance.now() * 0.001;
      atomState.electronShells.forEach((shell, shellIdx) => {
        shell.electrons.forEach((electron, eIdx) => {
          const baseAngle = (eIdx / shell.count) * Math.PI * 2;
          const speed = 0.4 / (shellIdx + 1);
          const angle = baseAngle + t * speed;
          electron.position.x = Math.cos(angle) * shell.radius;
          electron.position.z = Math.sin(angle) * shell.radius;
          // tilt each shell slightly differently
          electron.position.y = Math.sin(angle * 2) * shell.radius * 0.05 * (shellIdx % 2 ? 1 : -1);
        });
      });
    }

    renderer.render(scene, camera);
  }
  animate();
}

function clearGroup(group) {
  while (group.children.length > 0) {
    const obj = group.children[0];
    group.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  }
  atomState.electronShells = null;
}

// =====================================================
// BOHR MODEL
// =====================================================
function buildBohrModel(elementData) {
  const [number, , , mass] = elementData;
  const protons = number;
  const neutrons = Math.max(0, Math.round(mass) - protons);
  const root = atomState.root;

  // --- Nucleus: pack protons + neutrons in a Fibonacci sphere ---
  const total = protons + neutrons;
  const nucleusRadius = Math.cbrt(total) * 0.9 + 1.2;
  const particleSize = Math.max(0.4, Math.min(0.9, 1.6 - Math.log(total + 1) * 0.15));

  // Shuffle proton/neutron assignment
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const isProton = new Array(total).fill(false);
  for (let i = 0; i < protons; i++) isProton[indices[i]] = true;

  const protonGeom = new THREE.SphereGeometry(particleSize, 12, 12);
  const protonMat = new THREE.MeshStandardMaterial({ color: 0xD9442D, roughness: 0.6, metalness: 0.1 });
  const neutronMat = new THREE.MeshStandardMaterial({ color: 0xB8A78A, roughness: 0.7, metalness: 0.1 });

  // Fibonacci sphere distribution, then jitter inward for clustered look
  for (let i = 0; i < total; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / total);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    // Random radius inside sphere for clustered effect
    const r = nucleusRadius * Math.cbrt(0.3 + Math.random() * 0.7);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    const particle = new THREE.Mesh(protonGeom, isProton[i] ? protonMat : neutronMat);
    particle.position.set(x, y, z);
    root.add(particle);
  }

  // --- Electron shells (2, 8, 8, 18, 18, 32, 32 capacity) ---
  const shellCapacities = [2, 8, 18, 32, 32, 18, 8];
  const electronCounts = distributeElectrons(protons, shellCapacities);

  const electronMat = new THREE.MeshStandardMaterial({
    color: 0x4A90E2,
    emissive: 0x1a3a5c,
    roughness: 0.4,
    metalness: 0.2
  });
  const electronGeom = new THREE.SphereGeometry(0.5, 10, 10);
  const ringMat = new THREE.LineBasicMaterial({ color: 0x4a4239, transparent: true, opacity: 0.4 });

  const shells = [];
  electronCounts.forEach((count, idx) => {
    if (count === 0) return;
    const radius = nucleusRadius + 4 + idx * 4;

    // Draw orbit ring
    const segments = 96;
    const ringPoints = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      ringPoints.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const ringGeom = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const ring = new THREE.Line(ringGeom, ringMat);
    // tilt rings slightly so they're visible from straight-on
    ring.rotation.x = (idx % 2 === 0 ? 1 : -1) * 0.12 * idx;
    root.add(ring);

    const electrons = [];
    for (let i = 0; i < count; i++) {
      const e = new THREE.Mesh(electronGeom, electronMat);
      electrons.push(e);
      root.add(e);
    }
    shells.push({ radius, count, electrons });
  });

  atomState.electronShells = shells;

  // Adjust camera to fit
  const maxRadius = nucleusRadius + 4 + (electronCounts.length) * 4;
  atomState.camera.position.set(0, maxRadius * 0.3, maxRadius * 2.4);
  atomState.camera.lookAt(0, 0, 0);
}

function distributeElectrons(total, capacities) {
  // Simple shell-by-shell fill (not strictly Aufbau, but matches simplified Bohr 2-8-8 etc.)
  const result = new Array(capacities.length).fill(0);
  let remaining = total;
  // Use 2, 8, 8, 18, 18, 32, 32 as the simplified Bohr filling
  const simpleCapacities = [2, 8, 8, 18, 18, 32, 32];
  for (let i = 0; i < simpleCapacities.length && remaining > 0; i++) {
    const fill = Math.min(simpleCapacities[i], remaining);
    result[i] = fill;
    remaining -= fill;
  }
  return result;
}

// =====================================================
// ORBITAL CLOUD MODEL (probability density)
// =====================================================
function buildOrbitalModel(elementData) {
  const [number] = elementData;
  const config = ORBITAL_ELEMENTS[number];
  const root = atomState.root;

  // Tiny nucleus marker so students see the centre
  const nucleusGeom = new THREE.SphereGeometry(0.6, 16, 16);
  const nucleusMat = new THREE.MeshStandardMaterial({
    color: 0xD9442D,
    emissive: 0x4a1a14,
    roughness: 0.5
  });
  const nucleus = new THREE.Mesh(nucleusGeom, nucleusMat);
  root.add(nucleus);

  // Build each orbital
  config.orbitals.forEach(orbital => {
    if (orbital.type === 's') {
      buildSOrbital(root, orbital.shell);
    } else if (orbital.type === 'p') {
      orbital.axes.forEach((axis, i) => {
        buildPOrbital(root, orbital.shell, axis);
      });
    }
  });

  // Camera fit
  const maxShell = Math.max(...config.orbitals.map(o => o.shell));
  const dist = 18 + maxShell * 6;
  atomState.camera.position.set(0, dist * 0.25, dist);
  atomState.camera.lookAt(0, 0, 0);
}

function buildSOrbital(parent, shell) {
  // s orbital: spherical probability cloud. Render as a translucent sphere.
  const radius = 3 + (shell - 1) * 4;
  const opacity = shell === 1 ? 0.22 : 0.14;
  // Edwin blue tones — shell 1 darker, outer shells lighter
  const color = shell === 1 ? 0x4A90E2 : 0x7FB1E8;

  // Outer fuzzy shell
  const geom = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const sphere = new THREE.Mesh(geom, mat);
  parent.add(sphere);

  // Inner denser core
  const innerGeom = new THREE.SphereGeometry(radius * 0.55, 24, 24);
  const innerMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: opacity * 1.4,
    depthWrite: false
  });
  const innerSphere = new THREE.Mesh(innerGeom, innerMat);
  parent.add(innerSphere);

  // Wireframe outline for crispness
  const wireGeom = new THREE.SphereGeometry(radius, 16, 12);
  const wireMat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });
  parent.add(new THREE.Mesh(wireGeom, wireMat));
}

function buildPOrbital(parent, shell, axis) {
  // p orbital: dumbbell shape (two lobes). Use lathe geometry for the lobe profile.
  const lobeLength = 5 + (shell - 1) * 2;
  const color = 0x7B3FF2;  // Edwin purple
  const opacity = 0.28;

  // Build a dumbbell lobe profile (peanut/teardrop shape pointing along axis)
  // We'll create a single lobe via lathe and mirror it
  const lobePoints = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Teardrop profile: 0 at base (near nucleus), bulges out, returns to 0 at tip
    const x = t * lobeLength;
    // Width function: peaks around t=0.4
    const w = Math.sin(t * Math.PI) * lobeLength * 0.35 * (1 - t * 0.3);
    lobePoints.push(new THREE.Vector2(Math.max(0.001, w), x));
  }

  // Create one lobe, then mirror for the other
  function makeLobe(direction) {
    const geom = new THREE.LatheGeometry(lobePoints, 24);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const lobe = new THREE.Mesh(geom, mat);

    // Lathe is around y-axis by default, lobe extends in +y direction
    // Orient lobe along the requested axis
    if (axis === 'x') {
      lobe.rotation.z = -Math.PI / 2 * direction;
      if (direction === -1) lobe.rotation.z = Math.PI / 2;
    } else if (axis === 'y') {
      if (direction === -1) lobe.rotation.x = Math.PI;
    } else if (axis === 'z') {
      lobe.rotation.x = Math.PI / 2 * direction;
      if (direction === -1) lobe.rotation.x = -Math.PI / 2;
    }

    // Wireframe pass for crispness
    const wireMat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    });
    const wire = new THREE.Mesh(geom, wireMat);
    wire.rotation.copy(lobe.rotation);

    parent.add(lobe);
    parent.add(wire);
  }

  makeLobe(1);
  makeLobe(-1);
}

function updateLegend(mode) {
  const legend = document.getElementById('atomLegend');
  if (mode === 'bohr') {
    legend.innerHTML = `
      <span class="atom-legend-item"><span class="atom-legend-dot" style="background:#D9442D"></span>Proton</span>
      <span class="atom-legend-item"><span class="atom-legend-dot" style="background:#B8A78A"></span>Neutron</span>
      <span class="atom-legend-item"><span class="atom-legend-dot" style="background:#4A90E2"></span>Electron</span>
    `;
  } else {
    legend.innerHTML = `
      <span class="atom-legend-item"><span class="atom-legend-dot" style="background:#4A90E2"></span>s orbital (sphere)</span>
      <span class="atom-legend-item"><span class="atom-legend-dot" style="background:#7B3FF2"></span>p orbital (dumbbell)</span>
      <span class="atom-legend-item"><span class="atom-legend-dot" style="background:#D9442D"></span>Nucleus</span>
    `;
  }
}

// Wire up
document.addEventListener('DOMContentLoaded', () => {
  // Read the saved dark-mode preference (or fall back to OS preference)
  // BEFORE building anything that paints — avoids a light → dark flash
  // for users whose preference is dark.
  initDarkMode();

  buildTable();
  buildLegend();
  computeDataRanges();
  updateChipLabels();

  // Position the search bar (and gap-control if it ever ends up open at load).
  // Deferred a frame so the browser has laid out the table and cell heights
  // are measurable; getBoundingClientRect() before layout returns zero.
  requestAnimationFrame(positionGapControl);

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close in order of "what's most-recently in front of the user":
      // modal first (it's the most modal-like), then the launcher
      // flyout if open, then the hamburger menu, then any open filter
      // panel.
      const modal = document.getElementById('modal');
      const menuPanel = document.getElementById('menuPanel');
      const launcherEl = document.getElementById('launcher');
      if (modal.classList.contains('active')) {
        closeModal();
      } else if (launcherEl && !launcherEl.hidden) {
        if (window.PeriodicGames && window.PeriodicGames.closeLauncher) {
          window.PeriodicGames.closeLauncher();
        }
      } else if (menuPanel && !menuPanel.hidden) {
        closeMenu();
      } else if (histoState.activeFilter) {
        closeFilterPanel();
      }
    }
  });

  document.getElementById('search').addEventListener('input', applyFilters);

  // Filter chips — clicking opens/toggles the histogram panel for that filter
  document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      openFilterPanel(chip.dataset.filter);
    });
  });

  // Reset all
  document.getElementById('resetAllBtn').addEventListener('click', resetAllFilters);

  // Empty-state banner actions. Dismiss just hides the overlay (keeps filters
  // intact); Dismiss & Reset clears every active filter as well. Both set the
  // dismissed flag, but resetAllFilters() restores match count to all elements
  // so the auto-clear logic in applyFilters() flips the flag back to false on
  // the very same call — that's fine, since with no filters active the banner
  // is hidden by the `filtersActive` check anyway.
  const dismissBtn = document.getElementById('emptyStateDismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      emptyStateDismissed = true;
      const banner = document.getElementById('emptyStateBanner');
      if (banner) banner.hidden = true;
    });
  }
  const dismissResetBtn = document.getElementById('emptyStateDismissReset');
  if (dismissResetBtn) {
    dismissResetBtn.addEventListener('click', () => {
      emptyStateDismissed = true;
      resetAllFilters();
    });
  }

  // Fullscreen toggle
  const fsBtn = document.getElementById('fullscreenBtn');
  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen?.();
    }
  });

  // Corner toggle buttons — dark mode and compact view. These mirror the
  // hamburger-menu items of the same name and call the same handler
  // functions, so toggling either UI surface keeps both in sync via the
  // syncToggleUI() helper inside each toggle function.
  const darkModeBtn = document.getElementById('darkModeBtn');
  if (darkModeBtn) darkModeBtn.addEventListener('click', toggleDarkMode);
  const compactViewBtn = document.getElementById('compactViewBtn');
  if (compactViewBtn) compactViewBtn.addEventListener('click', toggleCompactView);

  document.addEventListener('fullscreenchange', () => {
    document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement);
    // Re-pin both gap-control and search bar after fullscreen change since
    // cell sizes may shift; the function no-ops on whichever isn't applicable.
    positionGapControl();
    // Entering fullscreen resolves the suggestion's premise — hide the
    // prompt and stop the throb. (Exiting fullscreen doesn't re-show it;
    // re-show would feel intrusive without a fresh modal-open trigger.)
    if (document.fullscreenElement) hideFullscreenPrompt();
  });

  // Fullscreen suggestion toast — clicking the main pill body enters
  // fullscreen directly (saves the user from hunting for the small button);
  // × dismisses for the rest of the session.
  const fsPromptAction = document.getElementById('fullscreenPromptAction');
  if (fsPromptAction) {
    fsPromptAction.addEventListener('click', () => {
      document.documentElement.requestFullscreen?.().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
      // hideFullscreenPrompt fires from fullscreenchange once we're in.
    });
  }
  const fsPromptDismiss = document.getElementById('fullscreenPromptDismiss');
  if (fsPromptDismiss) {
    fsPromptDismiss.addEventListener('click', () => {
      fullscreenSuggestionDismissed = true;
      hideFullscreenPrompt();
    });
  }

  // Reposition gap-control + search bar on window resize so their top/height
  // stay locked to actual cell heights (which change as the table reflows).
  window.addEventListener('resize', () => {
    positionGapControl();
  });

  // ===== Hamburger menu =====
  const menuBtn = document.getElementById('menuBtn');
  const menuPanel = document.getElementById('menuPanel');

  // Toggle panel on button click. Stop propagation so the document-level
  // click-outside handler below doesn't immediately close it again.
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menuPanel.hidden) {
      // Mutual exclusion with the games launcher — they're peer flyouts
      // in the top-left corner cluster, only one open at a time. Same
      // pattern in the launcher's openLauncher() in reverse.
      const launcherEl = document.getElementById('launcher');
      if (launcherEl && !launcherEl.hidden) {
        if (window.PeriodicGames && window.PeriodicGames.closeLauncher) {
          window.PeriodicGames.closeLauncher();
        }
      }
      openMenu();
    } else {
      closeMenu();
    }
  });

  // Click-outside-to-close. The panel itself stops propagation on its own
  // clicks (below) so item clicks don't bubble up and dismiss the menu
  // unintentionally — except when the action explicitly closes it.
  document.addEventListener('click', (e) => {
    if (menuPanel.hidden) return;
    if (menuPanel.contains(e.target) || menuBtn.contains(e.target)) return;
    closeMenu();
  });

  // Menu item handlers. About toggles the accordion; Compact and Dark
  // toggle body classes (stay open since user might flip them twice);
  // Reset runs and closes the menu.
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      if (action === 'about') {
        toggleAbout();
      } else if (action === 'compact') {
        toggleCompactView();
      } else if (action === 'dark') {
        toggleDarkMode();
      } else if (action === 'reset') {
        resetAllFilters();
        closeMenu();
      }
    });
  });

  // Hide button inside the About accordion — collapses the section back up.
  const menuAboutHide = document.getElementById('menuAboutHide');
  if (menuAboutHide) {
    menuAboutHide.addEventListener('click', collapseAbout);
  }

});
