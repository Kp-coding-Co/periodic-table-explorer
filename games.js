/* =============================================================================
   PERIODIC GAMES
   =============================================================================
   The games system layered on top of the periodic table app. All public
   surface is on window.PeriodicGames. Loaded after app.js — the table and
   its DOM must already exist, but this file does not depend on app.js's
   DOMContentLoaded handler having finished, only on the DOM being ready.

   FOUR SUBSYSTEMS (each its own IIFE in the DOMContentLoaded handler below):
     1. LAUNCHER OVERLAY        — 6 game tiles, 3-screen state machine,
                                   difficulty picker, rules, Start Game.
     2. DIFFICULTY SYSTEM       — body-class modes (.game-difficulty-easy/
                                   medium/hard), 3x3 hover preview, reveal
                                   budget, hard-mode veil.
     3. GAME BAR                — floating draggable strip with brand-color
                                   cascade, exit confirm, scroll-based
                                   float/collapse.
     4. ELEMENTLE                — first concrete game; Wordle-style with
                                   directional feedback on 5 properties.

   FUTURE GAMES (see PARKING LOT at the bottom of this file):
     Tinpoint, Eleminator, Curie-ousity, Atomic Clock, Test Tube — each
     plugs into the launcher registry and the difficulty/game-bar harness.

   PUBLIC API on window.PeriodicGames (built up across IIFEs):
     openLauncher(), closeLauncher()
     setDifficulty(), setRevealBudget(), getRevealState(), clearRevealsForNewGuess()
     openGameBar(), closeGameBar(), getGameBarSlots()
     writeBestScore(), readBestScore()
     startElementle(), cleanupElementle()

   The file ends with a parking-lot comment summarizing remaining work.
   ============================================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================================
     PERIODIC GAMES — LAUNCHER OVERLAY (Phase A3)
     ============================================================================
     Compact flyout that replaces the old "coming soon" panel. A peer of
     the hamburger menu in the top-left corner cluster — they share the
     same .menu-panel-style flyout pattern and mutual-exclude one another.
     A 3-screen state machine driven by a class on #launcher (.screen-1,
     .screen-2, .screen-3). Phase A3 ships screen 1 (game tile grid) and
     the navigation chrome. Screens 2 (difficulty picker) and 3 (rules +
     start) are placeholders here and get fleshed out in Phase A4.

     GAMES_REGISTRY is the source of truth for the 6 game tiles. Each
     entry has its brand color, icon SVG, name, tagline, and a "ready"
     flag. Only Elementle is ready; the other 5 show as coming-soon
     tiles that are clickable but immediately bounce back (per the user's
     request for clean dead-ends until each game is built).
     ============================================================================ */
  (function setupLauncher() {
    const launcher = document.getElementById('launcher');
    const closeBtn = document.getElementById('launcherClose');
    const backBtn = document.getElementById('launcherBack');
    const gridEl = document.getElementById('launcherGrid');
    const titleEl = document.getElementById('launcherTitle');
    const subtitleEl = document.getElementById('launcherSubtitle');
    const gamesBtn = document.getElementById('gamesBtn');

    if (!launcher || !gamesBtn) return;

    // ===== GAMES REGISTRY =====
    // Single source of truth for tile metadata. Each entry's `ready`
    // flag controls whether it's a live tile or a coming-soon dead end.
    const GAMES_REGISTRY = [
      {
        id: 'elementle',
        name: 'Elementle',
        color: '#6AAA64',
        tagline: 'Guess the secret element with feedback on five properties.',
        ready: true,
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="1" y="9" width="3.6" height="6" rx="0.6" opacity="0.35"/>
          <rect x="5.6" y="9" width="3.6" height="6" rx="0.6" opacity="0.6"/>
          <rect x="10.2" y="9" width="3.6" height="6" rx="0.6"/>
          <rect x="14.8" y="9" width="3.6" height="6" rx="0.6" opacity="0.6"/>
          <rect x="19.4" y="9" width="3.6" height="6" rx="0.6" opacity="0.35"/>
        </svg>`,
        // Per-difficulty rule statements.
        // `short` shows on screen 2 (one line under each difficulty row).
        // `full` shows on screen 3 (the rules + Start panel, can be longer).
        // Each game owns its own definition of what easy/medium/hard means.
        rules: {
          easy: {
            short: 'Full table access. The whole periodic table stays visible as a reference.',
            full: 'You have 10 guesses to find the secret element. After each guess, all 5 property tiles flip to show how close you were: green = exact match, yellow = close, grey = miss. Numeric properties also show a directional ↑/↓ arrow. The full periodic table stays visible the whole game so you can use it as a reference.'
          },
          medium: {
            short: 'Table is blurred. Click to peek through a 3×3 window — 4 reveals total per game.',
            full: 'Same 10 guesses and 5-property feedback as Easy. The catch: every tile on the periodic table is blurred and unreadable. Hover the table to preview a 3×3 window of tiles around your cursor; click to reveal that window with full details. You only get 4 reveals per game — spend them wisely. The 3×3 window re-blurs after each guess so you can plan reveals around what you have left to learn.'
          },
          hard: {
            short: 'No table at all. Pure memory — name your guesses from scratch.',
            full: 'Same 10 guesses and 5-property feedback. The periodic table is completely hidden — no symbols, no positions, no reference. You guess elements by name from memory. The 5-property feedback is your only signal. Strong recall of element families, periods, and common elements is essential. Triple multiplier reflects the difficulty.'
          }
        }
      },
      {
        id: 'tinpoint',
        name: 'Tinpoint',
        color: '#7B3FF2',
        tagline: '5 clues revealed one at a time. Guess early to score higher.',
        ready: false,
        icon: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="3" y="3" width="18" height="2.6" rx="0.6" opacity="0.2"/>
          <rect x="3" y="7" width="18" height="2.6" rx="0.6" opacity="0.4"/>
          <rect x="3" y="11" width="18" height="2.6" rx="0.6" opacity="0.6"/>
          <rect x="3" y="15" width="18" height="2.6" rx="0.6" opacity="0.8"/>
          <rect x="3" y="19" width="18" height="2.6" rx="0.6"/>
        </svg>`
      },
      {
        id: 'eleminator',
        name: 'Eleminator',
        color: '#D9442D',
        tagline: 'Guess Who-style: yes/no questions narrow the field.',
        ready: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 8 H21 M3 16 H21 M8 3 V21 M16 3 V21"/>
          <path d="M5.5 5.5 L6.5 6.5 M6.5 5.5 L5.5 6.5" stroke-width="1.6"/>
          <path d="M18 11 L19.5 12.5 L22 9.5" stroke-width="1.6"/>
        </svg>`
      },
      {
        id: 'curieousity',
        name: 'Curie-ousity',
        color: '#F59E0B',
        tagline: 'Drag and place elements onto a blank table.',
        ready: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="6"/>
          <path d="M15.5 15.5 L21 21"/>
          <path d="M11 8 V11 M11 13 V13.5" stroke-width="2.4"/>
        </svg>`
      },
      {
        id: 'atomicclock',
        name: 'Atomic Clock',
        color: '#5A9AA8',
        tagline: 'Rapid-fire timed symbol/name recall.',
        ready: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="13" r="8"/>
          <path d="M12 8.5 V13 L15 15"/>
          <path d="M9 3 H15 M12 3 V5"/>
        </svg>`
      },
      {
        id: 'testtube',
        name: 'Test Tube',
        color: '#1B4FCB',
        tagline: 'Cloze-style: fill in the blanks from element descriptions.',
        ready: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 3 V14 A3 3 0 0 0 15 14 V3"/>
          <path d="M8 3 H16"/>
          <path d="M9 11 H15" fill="currentColor" opacity="0.4"/>
        </svg>`
      }
    ];

    // ===== STATE =====
    const state = {
      isOpen: false,
      screen: 1,
      selectedGameId: null,
      selectedDifficulty: null  // 'easy' | 'medium' | 'hard' | null (set on screen 2 → 3 transition)
    };

    // ===== BUILD SCREEN 1 (TILES) =====
    function buildTiles() {
      gridEl.innerHTML = '';
      GAMES_REGISTRY.forEach(game => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'launcher-tile' + (game.ready ? '' : ' is-coming-soon');
        tile.style.setProperty('--tile-color', game.color);
        tile.dataset.gameId = game.id;
        tile.innerHTML = `
          <div class="launcher-tile-icon" aria-hidden="true">${game.icon}</div>
          <div class="launcher-tile-body">
            <div class="launcher-tile-name">
              <span>${game.name}</span>
              ${game.ready ? '' : '<span class="launcher-tile-soon">Soon</span>'}
            </div>
            <div class="launcher-tile-tagline">${game.tagline}</div>
          </div>
        `;
        tile.addEventListener('click', () => selectGame(game.id));
        gridEl.appendChild(tile);
      });
    }
    buildTiles();

    // ===== SCREEN STATE MACHINE =====
    function setScreen(n) {
      state.screen = n;
      launcher.classList.remove('screen-1', 'screen-2', 'screen-3');
      launcher.classList.add('screen-' + n);
      if (n === 1) {
        titleEl.textContent = 'Choose a game';
        subtitleEl.textContent = 'Six element-themed mini-games';
        launcher.classList.remove('has-selection');
        launcher.style.removeProperty('--launcher-color');
      } else {
        const game = GAMES_REGISTRY.find(g => g.id === state.selectedGameId);
        if (game) {
          titleEl.textContent = game.name;
          if (n === 2) {
            subtitleEl.textContent = game.ready ? 'Pick a difficulty' : 'Coming soon';
          } else {
            // Screen 3: "Easy mode • 1×" — surfaces the choice the user
            // is about to commit to. Multipliers are 1×/2×/3× for
            // easy/medium/hard.
            const diff = state.selectedDifficulty || 'easy';
            const multMap = { easy: '1×', medium: '2×', hard: '3×' };
            const labelMap = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
            subtitleEl.textContent = `${labelMap[diff]} mode  ·  ${multMap[diff]}`;
          }
          launcher.classList.add('has-selection');
          launcher.style.setProperty('--launcher-color', game.color);
        }
      }
    }

    // ===== TILE CLICK (screen 1 → screen 2) =====
    function selectGame(gameId) {
      const game = GAMES_REGISTRY.find(g => g.id === gameId);
      if (!game) return;
      state.selectedGameId = gameId;
      state.selectedDifficulty = null;

      if (!game.ready) {
        // Coming-soon games: clean dead-end with back button.
        const screen2 = document.getElementById('launcherScreen2');
        screen2.innerHTML = `
          <div style="padding: 18px 12px; text-align: center;">
            <div style="font-size: 28px; margin-bottom: 8px;">🚧</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 4px;">
              ${game.name} is in development
            </div>
            <div style="font-size: 11px; color: var(--ink-soft); max-width: 320px; margin: 0 auto;">
              ${game.tagline}
            </div>
          </div>
        `;
        setScreen(2);
        return;
      }

      // Ready games: build the difficulty picker. Three rows, one per
      // difficulty, populated from game.rules.{easy,medium,hard}.short.
      // Multipliers are fixed at 1×/2×/3× per the parking lot.
      const difficulties = [
        { id: 'easy',   label: 'Easy',   mult: '1×', icon: '◐' },
        { id: 'medium', label: 'Medium', mult: '2×', icon: '◑' },
        { id: 'hard',   label: 'Hard',   mult: '3×', icon: '●' }
      ];
      const screen2 = document.getElementById('launcherScreen2');
      screen2.innerHTML = `<div class="difficulty-list" id="difficultyList"></div>`;
      const list = screen2.querySelector('#difficultyList');
      difficulties.forEach(diff => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'difficulty-row';
        row.dataset.difficulty = diff.id;
        const ruleText = (game.rules && game.rules[diff.id] && game.rules[diff.id].short) || '';
        row.innerHTML = `
          <div class="difficulty-icon" aria-hidden="true">${diff.icon}</div>
          <div class="difficulty-body">
            <div class="difficulty-name-row">
              <span class="difficulty-name">${diff.label}</span>
              <span class="difficulty-mult">${diff.mult}</span>
            </div>
            <div class="difficulty-rule">${ruleText}</div>
          </div>
          <svg class="difficulty-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 6 L15 12 L9 18"/>
          </svg>
        `;
        row.addEventListener('click', () => selectDifficulty(diff.id));
        list.appendChild(row);
      });
      setScreen(2);
    }

    // ===== DIFFICULTY ROW CLICK (screen 2 → screen 3) =====
    function selectDifficulty(difficulty) {
      const game = GAMES_REGISTRY.find(g => g.id === state.selectedGameId);
      if (!game || !game.ready) return;
      state.selectedDifficulty = difficulty;

      const rules = (game.rules && game.rules[difficulty]) || {};
      const fullText = rules.full || rules.short || 'Rules will appear here.';
      const multMap = { easy: '1×', medium: '2×', hard: '3×' };
      const labelMap = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

      // Read best score from storage (full storage module is Phase A6,
      // but reading a single key here is cheap and means the rules
      // screen can show personal-best context from the start).
      const bestScore = readBestScore(game.id, difficulty);
      const bestPill = bestScore != null
        ? `<div class="rules-best">Best <span class="rules-best-value">${bestScore}</span> pts</div>`
        : '';

      const screen3 = document.getElementById('launcherScreen3');
      screen3.innerHTML = `
        <div class="rules-screen">
          <div class="rules-difficulty-pip" data-difficulty="${difficulty}">
            <span class="rules-difficulty-pip-dot"></span>
            <span>${labelMap[difficulty]}</span>
            <span style="opacity: 0.7; margin-left: 4px;">${multMap[difficulty]}</span>
          </div>
          <div class="rules-text">${fullText}</div>
          ${bestPill}
          <button type="button" class="rules-start" id="rulesStart">Start Game</button>
        </div>
      `;
      const startBtn = screen3.querySelector('#rulesStart');
      startBtn.addEventListener('click', startGame);
      setScreen(3);
    }

    // ===== STORAGE HELPERS =====
    // Minimal localStorage wrappers for high-score read/write. The full
    // storage module lands in Phase A6; for now we just need a way to
    // surface "Best X pts" on the rules screen and update it after a
    // game ends. Key shape: 'periodic-games-best-{gameId}-{difficulty}'.
    function readBestScore(gameId, difficulty) {
      try {
        const v = localStorage.getItem(`periodic-games-best-${gameId}-${difficulty}`);
        return v == null ? null : parseInt(v, 10);
      } catch (e) {
        return null; // localStorage blocked / unavailable
      }
    }
    function writeBestScore(gameId, difficulty, score) {
      try {
        const existing = readBestScore(gameId, difficulty);
        if (existing == null || score > existing) {
          localStorage.setItem(`periodic-games-best-${gameId}-${difficulty}`, String(score));
        }
      } catch (e) { /* ignored */ }
    }

    // ===== START GAME (screen 3 → game active) =====
    // The handoff point. Closes the launcher, applies difficulty,
    // opens the game bar, and fires the game's logic. Phase B builds
    // Elementle's actual gameplay; for now the bar opens with a
    // placeholder note in the center slot so we can verify the full
    // pipeline end-to-end.
    function startGame() {
      const game = GAMES_REGISTRY.find(g => g.id === state.selectedGameId);
      if (!game || !game.ready) return;
      const difficulty = state.selectedDifficulty || 'easy';

      // Close the launcher first (game bar is visible underneath, so
      // closing first feels like "the launcher dismissed and now I'm
      // playing").
      closeLauncher();

      // Apply difficulty: this sets the body class and triggers the
      // medium-mode blur or hard-mode veil immediately.
      if (window.PeriodicGames && window.PeriodicGames.setDifficulty) {
        window.PeriodicGames.setDifficulty(difficulty);
      }

      // Open the game bar with this game's chrome. The onExit callback
      // clears the difficulty AND tells the active game module to clean
      // up its state (since the bar's exit is the canonical "end this
      // game session" signal).
      const labelMap = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
      if (window.PeriodicGames && window.PeriodicGames.openGameBar) {
        window.PeriodicGames.openGameBar({
          name: game.name,
          difficulty: labelMap[difficulty],
          color: game.color,
          onExit: () => {
            // Tell the active game to clean up. Each game owns its
            // own cleanup function.
            if (game.id === 'elementle' && window.PeriodicGames.cleanupElementle) {
              window.PeriodicGames.cleanupElementle();
            }
            if (window.PeriodicGames && window.PeriodicGames.setDifficulty) {
              window.PeriodicGames.setDifficulty(null);
            }
          }
        });

        // Dispatch to the actual game module by id. Each game owns its
        // own start function which populates the bar slots and stage.
        if (game.id === 'elementle' && window.PeriodicGames.startElementle) {
          window.PeriodicGames.startElementle(difficulty);
        }
      }
    }

    // ===== OPEN / CLOSE =====
    function openLauncher() {
      if (state.isOpen) return;
      // Bidirectional mutual exclusion with hamburger menu — opening
      // either flyout closes the other.
      const menuPanel = document.getElementById('menuPanel');
      if (menuPanel && !menuPanel.hidden) closeMenu();

      state.isOpen = true;
      state.selectedGameId = null;
      launcher.hidden = false;
      gamesBtn.setAttribute('aria-expanded', 'true');
      setScreen(1);
    }

    function closeLauncher() {
      if (!state.isOpen) return;
      state.isOpen = false;
      launcher.hidden = true;
      gamesBtn.setAttribute('aria-expanded', 'false');
    }

    // ===== EVENT WIRING =====
    gamesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.isOpen) {
        closeLauncher();
      } else {
        openLauncher();
      }
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLauncher();
    });

    backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.screen === 3) {
        setScreen(2);
      } else if (state.screen === 2) {
        state.selectedGameId = null;
        setScreen(1);
      }
    });

    // Click-outside-to-close — same pattern as the hamburger menu.
    // Excludes clicks on the games button (its own handler toggles)
    // and inside the launcher itself.
    document.addEventListener('click', (e) => {
      if (!state.isOpen) return;
      if (launcher.contains(e.target)) return;
      if (gamesBtn.contains(e.target)) return;
      closeLauncher();
    });

    // ===== PUBLIC API =====
    window.PeriodicGames = window.PeriodicGames || {};
    Object.assign(window.PeriodicGames, {
      openLauncher,
      closeLauncher,
      // Score persistence — games call writeBestScore on a win to
      // update the (game, difficulty) record. The launcher's screen 3
      // surfaces the saved best on the Start Game screen.
      writeBestScore,
      readBestScore,
      _registry: GAMES_REGISTRY,
      _setLauncherScreen: setScreen
    });
  })();

  /* ============================================================================
     PERIODIC GAMES — DIFFICULTY SYSTEM (Phase A1)
     ============================================================================
     Wires up the body-class difficulty modes:

       window.PeriodicGames.setDifficulty('easy' | 'medium' | 'hard' | null)

     Calling with null clears all difficulty classes (back to no-game state).

     This module also:
       - Maintains the 3x3 hover preview in medium mode
       - Sizes the hard-mode veil to match the full table area
       - Tracks the reveal budget (default 4) and exposes a small API for
         games to plug into

     The actual game logic doesn't live here — this is just the difficulty
     scaffold every game will plug into. To test in the console:
         window.PeriodicGames.setDifficulty('medium')
         window.PeriodicGames.setDifficulty('hard')
         window.PeriodicGames.setDifficulty(null)
     ============================================================================ */
  (function setupDifficultySystem() {

    // Build a visual-layout map: atomic number → {row, col} matching the
    // on-screen position of the cell. Column = group, row = period — except
    // for lanthanides (57–71) which appear in their own detached row below
    // the main table, and actinides (89–103) in the row beneath that.
    //
    // We assign synthetic row numbers for those: lanthanides on row 9,
    // actinides on row 10. Within those rows, columns are 3..17 (matching
    // how the lanRow/actRow are built — placeholder cell at col 1-2, then
    // the 15 elements). This way "adjacent" 3x3 windows behave correctly
    // when hovering Lu (next to Hf via group-3 marker visually, but for
    // game purposes neighbors are within the lanthanide row itself).
    const VISUAL_POS = {};
    ELEMENTS.forEach(e => {
      const num = e[0];
      const group = e[5];
      const period = e[6];
      const category = e[4];
      let row, col;
      if (category === 'lanthanide') {
        row = 9;
        col = 3 + (num - 57); // 57→col3, 58→col4, ... 71→col17
      } else if (category === 'actinide') {
        row = 10;
        col = 3 + (num - 89); // 89→col3, 90→col4, ... 103→col17
      } else {
        row = period;
        col = group;
      }
      VISUAL_POS[num] = { row, col };
    });

    // Reverse map: "row,col" → atomic number, for fast neighborhood lookup
    const POS_TO_NUM = {};
    Object.entries(VISUAL_POS).forEach(([num, pos]) => {
      POS_TO_NUM[`${pos.row},${pos.col}`] = parseInt(num, 10);
    });

    // Game state (lives on window.PeriodicGames so games can read/write)
    const state = {
      difficulty: null,         // 'easy' | 'medium' | 'hard' | null
      revealBudget: 4,          // total reveals allowed in medium mode
      revealsUsed: 0,           // how many reveals consumed so far
      revealedNumbers: new Set() // atomic numbers currently revealed
    };

    // Find the 3x3 neighborhood (up to 9 atomic numbers) centered on the
    // given element. Returns an array of atomic numbers.
    function neighborhood(centerNum) {
      const center = VISUAL_POS[centerNum];
      if (!center) return [];
      const result = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const num = POS_TO_NUM[`${center.row + dr},${center.col + dc}`];
          if (num) result.push(num);
        }
      }
      return result;
    }

    // ===== HOVER PREVIEW (medium mode only) =====
    // As the cursor moves over the table, we light up the 9 cells that
    // would be revealed if the player clicks. We do this by toggling a
    // .reveal-preview class on those cells.
    //
    // Implementation: bind one mousemove listener to the table container
    // (event delegation). Track the "currently previewed" set of numbers
    // and only diff/update when the hovered cell changes. This keeps cost
    // down to roughly 9 class adds + 9 removes per cell change.
    let currentPreviewNumbers = new Set();

    function clearPreview() {
      currentPreviewNumbers.forEach(num => {
        const cell = document.querySelector(`.element[data-number="${num}"]`);
        if (cell) cell.classList.remove('reveal-preview');
      });
      currentPreviewNumbers.clear();
    }

    function setPreview(centerNum) {
      const next = new Set(neighborhood(centerNum));
      // Remove any previous-preview cells that aren't in the new set
      currentPreviewNumbers.forEach(num => {
        if (!next.has(num)) {
          const cell = document.querySelector(`.element[data-number="${num}"]`);
          if (cell) cell.classList.remove('reveal-preview');
        }
      });
      // Add any new-set cells that weren't in the previous set
      next.forEach(num => {
        if (!currentPreviewNumbers.has(num)) {
          const cell = document.querySelector(`.element[data-number="${num}"]`);
          if (cell) cell.classList.add('reveal-preview');
        }
      });
      currentPreviewNumbers = next;
    }

    const tableEl = document.getElementById('table');
    if (tableEl) {
      tableEl.addEventListener('mousemove', (e) => {
        if (state.difficulty !== 'medium') return;
        const cell = e.target.closest('.element');
        if (!cell) {
          clearPreview();
          return;
        }
        const num = parseInt(cell.dataset.number, 10);
        if (num) setPreview(num);
      });
      // Clear preview when the cursor leaves the table entirely.
      tableEl.addEventListener('mouseleave', clearPreview);
      // Also clear when the page is scrolled or window is blurred — the
      // preview shouldn't persist if the user is no longer focused on
      // the table.
      window.addEventListener('blur', clearPreview);
    }

    // ===== REVEAL CLICK HANDLER =====
    // Bound at table level via event delegation. In medium mode a click
    // on an element tile triggers a reveal of the 3x3 window around that
    // tile (decrementing the budget). This needs to FIRE BEFORE the
    // existing per-cell click handler that opens the modal — otherwise
    // clicking a tile to reveal would also open the modal.
    //
    // Strategy: use the capture phase on the table, and stopPropagation()
    // when we're handling the click for game purposes.
    if (tableEl) {
      tableEl.addEventListener('click', (e) => {
        if (state.difficulty !== 'medium') return;
        const cell = e.target.closest('.element');
        if (!cell) return;
        const num = parseInt(cell.dataset.number, 10);
        if (!num) return;
        // If the budget is exhausted, swallow the click so it doesn't
        // open the modal — but don't reveal anything either. Add a brief
        // shake to the clicked tile so the click registers as feedback,
        // not a dead input.
        if (state.revealsUsed >= state.revealBudget) {
          e.stopPropagation();
          cell.classList.remove('reveal-nope');
          // Force reflow so the animation can replay if clicked again
          // immediately. Reading offsetWidth is a sync layout op — fine
          // for an interaction-driven event like a click.
          void cell.offsetWidth;
          cell.classList.add('reveal-nope');
          setTimeout(() => cell.classList.remove('reveal-nope'), 300);
          return;
        }
        // Reveal the 3x3 window. If any tiles in the window are already
        // revealed that's fine — they stay revealed, no extra cost.
        const window3x3 = neighborhood(num);
        window3x3.forEach(n => state.revealedNumbers.add(n));
        state.revealsUsed += 1;
        updateRevealedClasses();
        updateRevealsExhaustedClass();
        // Notify the active game (if any) that a reveal happened, so it
        // can update the UI counter. Phase A2/A3 will hook into this.
        if (typeof state.onRevealUsed === 'function') {
          state.onRevealUsed(state.revealsUsed, state.revealBudget);
        }
        e.stopPropagation();
      }, true /* capture phase, runs before per-cell click */);
    }

    function updateRevealedClasses() {
      // Toggle .is-revealed on every element cell to match revealedNumbers.
      // Cheap because we only have 118 cells.
      document.querySelectorAll('.element').forEach(cell => {
        const num = parseInt(cell.dataset.number, 10);
        if (state.revealedNumbers.has(num)) {
          cell.classList.add('is-revealed');
        } else {
          cell.classList.remove('is-revealed');
        }
      });
    }

    function updateRevealsExhaustedClass() {
      document.body.classList.toggle(
        'reveals-exhausted',
        state.revealsUsed >= state.revealBudget
      );
    }

    function clearRevealsForNewGuess() {
      // Called by the game between guesses — re-blurs everything so the
      // player has to spend reveals strategically per-guess (within their
      // total budget for the game).
      state.revealedNumbers.clear();
      updateRevealedClasses();
    }

    // ===== HARD-MODE VEIL SIZING =====
    // The veil is positioned absolutely inside .table. Its height needs
    // to span from the top of the main grid through the bottom of the
    // actinide row. We measure the visible content of #table after layout
    // and set the veil to match.
    const veilEl = document.getElementById('hardModeVeil');

    function sizeHardModeVeil() {
      if (!veilEl || !tableEl) return;
      // The veil sits inside #table (position:absolute) but needs to cover
      // the main grid PLUS the detached lanthanide/actinide rows that live
      // as siblings of #table. Measure to the bottom of the actinide row
      // (or lanthanide if actinide isn't there yet) and extend the height.
      const tableRect = tableEl.getBoundingClientRect();
      const lanRow = document.querySelector('.lanthanide-row');
      const actRow = document.querySelector('.actinide-row');
      const bottomEl = actRow || lanRow || tableEl;
      const bottomRect = bottomEl.getBoundingClientRect();
      const totalHeight = bottomRect.bottom - tableRect.top;
      const inset = 4;
      veilEl.style.top = inset + 'px';
      veilEl.style.left = inset + 'px';
      veilEl.style.right = inset + 'px';
      veilEl.style.height = (totalHeight - inset * 2) + 'px';
    }

    // Resize the veil whenever the table might have resized.
    window.addEventListener('resize', sizeHardModeVeil);
    // Also resize on first frame after the table is built (the table is
    // built sync at DOMContentLoaded by buildTable() earlier in this
    // file, so by the time we get here it's already in the DOM).
    requestAnimationFrame(sizeHardModeVeil);

    // ===== PUBLIC API =====
    function setDifficulty(level) {
      // Clear all three classes first
      document.body.classList.remove(
        'game-difficulty-easy',
        'game-difficulty-medium',
        'game-difficulty-hard',
        'reveals-exhausted'
      );
      // Reset reveal state any time the difficulty changes
      state.revealedNumbers.clear();
      state.revealsUsed = 0;
      updateRevealedClasses();
      // Always clear the hover preview when changing difficulty
      clearPreview();

      state.difficulty = level;
      if (level === 'easy' || level === 'medium' || level === 'hard') {
        document.body.classList.add('game-difficulty-' + level);
      }
      // Re-measure veil whenever we enter hard mode (the table may have
      // been hidden previously and dimensions could be stale).
      if (level === 'hard') {
        requestAnimationFrame(sizeHardModeVeil);
      }
    }

    // Expose on window for games and console testing.
    window.PeriodicGames = window.PeriodicGames || {};
    Object.assign(window.PeriodicGames, {
      setDifficulty,
      clearRevealsForNewGuess,
      // Lets a game query/listen to reveal state without poking at
      // internal state directly.
      getRevealState() {
        return {
          used: state.revealsUsed,
          budget: state.revealBudget,
          revealed: Array.from(state.revealedNumbers)
        };
      },
      setRevealBudget(n) { state.revealBudget = n; },
      onRevealUsed(callback) { state.onRevealUsed = callback; },
      // Internal accessors mainly for debugging / future games.
      _state: state,
      _neighborhood: neighborhood
    });
  })();

  /* ============================================================================
     PERIODIC GAMES — GAME BAR (Phase A2)
     ============================================================================
     The persistent strip during gameplay. Lives between masthead and chip
     rail when at top of page; floats fixed to viewport top when scrolled
     past. Draggable horizontally via square grabbers on each end (only
     when floating).

     Public API:
       window.PeriodicGames.openGameBar({
         name: 'Elementle',           // shown in pill
         difficulty: 'easy',          // optional sub-label
         color: '#6AAA64',            // brand color cascade
         onExit: () => { ... }        // called after confirm + cleanup
       })
       window.PeriodicGames.closeGameBar()
       window.PeriodicGames.getGameBarSlots()
         // returns { name, center, right } DOM nodes for game logic to populate

     The bar has three game-controlled slots (name, center, right) and
     handles all chrome itself: float-on-scroll, drag, collapse-on-deep-
     scroll, exit confirm, and brand-color cascade.
     ============================================================================ */
  (function setupGameBar() {
    const slot = document.getElementById('gameBarSlot');
    const bar = document.getElementById('gameBar');
    const grabberL = document.getElementById('gbGrabberLeft');
    const grabberR = document.getElementById('gbGrabberRight');
    const nameSlot = document.getElementById('gbName');
    const centerSlot = document.getElementById('gbCenter');
    const rightSlot = document.getElementById('gbRight');
    const exitBtn = document.getElementById('gbExit');
    const exitConfirmYes = document.getElementById('gbExitConfirmYes');
    const exitConfirmNo = document.getElementById('gbExitConfirmNo');

    if (!bar) return; // Defensive — should never happen, but lets the rest of the file load even if markup is missing

    const barState = {
      isOpen: false,
      onExit: null,
      // Drag state
      isDragging: false,
      dragStartX: 0,         // viewport X at drag start
      dragStartLeft: 0,      // bar.left (in px) at drag start
      // Scroll/float state
      isFloating: false,
      // Persists across float on/off transitions during the same session
      // — once the user has dragged, we remember the dragged position and
      // restore it whenever the bar floats again.
      draggedLeft: null
    };

    // ===== OPEN / CLOSE =====

    function openGameBar(opts) {
      opts = opts || {};
      // Set the brand color cascade. Default to Edwin blue if not provided.
      if (opts.color) {
        bar.style.setProperty('--gb-color', opts.color);
      } else {
        bar.style.removeProperty('--gb-color');
      }
      // Populate the name pill. Allows raw text or a name + difficulty.
      const namelabel = nameSlot.querySelector('.gb-name-label');
      if (namelabel) namelabel.textContent = opts.name || 'Game';
      // Remove any previous difficulty sub-label, then add the new one if given
      const oldDiff = nameSlot.querySelector('.gb-name-difficulty');
      if (oldDiff) oldDiff.remove();
      if (opts.difficulty) {
        const diff = document.createElement('span');
        diff.className = 'gb-name-difficulty';
        diff.textContent = opts.difficulty;
        nameSlot.appendChild(diff);
      }
      // Clear any previous slot content. Each game populates these via
      // getGameBarSlots() after openGameBar() returns.
      centerSlot.innerHTML = '';
      rightSlot.innerHTML = '';

      barState.onExit = typeof opts.onExit === 'function' ? opts.onExit : null;
      barState.isOpen = true;
      // Reset drag state on a fresh open. Preserve nothing across games.
      barState.draggedLeft = null;

      document.body.classList.add('game-active');
      // Make sure exit confirm isn't lingering from a previous session
      hideExitConfirm();
      // Apply float-state immediately based on current scroll (may already
      // be scrolled past the masthead when a game is opened from the
      // launcher).
      updateFloatState();
    }

    function closeGameBar() {
      barState.isOpen = false;
      barState.onExit = null;
      document.body.classList.remove('game-active');
      // Clean up float/drag state so the next game starts fresh.
      bar.classList.remove('is-floating', 'is-dragging');
      bar.style.left = '';
      barState.isFloating = false;
      barState.draggedLeft = null;
      // Cancel any in-flight un-float timer so it doesn't fire after
      // the bar has been hidden.
      if (unfloatTimer) {
        clearTimeout(unfloatTimer);
        unfloatTimer = null;
      }
      hideExitConfirm();
      // Clear the game stage — Elementle's guess history grid, etc.
      const stage = document.getElementById('gameStage');
      if (stage) stage.innerHTML = '';
      // Clear difficulty class — the bar opening generally implies a
      // game starting, and closing the bar means the game ended. We
      // don't always own the difficulty class lifecycle (a game could
      // open without setting one), so leave that to the game's own
      // exit handler. The launcher coordinates this in Phase A4.
    }

    // ===== EXIT CONFIRM =====
    // First click on × shows the confirm overlay. The user has to either
    // confirm (✓) or cancel (×). This guards against accidental clicks
    // when reaching for the adjacent grabber.

    function showExitConfirm() {
      exitBtn.classList.add('is-confirming');
      // Auto-cancel after 4 seconds if no choice — prevents the confirm
      // from getting stuck open if the player abandons the page.
      clearTimeout(barState.confirmTimer);
      barState.confirmTimer = setTimeout(hideExitConfirm, 4000);
    }
    function hideExitConfirm() {
      exitBtn.classList.remove('is-confirming');
      clearTimeout(barState.confirmTimer);
    }
    function confirmExit() {
      hideExitConfirm();
      // Run the game's exit callback first (lets it persist any state),
      // then close the bar. If the callback throws, still close the bar.
      try {
        if (typeof barState.onExit === 'function') barState.onExit();
      } catch (err) {
        console.error('Game onExit threw:', err);
      }
      closeGameBar();
    }

    if (exitBtn) {
      exitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (exitBtn.classList.contains('is-confirming')) {
          // Already confirming — clicking × again cancels (same as no)
          hideExitConfirm();
        } else {
          showExitConfirm();
        }
      });
    }
    if (exitConfirmYes) {
      exitConfirmYes.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmExit();
      });
    }
    if (exitConfirmNo) {
      exitConfirmNo.addEventListener('click', (e) => {
        e.stopPropagation();
        hideExitConfirm();
      });
    }
    // Click outside the confirm dismisses it (safer than leaving it open
    // while the player tries to do other things).
    document.addEventListener('click', (e) => {
      if (!exitBtn.classList.contains('is-confirming')) return;
      const wrap = exitBtn.closest('.gb-exit-wrap');
      if (wrap && wrap.contains(e.target)) return;
      hideExitConfirm();
    });

    // ===== FLOAT-ON-SCROLL =====
    // When the page scrolls past the natural position of the bar, switch
    // it to position:fixed so it stays visible at the top of the viewport.
    // When scrolled deep past the table, also collapse the center slot
    // so the bar shrinks to just name + dots/score (40px-ish) — keeping
    // the player oriented without overlaying too much page content.

    // updateFloatState handles two transitions and one steady-state update:
    //   1) Float-in (docked → floating):    set centered-X inline, add
    //      .is-floating, then on the next frame swap to draggedLeft
    //      (if any) so CSS animates the slide.
    //   2) Float-out (floating → docked):   animate to centered-X first,
    //      then after the transition completes, drop .is-floating and
    //      clear inline left so the docked layout takes over cleanly.
    //   3) Continuous (still floating):     update centered-X on viewport
    //      resize. Only relevant if undragged; dragged positions stay
    //      where the user put them.
    //
    // The slot itself never moves — it's a fixed-height spacer in the
    // document flow. The bar inside it is what swaps positioning models.

    function getCenteredFloatLeft() {
      // Where the bar would sit when centered as a floating element.
      // Pixel-precise, no transform tricks — see the .is-floating CSS
      // rule for why we avoid translateX(-50%) here.
      return Math.round((window.innerWidth - bar.offsetWidth) / 2);
    }

    // Used to defer the un-float so the slide-back animation finishes
    // before we drop .is-floating. Cancelled if the user re-floats
    // (scrolls back down) before it fires.
    let unfloatTimer = null;

    function updateFloatState() {
      if (!barState.isOpen) return;
      const slotRect = slot.getBoundingClientRect();
      // The float threshold matches the floating bar's `top: 12px` —
      // we float exactly when the docked position would scroll past
      // y=12, which is precisely where the floating bar pins. This
      // makes the dock→float transition seamless vertically: the bar
      // never visually jumps up or down at the threshold, only swaps
      // positioning model. On the way back up, the bar un-floats at
      // the same threshold, so it never appears to "scroll past" its
      // natural docked Y.
      const FLOAT_TOP_PX = 12;
      const shouldFloat = slotRect.top < FLOAT_TOP_PX;

      if (shouldFloat !== barState.isFloating) {
        barState.isFloating = shouldFloat;

        if (shouldFloat) {
          // === Float-IN (docked → floating) ===
          // Cancel any pending un-float (user reversed direction mid-
          // animation).
          if (unfloatTimer) {
            clearTimeout(unfloatTimer);
            unfloatTimer = null;
          }
          // Start at centered-X so there's no visual jump from the
          // docked centered position to a fixed-positioned bar.
          const centeredX = getCenteredFloatLeft();
          bar.style.left = centeredX + 'px';
          bar.classList.add('is-floating');
          // If there's a dragged position, animate over to it on the
          // next frame. Two RAFs because adding the class needs to
          // commit first so the transition rule applies.
          if (barState.draggedLeft != null) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                bar.style.left = barState.draggedLeft + 'px';
              });
            });
          }
        } else {
          // === Float-OUT (floating → docked) ===
          // Animate back to centered-X first, THEN un-float so the
          // user sees a smooth slide rather than a snap. After the
          // 280ms left-transition, drop .is-floating and clear the
          // inline left so the docked layout retakes control.
          const centeredX = getCenteredFloatLeft();
          bar.style.left = centeredX + 'px';
          unfloatTimer = setTimeout(() => {
            unfloatTimer = null;
            // Only commit the un-float if we're still in a should-be-
            // docked state (user might have scrolled back down during
            // the animation).
            if (!barState.isFloating) {
              bar.classList.remove('is-floating');
              bar.style.left = '';
            }
          }, 290);
        }
      } else if (shouldFloat && barState.draggedLeft == null) {
        // Steady-state while floating, undragged — keep the bar
        // centered if the viewport resizes. Cheap, just rewrites
        // inline left if it's drifted.
        const centeredX = getCenteredFloatLeft();
        const currentLeft = parseFloat(bar.style.left) || 0;
        if (Math.abs(currentLeft - centeredX) > 0.5) {
          bar.style.left = centeredX + 'px';
        }
      }

      // Note: an earlier version of this code collapsed the bar's
      // center slot to 0 width on deep scrolls, hiding the input. That
      // turned out to break gameplay (the input is the player's primary
      // interaction surface, you can't hide it mid-game) and the bar
      // is already compact enough at full size that there's no real
      // estate problem to solve. Removed in favor of "bar stays at
      // full size whenever it's floating".
    }

    // Scroll listener uses passive for perf. RAF-throttled because
    // updateFloatState reads layout (getBoundingClientRect) and could
    // be expensive at 120Hz.
    let scrollScheduled = false;
    function onScroll() {
      if (scrollScheduled) return;
      scrollScheduled = true;
      requestAnimationFrame(() => {
        scrollScheduled = false;
        updateFloatState();
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateFloatState);

    // ===== DRAG (only when floating) =====
    // Mousedown on either grabber starts a drag. We track the bar's
    // left in px during the drag (clamped to viewport), and persist
    // the final position in barState.draggedLeft for re-application
    // if the bar refloats later.

    function onGrabberDown(grabber, e) {
      if (!barState.isFloating) return;
      e.preventDefault();
      e.stopPropagation();
      // The bar is already pixel-positioned via inline `left` while
      // floating (no transform tricks anymore — see .is-floating CSS).
      // We just read the current visual left as the drag start anchor.
      const visualLeft = bar.getBoundingClientRect().left;
      // .is-dragging on the BAR kills the left-transition so cursor
      // tracking is 1:1 with no easing lag.
      bar.classList.add('is-dragging');
      barState.isDragging = true;
      grabber.classList.add('is-dragging');
      barState.dragStartX = e.clientX;
      barState.dragStartLeft = visualLeft;
      // Reset clamp-side tracking so the very first bump in this drag
      // session fires the wobble cleanly.
      lastClampSide = null;
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragUp, { once: true });
    }

    // Track which boundary the bar is currently clamped against, so we
    // can detect the *transition* into clamped state and only fire the
    // wobble once per bump (not on every mousemove while clamped).
    let lastClampSide = null;  // 'left' | 'right' | null

    // Compute the drag clamp limits from the actual positions of the
    // adjacent corner buttons. Left limit: the bar's left edge can go
    // up to 8px past the right edge of the games button (mirroring the
    // 8px gap pattern that exists between the hamburger and games
    // buttons). Right limit: the bar's right edge can go up to 8px
    // before the left edge of the leftmost right-cluster button (the
    // compact-view button, or whichever button sits furthest from the
    // right edge in the corner cluster).
    //
    // We measure live each drag so this stays correct if buttons ever
    // move, get hidden, or new ones get added. Falls back to a generic
    // 12px viewport margin if a button can't be found (defensive).
    function computeClampLimits(barWidth) {
      const gap = 8;
      const fallbackMargin = 12;
      const gamesBtnEl = document.getElementById('gamesBtn');
      // The leftmost right-cluster button — historically compact-view,
      // but if that ever goes away fall through to dark mode, then to
      // fullscreen.
      const rightAnchor = document.getElementById('compactViewBtn')
        || document.getElementById('darkModeBtn')
        || document.getElementById('fullscreenBtn');

      let minLeft = fallbackMargin;
      let maxLeft = window.innerWidth - barWidth - fallbackMargin;

      if (gamesBtnEl) {
        const r = gamesBtnEl.getBoundingClientRect();
        minLeft = r.right + gap;
      }
      if (rightAnchor) {
        const r = rightAnchor.getBoundingClientRect();
        maxLeft = r.left - gap - barWidth;
      }
      // Defensive: if a wonky window size makes minLeft > maxLeft
      // (e.g. extremely narrow viewport), pin the bar at minLeft and
      // accept that it'll overlap the right cluster. Better than
      // refusing to move.
      if (minLeft > maxLeft) maxLeft = minLeft;
      return { minLeft, maxLeft };
    }

    function fireBumpWobble(side) {
      // The button to wobble depends on which side the bar bumped:
      // hitting the left limit means the bar hit the games button;
      // hitting the right limit means it hit the right-cluster anchor.
      let targetEl = null;
      if (side === 'left') {
        targetEl = document.getElementById('gamesBtn');
      } else if (side === 'right') {
        targetEl = document.getElementById('compactViewBtn')
          || document.getElementById('darkModeBtn')
          || document.getElementById('fullscreenBtn');
      }
      if (!targetEl) return;
      // Re-trigger the animation cleanly: remove first, force reflow,
      // then re-add. Without the reflow read, adding the class while
      // it's already present is a no-op.
      targetEl.classList.remove('gb-bump');
      void targetEl.offsetWidth;
      targetEl.classList.add('gb-bump');
      // Auto-clear after the animation finishes so further bumps can
      // re-fire it. 320ms matches the keyframe duration.
      setTimeout(() => targetEl.classList.remove('gb-bump'), 340);
    }

    function onDragMove(e) {
      if (!barState.isDragging) return;
      const dx = e.clientX - barState.dragStartX;
      const desiredLeft = barState.dragStartLeft + dx;
      const barWidth = bar.offsetWidth;
      const { minLeft, maxLeft } = computeClampLimits(barWidth);
      const newLeft = Math.max(minLeft, Math.min(maxLeft, desiredLeft));
      bar.style.left = newLeft + 'px';
      barState.draggedLeft = newLeft;

      // Wobble feedback on transition into a clamped state. We compare
      // against `desiredLeft` to detect when the user is actively
      // pushing past the limit (not just resting there).
      let nowSide = null;
      if (desiredLeft < minLeft) nowSide = 'left';
      else if (desiredLeft > maxLeft) nowSide = 'right';
      if (nowSide && nowSide !== lastClampSide) {
        fireBumpWobble(nowSide);
      }
      lastClampSide = nowSide;
    }

    function onDragUp() {
      barState.isDragging = false;
      bar.classList.remove('is-dragging');
      grabberL.classList.remove('is-dragging');
      grabberR.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onDragMove);
    }

    if (grabberL) grabberL.addEventListener('mousedown', (e) => onGrabberDown(grabberL, e));
    if (grabberR) grabberR.addEventListener('mousedown', (e) => onGrabberDown(grabberR, e));

    // ===== PUBLIC API =====
    window.PeriodicGames = window.PeriodicGames || {};
    Object.assign(window.PeriodicGames, {
      openGameBar,
      closeGameBar,
      getGameBarSlots() {
        return { name: nameSlot, center: centerSlot, right: rightSlot };
      },
      getGameStage() {
        // The persistent game-content area below the bar — for guess
        // histories, score panels, etc. Each game populates this with
        // its own UI when it starts and clears it when it ends.
        return document.getElementById('gameStage');
      },
      isGameActive() {
        return barState.isOpen;
      }
    });
  })();

  /* ============================================================================
     ELEMENTLE — Phase B
     ============================================================================
     Wordle-style element-guessing game. The player has 10 guesses to find
     a secret element from a curated pool of 34 recognizable elements.
     After each guess, 5 properties flip to reveal feedback:

       atomic#  — green/yellow/grey + ↑/↓ direction arrow
       period   — green/yellow/grey + ↑/↓
       group    — green/yellow/grey + ↑/↓
       category — green if same category, yellow if same block (s/p/d/f),
                  grey otherwise
       state    — green if same state at standard temp/pressure, grey otherwise

     Yellow-band thresholds: ±10 atomic#, ±1 period, ±2 group.

     Score on win: (guesses_remaining + 1) × difficulty_multiplier.
       multiplier: 1× easy, 2× medium, 3× hard
       guesses_remaining = guesses left AFTER the winning guess
       So a first-guess hard-mode win is 10 × 3 = 30, max possible.

     Difficulty hooks (handled by the harness, not this module):
       - Easy: full table visible
       - Medium: table blurred, player has 4 reveals (3x3 windows)
                 The reveal mechanic auto-clears between guesses (Elementle
                 calls clearRevealsForNewGuess() after each submitted guess).
       - Hard: table fully hidden behind the diagonal-stripe veil
     ============================================================================ */
  (function setupElementle() {

    // ===== SECRET ELEMENT POOL =====
    // 34 recognizable elements that the secret is drawn from. Players
    // can guess any of the 118 elements (see onInputChange) — this
    // narrower pool just keeps the secret achievable. Covers the first
    // 20, common transition metals (Fe, Cu, Zn, Ag, Sn, Pt, Au, Hg, Pb),
    // the famous halogens and noble gases (Br, I, He, Ne, Ar, Kr, Xe),
    // and a handful of "known by name" heavies (U, Pu).
    const ELEMENTLE_POOL = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,    // H–Ne
      11, 12, 13, 14, 15, 16, 17, 18,    // Na–Ar
      19, 20,                            // K, Ca
      26, 29, 30,                        // Fe, Cu, Zn
      35,                                // Br
      47, 50,                            // Ag, Sn
      53, 54,                            // I, Xe
      78, 79, 80, 82,                    // Pt, Au, Hg, Pb
      92, 94                             // U, Pu
    ];

    // Index ELEMENTS by atomic number for fast lookup. ELEMENTS is the
    // master array defined earlier in the file (each row is the data
    // for one element). Using element[0] as the atomic number key.
    const ELEMENT_BY_NUM = {};
    ELEMENTS.forEach(e => { ELEMENT_BY_NUM[e[0]] = e; });

    // ===== STATE-AT-STANDARD-CONDITIONS LOOKUP =====
    // ELEMENTS rows have melting/boiling points but not a direct
    // "state at room temp" field. Derive it: solid if melting >
    // 293K, liquid if melting <= 293 < boiling, gas if boiling <= 293.
    // For the few elements with unknown m/b points (synthetic
    // transuranics), default to 'solid' (irrelevant since none of
    // those are in our pool anyway).
    function stateAt293K(elementRow) {
      const melting = elementRow[9];
      const boiling = elementRow[10];
      if (melting == null || boiling == null) return 'solid';
      if (melting > 293) return 'solid';
      if (boiling <= 293) return 'gas';
      return 'liquid';
    }

    // Block lookup (s/p/d/f) — derived from category. Used for the
    // "yellow if same block" rule on the category property.
    const CATEGORY_TO_BLOCK = {
      'alkali metal': 's',
      'alkaline earth metal': 's',
      'transition metal': 'd',
      'post-transition metal': 'p',
      'metalloid': 'p',
      'nonmetal': 'p',           // C, N, O, P, S, Se covers; H special-case
      'reactive nonmetal': 'p',
      'halogen': 'p',
      'noble gas': 'p',
      'lanthanide': 'f',
      'actinide': 'f',
      'unknown': null,
      'diatomic nonmetal': 'p',
      'polyatomic nonmetal': 'p'
    };
    // Hydrogen is technically s-block (1s¹) but lives visually in
    // group 1; we'll treat it as 's' for block matching.
    function blockOf(elementRow) {
      const num = elementRow[0];
      if (num === 1) return 's';
      // Try the category-based lookup first
      const cat = (elementRow[4] || '').toLowerCase();
      if (CATEGORY_TO_BLOCK[cat]) return CATEGORY_TO_BLOCK[cat];
      // Fallback by group: groups 1-2 are s, 3-12 are d, 13-18 are p
      const group = elementRow[5];
      if (group >= 1 && group <= 2) return 's';
      if (group >= 3 && group <= 12) return 'd';
      if (group >= 13 && group <= 18) return 'p';
      return null;
    }

    // ===== GAME STATE =====
    const game = {
      isActive: false,
      difficulty: null,        // 'easy' | 'medium' | 'hard'
      maxGuesses: 10,
      secret: null,            // ELEMENTS row of the secret element
      guesses: [],             // array of ELEMENTS rows submitted so far
      input: null,             // <input> DOM node
      dropdown: null,          // <div> DOM node for autocomplete
      activeIndex: 0,          // current highlighted index in dropdown
      filtered: [],            // current dropdown candidates
      stage: null,             // .game-stage DOM node (where history lives)
      ended: false             // true after win or 10th-guess loss
    };

    // ===== COMPARISON: GUESS vs SECRET =====
    // Returns an object with one entry per property describing how
    // the guess compared to the secret. Each entry has `state` (one of
    // 'exact', 'close', 'miss') and optionally `dir` (1 or -1) for
    // numeric properties to indicate the direction the secret lies in.
    function compareGuess(guess, secret) {
      const result = {};

      // Atomic number — exact, ±10, or miss. Direction: secret > guess → ↑.
      const dAtomic = secret[0] - guess[0];
      result.atomicNumber = {
        state: dAtomic === 0 ? 'exact' : Math.abs(dAtomic) <= 10 ? 'close' : 'miss',
        dir: dAtomic === 0 ? 0 : (dAtomic > 0 ? 1 : -1),
        value: guess[0]
      };

      // Period — exact, ±1, or miss.
      const dPeriod = secret[6] - guess[6];
      result.period = {
        state: dPeriod === 0 ? 'exact' : Math.abs(dPeriod) <= 1 ? 'close' : 'miss',
        dir: dPeriod === 0 ? 0 : (dPeriod > 0 ? 1 : -1),
        value: guess[6]
      };

      // Group — exact, ±2, or miss. Note: lanthanides/actinides have
      // group 3 in the data, which is a quirk we just live with.
      const dGroup = secret[5] - guess[5];
      result.group = {
        state: dGroup === 0 ? 'exact' : Math.abs(dGroup) <= 2 ? 'close' : 'miss',
        dir: dGroup === 0 ? 0 : (dGroup > 0 ? 1 : -1),
        value: guess[5]
      };

      // Category — exact, same-block (yellow), or miss.
      const guessCat = (guess[4] || '').toLowerCase();
      const secretCat = (secret[4] || '').toLowerCase();
      const guessBlock = blockOf(guess);
      const secretBlock = blockOf(secret);
      let catState;
      if (guessCat === secretCat) catState = 'exact';
      else if (guessBlock && secretBlock && guessBlock === secretBlock) catState = 'close';
      else catState = 'miss';
      result.category = {
        state: catState,
        value: guess[4]
      };

      // State at room temp — green if same, grey if not. No yellow band.
      const guessState = stateAt293K(guess);
      const secretState = stateAt293K(secret);
      result.physState = {
        state: guessState === secretState ? 'exact' : 'miss',
        value: guessState
      };

      return result;
    }

    // Convenience: is the guess the secret?
    function isWinningGuess(guess, secret) {
      return guess[0] === secret[0];
    }

    // ===== UI: BUILDING =====
    // Build the bar's center slot (the input + dropdown), the bar's
    // right slot (the attempt dots + score readout), and the stage
    // (the guess history grid).

    function buildBarUI() {
      const slots = window.PeriodicGames.getGameBarSlots();
      if (!slots) return;

      // Center slot — input field. The dropdown is appended to <body>
      // (not inside the input wrap) so it can escape the bar's
      // overflow:hidden clipping. JS positions it via getBoundingClientRect.
      slots.center.innerHTML = `
        <div class="ele-input-wrap">
          <input type="text"
                 class="ele-input"
                 id="eleInput"
                 placeholder="Type an element…"
                 autocomplete="off"
                 spellcheck="false"
                 aria-label="Element guess input">
        </div>
      `;
      game.input = document.getElementById('eleInput');

      // Dropdown lives at the document body level so it can sit on top
      // of the bar without being clipped. Reuse one dropdown across
      // restarts — clear and re-create on every start to avoid stale
      // listeners.
      let dd = document.getElementById('eleDropdown');
      if (dd) dd.remove();
      dd = document.createElement('div');
      dd.id = 'eleDropdown';
      dd.className = 'ele-dropdown';
      dd.setAttribute('role', 'listbox');
      dd.hidden = true;
      document.body.appendChild(dd);
      game.dropdown = dd;

      // Right slot — guesses-remaining counter + (medium only) reveals.
      // Single number is much more compact than 10 dots and frees up
      // horizontal real estate for the input. The counter is styled
      // as a small pill with icon + count.
      slots.right.innerHTML = `
        <div class="ele-guesses" id="eleGuesses" title="Guesses remaining">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7 V12 L15 14"/>
          </svg>
          <span id="eleGuessesCount">${game.maxGuesses}</span>
        </div>
        ${game.difficulty === 'medium'
          ? `<div class="ele-reveals" id="eleReveals" title="Reveals remaining">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                 <circle cx="12" cy="12" r="3"/>
                 <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
               </svg>
               <span id="eleRevealsCount">4</span>
             </div>`
          : ''}
      `;
      renderGuessCounter();

      // Wire input handlers
      game.input.addEventListener('input', onInputChange);
      game.input.addEventListener('keydown', onInputKeyDown);
      game.input.addEventListener('focus', onInputFocus);
      game.input.addEventListener('blur', onInputBlur);

      // Reposition the dropdown on scroll/resize since its position is
      // computed from the input's bounding rect.
      window.addEventListener('scroll', positionDropdown, { passive: true });
      window.addEventListener('resize', positionDropdown);
    }

    function positionDropdown() {
      if (!game.input || !game.dropdown || game.dropdown.hidden) return;
      const inputRect = game.input.getBoundingClientRect();
      // Sit just below the input, matching its width. The input is
      // narrow (inside the bar), so a slightly wider dropdown reads
      // better — clamp to ~280px min so suggestions don't squeeze.
      const minWidth = 240;
      const width = Math.max(minWidth, inputRect.width);
      // Center the dropdown on the input if we're widening it.
      const xCenter = inputRect.left + inputRect.width / 2;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, xCenter - width / 2));
      game.dropdown.style.top = (inputRect.bottom + 6) + 'px';
      game.dropdown.style.left = left + 'px';
      game.dropdown.style.width = width + 'px';
    }

    function buildStage() {
      const stage = window.PeriodicGames.getGameStage();
      if (!stage) return;
      stage.innerHTML = `
        <div class="ele-stage">
          <div class="ele-history" id="eleHistory"></div>
          <div class="ele-end-panel" id="eleEndPanel" hidden></div>
        </div>
      `;
      game.stage = stage;
    }

    // Render the remaining-guesses counter in the right slot. Counts
    // down from maxGuesses to 0. On a winning final guess we briefly
    // flash green before the end panel takes over; on a loss we flash
    // red. Uses CSS classes for the flash so JS only manipulates state.
    function renderGuessCounter() {
      const countEl = document.getElementById('eleGuessesCount');
      if (!countEl) return;
      const remaining = game.maxGuesses - game.guesses.length;
      countEl.textContent = String(remaining);
      const wrap = document.getElementById('eleGuesses');
      if (!wrap) return;
      // Flash colors based on game state. The .is-win / .is-loss styles
      // tint the counter green or red after the final guess.
      wrap.classList.remove('is-win', 'is-loss', 'is-low');
      if (game.ended) {
        const lastGuess = game.guesses[game.guesses.length - 1];
        if (lastGuess && isWinningGuess(lastGuess, game.secret)) {
          wrap.classList.add('is-win');
        } else {
          wrap.classList.add('is-loss');
        }
      } else if (remaining <= 3) {
        // Tint orange when running low so the player feels the pressure.
        wrap.classList.add('is-low');
      }
    }

    // Render a single guess row in the history grid.
    function renderGuessRow(comparison, guessRow) {
      const tilesData = [
        { key: 'atomicNumber', label: '#',     value: comparison.atomicNumber.value, dir: comparison.atomicNumber.dir, state: comparison.atomicNumber.state },
        { key: 'period',       label: 'Period', value: comparison.period.value, dir: comparison.period.dir, state: comparison.period.state },
        { key: 'group',        label: 'Group', value: comparison.group.value || '—', dir: comparison.group.dir, state: comparison.group.state },
        { key: 'category',     label: 'Category', value: shortenCategory(comparison.category.value), state: comparison.category.state },
        { key: 'physState',    label: 'State', value: capitalize(comparison.physState.value), state: comparison.physState.state }
      ];

      const tilesHtml = tilesData.map(t => {
        const arrowSvg = t.dir === 1
          ? '<svg class="ele-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5 V19 M6 11 L12 5 L18 11"/></svg>'
          : t.dir === -1
            ? '<svg class="ele-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5 V19 M6 13 L12 19 L18 13"/></svg>'
            : '';
        return `
          <div class="ele-tile is-${t.state}" data-key="${t.key}">
            <div class="ele-tile-label">${t.label}</div>
            <div class="ele-tile-value">${t.value}${arrowSvg}</div>
          </div>
        `;
      }).join('');

      const row = document.createElement('div');
      row.className = 'ele-row';
      row.innerHTML = `
        <div class="ele-row-name">
          <span class="ele-row-symbol">${guessRow[1]}</span>
          <span class="ele-row-fullname">${guessRow[2]}</span>
        </div>
        <div class="ele-row-tiles">${tilesHtml}</div>
      `;
      return row;
    }

    function shortenCategory(cat) {
      // Trim long category names to fit in the tile.
      if (!cat) return '—';
      return cat
        .replace('post-transition metal', 'post-trans')
        .replace('alkaline earth metal', 'alk earth')
        .replace('alkali metal', 'alkali')
        .replace('transition metal', 'transition')
        .replace('reactive nonmetal', 'nonmetal')
        .replace('diatomic nonmetal', 'nonmetal')
        .replace('polyatomic nonmetal', 'nonmetal');
    }
    function capitalize(s) {
      return s ? s[0].toUpperCase() + s.slice(1) : '';
    }

    // ===== INPUT / DROPDOWN BEHAVIOR =====
    function onInputChange(e) {
      const q = (e.target.value || '').trim().toLowerCase();
      if (!q) {
        hideDropdown();
        return;
      }
      // Match against ALL 118 elements (not just the curated secret pool).
      // Players can guess any element — using "junk" guesses like Tennessine
      // as probes to narrow down the secret is a valid strategy. The
      // secret itself is still drawn from the curated pool so wins are
      // achievable with recognizable elements.
      const guessedNums = new Set(game.guesses.map(g => g[0]));
      const candidates = ELEMENTS
        .filter(el => {
          if (!el) return false;
          if (guessedNums.has(el[0])) return false;
          const name = el[2].toLowerCase();
          const sym = el[1].toLowerCase();
          const num = String(el[0]);
          return name.startsWith(q) || sym === q || sym.startsWith(q) || num === q;
        })
        .slice(0, 8);

      game.filtered = candidates;
      game.activeIndex = 0;
      renderDropdown();
    }

    function renderDropdown() {
      if (!game.filtered.length) {
        hideDropdown();
        return;
      }
      const html = game.filtered.map((el, i) => `
        <button type="button"
                class="ele-dropdown-item ${i === game.activeIndex ? 'is-active' : ''}"
                data-num="${el[0]}"
                role="option"
                aria-selected="${i === game.activeIndex}">
          <span class="ele-dropdown-num">${el[0]}</span>
          <span class="ele-dropdown-symbol">${el[1]}</span>
          <span class="ele-dropdown-name">${el[2]}</span>
        </button>
      `).join('');
      game.dropdown.innerHTML = html;
      game.dropdown.hidden = false;
      positionDropdown();
      // Wire item clicks
      game.dropdown.querySelectorAll('.ele-dropdown-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          // mousedown (not click) so we beat the input's blur which
          // would otherwise close the dropdown before the click registers
          e.preventDefault();
          const num = parseInt(item.dataset.num, 10);
          submitGuessByNumber(num);
        });
      });
    }

    function hideDropdown() {
      if (game.dropdown) {
        game.dropdown.hidden = true;
        game.dropdown.innerHTML = '';
      }
      game.filtered = [];
    }

    function onInputKeyDown(e) {
      if (game.ended) {
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!game.filtered.length) return;
        game.activeIndex = Math.min(game.filtered.length - 1, game.activeIndex + 1);
        renderDropdown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!game.filtered.length) return;
        game.activeIndex = Math.max(0, game.activeIndex - 1);
        renderDropdown();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (game.filtered.length) {
          submitGuessByNumber(game.filtered[game.activeIndex][0]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideDropdown();
      }
    }

    function onInputFocus() {
      // If the input has content, re-trigger the filter to show dropdown
      if (game.input && game.input.value.trim()) {
        onInputChange({ target: game.input });
      }
    }
    function onInputBlur() {
      // Delay so click handlers on dropdown items can fire first
      setTimeout(() => {
        // Only hide if focus didn't move into the dropdown
        if (!game.dropdown.contains(document.activeElement)) {
          hideDropdown();
        }
      }, 150);
    }

    // ===== GUESS SUBMISSION =====
    function submitGuessByNumber(num) {
      if (game.ended) return;
      const guess = ELEMENT_BY_NUM[num];
      if (!guess) return;
      if (game.guesses.find(g => g[0] === num)) return;  // already guessed

      game.guesses.push(guess);
      game.input.value = '';
      hideDropdown();

      const comparison = compareGuess(guess, game.secret);
      const row = renderGuessRow(comparison, guess);
      const historyEl = document.getElementById('eleHistory');
      if (historyEl) historyEl.appendChild(row);

      renderGuessCounter();

      // Medium mode: clear the per-guess reveal blanket so the player
      // has to spend reveals strategically per-guess (still capped at
      // 4 total). The harness handles the actual blur reset.
      if (game.difficulty === 'medium' && window.PeriodicGames.clearRevealsForNewGuess) {
        window.PeriodicGames.clearRevealsForNewGuess();
      }

      // Win/lose detection
      if (isWinningGuess(guess, game.secret)) {
        endGame(true);
      } else if (game.guesses.length >= game.maxGuesses) {
        endGame(false);
      }
    }

    // ===== END GAME =====
    function endGame(didWin) {
      game.ended = true;
      renderGuessCounter();  // re-render to show win/loss tint
      if (game.input) game.input.disabled = true;
      hideDropdown();

      const multMap = { easy: 1, medium: 2, hard: 3 };
      const mult = multMap[game.difficulty] || 1;
      const remaining = game.maxGuesses - game.guesses.length;
      const score = didWin ? (remaining + 1) * mult : 0;

      // Persist best score
      if (didWin && window.PeriodicGames.writeBestScore) {
        window.PeriodicGames.writeBestScore('elementle', game.difficulty, score);
      }

      renderEndPanel(didWin, score);
    }

    function renderEndPanel(didWin, score) {
      const panel = document.getElementById('eleEndPanel');
      if (!panel) return;

      const secret = game.secret;
      const [number, symbol, name, mass, category, group, period, config, electroneg, melting, boiling, density, discoverer, year, description] = secret;
      const cat = CATEGORIES[category] || { color: 'var(--ink-muted)', label: 'unknown' };

      // Build the discovered-by sentence using the same logic as the
      // main modal, so the win panel feels like a continuation of the
      // reference experience the player already knows.
      const formatYear = (y) => (y < 0 ? `c. ${Math.abs(y)} BCE` : y);
      let discoveredHtml;
      if (discoverer === 'Ancient') {
        discoveredHtml = `<span class="prop-discovered">Known since <strong>${formatYear(year)}</strong>.</span>`;
      } else {
        const wikiUrl = (typeof discovererToWikiUrl === 'function') ? discovererToWikiUrl(discoverer) : '';
        const nameHtml = wikiUrl
          ? `<a href="${wikiUrl}" target="_blank" rel="noopener noreferrer">${discoverer}</a>`
          : `<strong>${discoverer}</strong>`;
        discoveredHtml = `<span class="prop-discovered">Discovered by ${nameHtml} in <strong>${formatYear(year)}</strong>.</span>`;
      }

      // Build the panel: a result banner up top (Got it! / Out of guesses
      // + score), then the modal-style identity + properties grid, then
      // the description strip, then the action buttons. We reuse the
      // existing .modal-identity, .properties, .prop, .description CSS
      // so the win panel reads as visually continuous with the element
      // profile modal users already know — minus the atom viewer.
      const guessCountText = game.guesses.length === 1 ? '1 guess' : `${game.guesses.length} guesses`;
      const diffLabel = capitalize(game.difficulty);

      panel.innerHTML = `
        <div class="ele-end-result" data-state="${didWin ? 'win' : 'loss'}">
          <div class="ele-end-result-headline">${didWin ? 'Got it!' : 'Out of guesses'}</div>
          <div class="ele-end-result-detail">
            ${didWin
              ? `${guessCountText} · ${diffLabel} mode`
              : `Better luck next time.`}
          </div>
          ${didWin
            ? `<div class="ele-end-result-score"><span class="ele-end-result-score-value">${score}</span><span class="ele-end-result-score-label">pts</span></div>`
            : ''}
        </div>

        <div class="ele-end-profile" style="--cat-color: ${cat.color};">
          <div class="ele-end-header">
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
          </div>
          <div class="ele-end-description description">${description}</div>
        </div>

        <div class="ele-end-actions">
          <button type="button" class="ele-end-btn ele-end-btn-primary" id="eleEndAgain">Play again</button>
          <button type="button" class="ele-end-btn" id="eleEndExit">Exit</button>
        </div>
      `;
      panel.hidden = false;

      document.getElementById('eleEndAgain').addEventListener('click', () => {
        const diff = game.difficulty;
        cleanupGame();
        startElementle(diff);
      });
      document.getElementById('eleEndExit').addEventListener('click', () => {
        cleanupGame();
        if (window.PeriodicGames.closeGameBar) window.PeriodicGames.closeGameBar();
        if (window.PeriodicGames.setDifficulty) window.PeriodicGames.setDifficulty(null);
      });
    }

    // ===== START / STOP =====
    function startElementle(difficulty) {
      // Reset state for a fresh game.
      game.isActive = true;
      game.difficulty = difficulty;
      game.guesses = [];
      game.ended = false;
      game.activeIndex = 0;
      game.filtered = [];

      // Pick a random secret from the pool.
      const num = ELEMENTLE_POOL[Math.floor(Math.random() * ELEMENTLE_POOL.length)];
      game.secret = ELEMENT_BY_NUM[num];

      // Reset reveal budget to 4 (default; harness already does this on
      // setDifficulty but be explicit here for clarity).
      if (window.PeriodicGames.setRevealBudget) {
        window.PeriodicGames.setRevealBudget(4);
      }
      // Subscribe to reveal-used events so the bar's counter updates.
      if (window.PeriodicGames.onRevealUsed) {
        window.PeriodicGames.onRevealUsed((used, budget) => {
          const countEl = document.getElementById('eleRevealsCount');
          if (countEl) countEl.textContent = String(budget - used);
        });
      }

      buildBarUI();
      buildStage();

      // Auto-focus the input so the player can start typing
      // immediately. requestAnimationFrame because the bar may still
      // be animating in.
      requestAnimationFrame(() => {
        if (game.input) game.input.focus();
      });
    }

    function cleanupGame() {
      game.isActive = false;
      game.secret = null;
      game.guesses = [];
      game.ended = false;
      game.input = null;
      // Remove the body-level dropdown so it doesn't linger across games
      if (game.dropdown && game.dropdown.parentNode) {
        game.dropdown.parentNode.removeChild(game.dropdown);
      }
      game.dropdown = null;
      game.stage = null;
      // Detach scroll/resize listeners — they'll be re-added when a
      // new game starts. Use the same function reference so removal
      // works.
      window.removeEventListener('scroll', positionDropdown);
      window.removeEventListener('resize', positionDropdown);
    }

    // ===== PUBLIC API =====
    // Expose start so the launcher's startGame can call it. The
    // launcher already does the bar-open + difficulty-set; this
    // module's start just populates the slots.
    window.PeriodicGames = window.PeriodicGames || {};
    window.PeriodicGames.startElementle = startElementle;
    window.PeriodicGames.cleanupElementle = cleanupGame;
    window.PeriodicGames._elementleState = game;  // for debugging
  })();
});

/* =============================================================================
   PARKING LOT — PLANNED FUTURE WORK
   =============================================================================
   This file ships a complete periodic table with chip-rail filtering, six
   filter dimensions including Stardust, the floating gap-control panel,
   the 3D atom viewer with orbital cloud mode, a category legend, fullscreen,
   and search. Planned work below is grouped by chat session.

   ---------------------------------------------------------------------------
   NEXT CHAT — TOP-OF-PAGE LAYOUT
   ---------------------------------------------------------------------------
   Focus: rework the masthead area. Open questions / planned changes:
     - Hamburger menu button (top-left), space reserved for it.
     - Games launcher button (also top-left, next to hamburger). Will open
       the Periodic Games overlay (see "PERIODIC GAMES SYSTEM" below).
     - Search bar relocation — currently centered in <header>; planned
       move TBD. Could go inline with the chip rail, into the masthead
       chrome, or behind a search icon.
     - Possible visual rebalancing of the masthead h1, eyebrow, and any
       new top-area chrome.

   Touchpoints in current code:
     - <header> in HTML (search input lives here as #search)
     - <button class="fullscreen-btn" id="fullscreenBtn"> top-right, fixed
     - .frame is the main page container
     - applyFilters() reads from #search; preserve that contract during
       any relocation work.

   ---------------------------------------------------------------------------
   PERIODIC GAMES SYSTEM (multi-chat build)
   ---------------------------------------------------------------------------
   Six game modes that share a common harness. Each makes use of the periodic
   table as a learning scaffold, with three difficulty levels that progressively
   remove access to the table as a reference.

   GAME MODES (with assigned brand color for chrome / launcher tile / game bar):
     1. Elementle      — Wordle-style: guess the secret element, get directional
                          feedback on 5 properties (atomic#, period, group,
                          category, state). Color: #6AAA64 (Wordle green).
                          Icon: row of 5 squares (grey/yellow/green).
     2. Tinpoint       — Pinpoint-style: 5 clues revealed one at a time,
                          decreasing in difficulty. Score by how early you guess.
                          Color: Edwin Purple #7B3FF2.
                          Icon: 5 horizontal rows in a darkening gradient.
     3. Eleminator     — Guess Who-style: yes/no questions narrow the field.
                          Free-form (using anthropic API in artifacts) preferred.
                          Color: Edwin Red #D9442D.
                          Icon: tic-tac-toe-like grid with Xs and a check.
     4. Curie-ousity   — Drag/place elements onto a blank table. Spatial recall.
                          Color: Amber #F59E0B.
                          Icon: magnifying glass with question mark.
     5. Atomic Clock   — Rapid-fire timed symbol/name recall.
                          Color: Edwin Teal Light #5A9AA8.
                          Icon: stopwatch.
     6. Test Tube      — Cloze-style fill-in-the-blank from element descriptions.
                          Color: Cobalt #1B4FCB.
                          Icon: lab beaker.

   DIFFICULTY SYSTEM (cross-cutting):
     - Easy   = full table access + element details, score multiplier 1×
     - Medium = game-specific limited access (e.g. lookup budgets, symbols
                only, no detail cards), 2×
     - Hard   = no table reference at all, 3×
     Implementation: body class .game-difficulty-easy/medium/hard switches
     CSS rules to mute, partially-hide, or fully-hide the table. Each game
     defines its own concrete medium-mode rule when built.

   LAUNCHER UI:
     - Top-left button (joystick / dice / rocket icon TBD), with reserved
       space for a hamburger menu next to it.
     - Click → 2-column × 4-row overlay morphs through three screens:
         Screen 1: "Choose a game" header + 6 game tiles (2×3 below).
         Screen 2: Game name + tagline + 3 difficulty rows (Easy/Med/Hard,
                   each with the per-game rule and multiplier).
         Screen 3: Full rules + Start Game button (overlay can expand here).
     - Persistent back arrow top-left during screens 2 and 3.
     - Closes via outside click, Escape, or × in corner.
     - Color cascade: chosen game's brand color fills the overlay chrome.

   GAME BAR (during active play):
     - Persistent strip below masthead. Slots:
         [Game name + difficulty] [Center: prompt/input] [Score, lives, timer] [Exit ×]
     - Carries the active game's brand color.
     - Collapses to ~40px when the user scrolls past the masthead, becoming
       position:fixed with a soft shadow underneath.

   PERSISTENCE:
     - Per-game high scores via the artifact storage API (window.storage).
     - Tracks best score per (game, difficulty) tuple.
     - Survives page reload. No daily-puzzle / streak system in v1.

   ELEMENT CLICK BEHAVIOR DURING PLAY:
     - No game active → opens detail modal (current behavior).
     - Game active + element is a valid input target → fires game's input
       handler (defined per game).
     - Game active + reference-only mode → opens modal in easy, no-op in
       medium/hard.

   BUILD ORDER:
     1. ✓ DONE — Top-of-page layout: masthead, hamburger, search, games
        button. Games button (top-left, dice icon) now opens the
        full launcher overlay rather than a placeholder panel.
     2. Launcher harness + Elementle end-to-end (multi-chat). Status:
        ✓ A1 DONE — Difficulty CSS system (.game-difficulty-easy/medium/
          hard), 3x3 hover preview, click-to-reveal mechanic with
          budget tracking, hard-mode veil. PeriodicGames.setDifficulty(),
          setRevealBudget(), getRevealState(), clearRevealsForNewGuess().
        ✓ A2 DONE — Floating draggable game bar with brand-color
          cascade, exit confirm, scroll-based float/collapse,
          game-active gating of search + chip rail. PeriodicGames.
          openGameBar(), closeGameBar(), getGameBarSlots().
        ✓ A3 DONE — Launcher overlay (compact flyout, peer of hamburger
          menu) with 6-tile registry, screen state machine, screen 1
          fully wired. Coming-soon dead-ends for the 5 unbuilt games.
          PeriodicGames.openLauncher(), closeLauncher().
        ✓ A4 DONE — Difficulty picker (screen 2) and rules + Start Game
          button (screen 3). Per-game rules.{easy,medium,hard}.{short,full}
          fields drive the rule text; multipliers fixed at 1×/2×/3×.
          Start Game closes the launcher, applies difficulty class,
          opens the game bar with the right config + onExit handler
          to clean up on exit. Best score persists via localStorage
          and surfaces on screen 3 as a "Best X pts" pill.
          PeriodicGames.writeBestScore(), readBestScore().
        ⏳ A5 — Element-click router: central function that decides
          whether a click opens modal, fires game's onElementClick,
          triggers reveal, or no-ops based on state.
        ⏳ A6 — Storage wiring expansion (per-game custom data beyond
          best scores; stats; etc.) Already minimally wired in A4.
        ⏳ B  — Elementle game logic, content, polish.
     3. Each subsequent game in its own chat, plugging into the harness.

   AUTHORING NOTES:
     - For Tinpoint: start with ~10 well-known elements fully clue-authored
       (5 clues each, Tier 1=abstract trivia → Tier 5=common-knowledge).
       Avoid synthetic / rare-earth elements where cultural footprint is thin.
     - For Eleminator: free-form questions using anthropic API in artifacts
       is the better pedagogy ("does it conduct electricity" teaches a lot
       more than picking from a dropdown). Pre-built question menu is a
       fallback if the API approach is too unreliable.

   ---------------------------------------------------------------------------
   WORKFLOW NOTES
   ---------------------------------------------------------------------------
   - The project lives in a GitHub repo and ships via GitHub Pages. The
     working files are: index.html, styles.css, elements.js, app.js, and
     this file (games.js). Each chat session paste-loads the file(s)
     relevant to the work, iterates, and pushes new versions. Use git
     branches for risky changes so main keeps serving a working version.
   - For games work, you usually only need to paste games.js and possibly
     index.html (if a new game adds DOM); app.js and elements.js rarely
     need to come along. This is the main payoff of the split.
   - Conversation compaction (Settings → adaptive context) can hide earlier
     parts of a long chat from Claude's context. If this happens mid-build,
     turn it off and continue. The files on disk are always ground truth;
     don't trust Claude's memory over the actual code.
   ============================================================================= */
