(function () {
  const engine = TetrisEngine;
  const COLS = engine.COLS;
  const ROWS = engine.ROWS;
  const COLORS = engine.COLORS;
  const SHAPES = engine.SHAPES;

  const boardCanvas = document.getElementById("board");
  const holdCanvas = document.getElementById("hold");
  const nextCanvas = document.getElementById("next");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const overlayBtn = document.getElementById("overlay-btn");
  const scoreEl = document.getElementById("score");
  const linesEl = document.getElementById("lines");
  const levelEl = document.getElementById("level");
  const bestEl = document.getElementById("best");
  const soundBtn = document.getElementById("sound");

  const BEST_KEY = "tetris-high-score";
  const DAS = 160;
  const ARR = 30;

  const game = engine.createGame();
  const keys = { left: false, right: false, soft: false };
  let dasDir = 0;
  let dasTimer = 0;
  let arrTimer = 0;
  let soundOn = true;
  let audioCtx = null;
  let best = readBest();

  function readBest() {
    try {
      const value = Number(localStorage.getItem(BEST_KEY) || 0);
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function writeBest(score) {
    if (score <= best) return;
    best = score;
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (error) {
      /* private mode can reject storage */
    }
  }

  function tone(freq, duration, gain) {
    if (!soundOn) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = "square";
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  function playClear(count) {
    tone(220 + count * 90, 0.12, 0.04);
  }

  function fitCanvas(canvas, cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawBlock(ctx, x, y, size, color, ghost) {
    const inset = Math.max(1, Math.round(size * 0.06));
    const w = size - inset * 2;
    if (ghost) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, w - 1, w - 1);
      ctx.restore();
      return;
    }
    ctx.fillStyle = color;
    ctx.fillRect(x + inset, y + inset, w, w);
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.fillRect(x + inset, y + inset, w, Math.max(2, w * 0.18));
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(x + inset, y + inset + w - Math.max(2, w * 0.16), w, Math.max(2, w * 0.16));
  }

  function drawCells(ctx, cells, size, color, ghost) {
    for (let i = 0; i < cells.length; i++) {
      drawBlock(ctx, cells[i][0] * size, cells[i][1] * size, size, color, ghost);
    }
  }

  function paint() {
    const cell = boardCanvas.clientWidth / COLS || 28;
    const ctx = fitCanvas(boardCanvas, cell * COLS, cell * ROWS);
    ctx.fillStyle = "#141820";
    ctx.fillRect(0, 0, cell * COLS, cell * ROWS);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, cell * ROWS);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(cell * COLS, y * cell + 0.5);
      ctx.stroke();
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const type = game.board[y][x];
        if (type) drawBlock(ctx, x * cell, y * cell, cell, COLORS[type], false);
      }
    }

    if (game.piece) {
      const ghostY = game.ghostY();
      if (ghostY != null && ghostY !== game.piece.y) {
        const ghost = SHAPES[game.piece.type][game.piece.rot].map(([x, y]) => [game.piece.x + x, ghostY + y]);
        drawCells(ctx, ghost, cell, COLORS[game.piece.type], true);
      }
      const live = SHAPES[game.piece.type][game.piece.rot].map(([x, y]) => [game.piece.x + x, game.piece.y + y]);
      drawCells(ctx, live, cell, COLORS[game.piece.type], false);
    }

    const mini = 18;
    const holdCtx = fitCanvas(holdCanvas, mini * 4, mini * 4);
    holdCtx.clearRect(0, 0, mini * 4, mini * 4);
    if (game.held) {
      holdCtx.save();
      if (game.holdUsed) holdCtx.globalAlpha = 0.35;
      drawCells(holdCtx, SHAPES[game.held][0], mini, COLORS[game.held], false);
      holdCtx.restore();
    }

    const nextCtx = fitCanvas(nextCanvas, mini * 4, mini * 4 * 5 + 8 * 4);
    nextCtx.clearRect(0, 0, nextCanvas.clientWidth, nextCanvas.clientHeight);
    const upcoming = game.queue.slice(0, 5);
    for (let i = 0; i < upcoming.length; i++) {
      const type = upcoming[i];
      const origin = i * (mini * 4 + 8);
      nextCtx.save();
      nextCtx.translate(0, origin);
      drawCells(nextCtx, SHAPES[type][0], mini, COLORS[type], false);
      nextCtx.restore();
    }

    scoreEl.textContent = String(game.score);
    linesEl.textContent = String(game.lines);
    levelEl.textContent = String(game.level);
    bestEl.textContent = String(Math.max(best, game.score));
    soundBtn.textContent = soundOn ? "Sound on" : "Sound off";
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");

    if (game.status === "playing") {
      overlay.hidden = true;
      return;
    }
    overlay.hidden = false;
    if (game.status === "paused") {
      overlayTitle.textContent = "Paused";
      overlayText.textContent = "Press P or Escape to resume.";
      overlayBtn.textContent = "Resume";
    } else if (game.status === "over") {
      overlayTitle.textContent = "Game over";
      overlayText.textContent = "Score " + game.score + (game.score > 0 && game.score >= best ? ". New best." : ".");
      overlayBtn.textContent = "Play again";
    } else {
      overlayTitle.textContent = "Tetris";
      overlayText.textContent = "Clear complete lines. The stack ends the game when a new piece no longer fits.";
      overlayBtn.textContent = "Start";
    }
  }

  function rememberScore() {
    if (game.status === "over") {
      writeBest(game.score);
      best = readBest();
    }
  }

  function begin() {
    if (game.status === "paused") {
      game.togglePause();
      paint();
      return;
    }
    game.start();
    overlayBtn.blur();
    paint();
  }

  function act(name) {
    if (game.status !== "playing") return;
    const beforeLines = game.lines;
    const beforeStatus = game.status;
    if (name === "left") game.move(-1);
    else if (name === "right") game.move(1);
    else if (name === "cw") {
      if (game.rotate(1)) tone(520, 0.04, 0.03);
    } else if (name === "ccw") {
      if (game.rotate(-1)) tone(420, 0.04, 0.03);
    } else if (name === "hold") game.hold();
    else if (name === "drop") {
      const distance = game.hardDrop();
      if (distance) tone(140, 0.06, 0.04);
      if (game.lines > beforeLines) playClear(game.lines - beforeLines);
      if (beforeStatus === "playing" && game.status === "over") tone(90, 0.3, 0.05);
      rememberScore();
    }
    paint();
  }

  function step(dt) {
    if (game.status !== "playing") return;
    const beforeLines = game.lines;
    const beforeStatus = game.status;
    const dir = keys.left === keys.right ? 0 : (keys.left ? -1 : 1);
    if (!dir) {
      dasDir = 0;
      dasTimer = 0;
      arrTimer = 0;
    } else if (dir !== dasDir) {
      dasDir = dir;
      dasTimer = 0;
      arrTimer = 0;
      game.move(dir);
    } else {
      dasTimer += dt;
      if (dasTimer >= DAS) {
        arrTimer += dt;
        while (arrTimer >= ARR) {
          arrTimer -= ARR;
          if (!game.move(dir)) break;
        }
      }
    }
    game.setSoftDrop(keys.soft);
    game.tick(dt);
    if (game.lines > beforeLines) playClear(game.lines - beforeLines);
    if (beforeStatus === "playing" && game.status === "over") {
      tone(90, 0.3, 0.05);
      rememberScore();
    }
    paint();
  }

  const keyMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    KeyA: "left",
    KeyD: "right",
    ArrowDown: "soft",
    KeyS: "soft",
    ArrowUp: "cw",
    KeyX: "cw",
    KeyW: "cw",
    KeyZ: "ccw",
    ControlLeft: "ccw",
    ControlRight: "ccw",
    Space: "drop",
    KeyC: "hold",
    ShiftLeft: "hold",
    ShiftRight: "hold",
  };

  window.addEventListener("keydown", function (event) {
    if (event.code === "KeyM") {
      soundOn = !soundOn;
      paint();
      return;
    }
    if (event.code === "KeyP" || event.code === "Escape") {
      if (game.status === "playing" || game.status === "paused") {
        event.preventDefault();
        game.togglePause();
        keys.left = false;
        keys.right = false;
        keys.soft = false;
        paint();
      }
      return;
    }
    if (event.code === "Enter" || event.code === "KeyR") {
      if (event.code === "KeyR" && game.status === "ready") return;
      if (game.status !== "playing" || event.code === "KeyR") {
        event.preventDefault();
        begin();
        return;
      }
    }
    const action = keyMap[event.code];
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;
    if (game.status === "ready") begin();
    if (game.status !== "playing") return;
    if (action === "left") keys.left = true;
    else if (action === "right") keys.right = true;
    else if (action === "soft") keys.soft = true;
    else act(action);
  });

  window.addEventListener("keyup", function (event) {
    const action = keyMap[event.code];
    if (action === "left") keys.left = false;
    else if (action === "right") keys.right = false;
    else if (action === "soft") keys.soft = false;
  });

  window.addEventListener("blur", function () {
    keys.left = false;
    keys.right = false;
    keys.soft = false;
  });

  overlayBtn.addEventListener("click", begin);
  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    paint();
  });

  document.querySelectorAll("[data-act]").forEach(function (button) {
    const action = button.getAttribute("data-act");
    const hold = action === "left" || action === "right" || action === "soft";
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      if (game.status !== "playing") {
        begin();
        return;
      }
      if (action === "left") keys.left = true;
      else if (action === "right") keys.right = true;
      else if (action === "soft") keys.soft = true;
      else act(action);
    });
    function release() {
      if (action === "left") keys.left = false;
      else if (action === "right") keys.right = false;
      else if (action === "soft") keys.soft = false;
    }
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    if (!hold) button.addEventListener("pointerleave", release);
  });

  window.addEventListener("resize", paint);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    step(dt);
    if (game.status !== "playing") paint();
    requestAnimationFrame(frame);
  }

  paint();
  requestAnimationFrame(frame);
})();
