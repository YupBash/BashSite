/* BASH — the hidden mini minesweeper (the 💣 in the FAQ). Same game as the old FAQ page: 8×8 with 10 mines by
   default (6×6 to 12×12), the first click is always safe, right-click or flag mode (touch) places flags.
   Exposes window.BashMines = { open, close }. */
(function () {
  "use strict";
  var trigger = document.getElementById("bombTrigger");
  var overlay = document.getElementById("msOverlay");
  var closeBtn = document.getElementById("msClose");
  var grid = document.getElementById("msGrid");
  var statusEl = document.getElementById("msStatus");
  var resetBtn = document.getElementById("msReset");
  var flagToggle = document.getElementById("msFlagToggle");
  var sizeSelect = document.getElementById("msSize");
  var api = { open: function () {}, close: function () {} };
  window.BashMines = api;
  if (!trigger || !overlay || !grid || !statusEl || !closeBtn) return;

  var COLS = 8, ROWS = 8, MINES = 10;
  var cells = [], started = false, gameOver = false, flagMode = false, revealedCount = 0, built = false;
  var lastFocus = null;

  function idx(r, c) { return r * COLS + c; }
  function forEachNeighbor(r, c, fn) {
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) fn(nr, nc);
      }
    }
  }
  function cellBtn(r, c) { return grid.children[idx(r, c)]; }

  function newGame() {
    gameOver = false;
    started = false;
    revealedCount = 0;
    cells = [];
    for (var i = 0; i < ROWS * COLS; i++) cells.push({ mine: false, revealed: false, flagged: false, adj: 0 });
    statusEl.textContent = MINES + " 💣";
    grid.textContent = "";
    grid.style.gridTemplateColumns = "repeat(" + COLS + ",1fr)";
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ms-cell";
        btn.dataset.r = r;
        btn.dataset.c = c;
        btn.dataset.label = "R" + (r + 1) + "·C" + (c + 1);   // HUD lock-on label
        btn.setAttribute("aria-label", "Row " + (r + 1) + ", column " + (c + 1));
        btn.addEventListener("click", onCellClick);
        btn.addEventListener("contextmenu", onCellFlag);
        grid.appendChild(btn);
      }
    }
    built = true;
  }

  function placeMines(excludeR, excludeC) {
    var placed = 0;
    while (placed < MINES) {
      var r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
      if (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1) continue;
      var cell = cells[idx(r, c)];
      if (cell.mine) continue;
      cell.mine = true;
      placed++;
    }
    for (var rr = 0; rr < ROWS; rr++) {
      for (var cc = 0; cc < COLS; cc++) {
        var cell2 = cells[idx(rr, cc)];
        if (cell2.mine) continue;
        var n = 0;
        forEachNeighbor(rr, cc, function (nr, nc) { if (cells[idx(nr, nc)].mine) n++; });
        cell2.adj = n;
      }
    }
    started = true;
  }

  function reveal(r, c) {
    var cell = cells[idx(r, c)];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    revealedCount++;
    var btn = cellBtn(r, c);
    btn.classList.add("revealed");
    if (cell.mine) {
      btn.classList.add("mine");
      btn.textContent = "💣";
      endGame(false);
      return;
    }
    if (cell.adj > 0) {
      btn.textContent = cell.adj;
      btn.classList.add("n" + cell.adj);
    } else {
      forEachNeighbor(r, c, function (nr, nc) { reveal(nr, nc); });
    }
  }

  function toggleFlag(btn, cell) {
    cell.flagged = !cell.flagged;
    btn.classList.toggle("flagged", cell.flagged);
    btn.textContent = cell.flagged ? "🚩" : "";
    var flaggedCount = 0;
    for (var i = 0; i < cells.length; i++) if (cells[i].flagged) flaggedCount++;
    if (!gameOver) statusEl.textContent = (MINES - flaggedCount) + " 💣";
  }

  function checkWin() {
    if (revealedCount === ROWS * COLS - MINES) endGame(true);
  }

  function endGame(won) {
    gameOver = true;
    for (var i = 0; i < cells.length; i++) {
      if (!cells[i].mine) continue;
      var btn = grid.children[i];
      if (!btn.classList.contains("revealed")) {
        btn.classList.add("revealed", "mine");
        btn.textContent = "💣";
      }
    }
    statusEl.textContent = won ? "gg 🎉" : "boom 💥";
  }

  function onCellClick() {
    if (gameOver) return;
    var r = +this.dataset.r, c = +this.dataset.c, cell = cells[idx(r, c)];
    if (cell.flagged && !flagMode) return;
    if (cell.revealed) return;
    if (flagMode) { toggleFlag(this, cell); return; }
    if (!started) placeMines(r, c);
    reveal(r, c);
    checkWin();
  }

  function onCellFlag(e) {
    e.preventDefault();
    if (gameOver) return;
    var cell = cells[idx(+this.dataset.r, +this.dataset.c)];
    if (cell.revealed) return;
    toggleFlag(this, cell);
  }

  function open() {
    if (!built) newGame();
    if (overlay.classList.contains("open")) return;
    lastFocus = document.activeElement;
    overlay.classList.add("open");
    closeBtn.focus();
  }
  function close() {
    if (!overlay.classList.contains("open")) return;
    overlay.classList.remove("open");
    var back = lastFocus && document.contains(lastFocus) ? lastFocus : trigger;
    if (back && back.focus) back.focus();
  }
  api.open = open;
  api.close = close;

  trigger.addEventListener("click", open);
  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("open")) close();
  });
  // Keep Tab inside the open dialog.
  overlay.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var items = Array.prototype.filter.call(overlay.querySelectorAll("button, select"), function (el) { return !el.disabled; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  if (resetBtn) resetBtn.addEventListener("click", newGame);
  if (flagToggle) {
    flagToggle.addEventListener("click", function () {
      flagMode = !flagMode;
      flagToggle.classList.toggle("active", flagMode);
      flagToggle.setAttribute("aria-pressed", flagMode ? "true" : "false");
    });
  }
  if (sizeSelect) {
    sizeSelect.addEventListener("change", function () {
      var parts = sizeSelect.value.split(":"), n = parseInt(parts[0], 10);
      ROWS = n;
      COLS = n;
      MINES = parseInt(parts[1], 10);
      newGame();
    });
  }
})();
