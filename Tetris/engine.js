(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TetrisEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const COLS = 10;
  const ROWS = 20;
  const TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

  const COLORS = {
    I: "#3ec8d4",
    O: "#f0c43a",
    T: "#b06adf",
    S: "#62c85a",
    Z: "#e85d66",
    J: "#4f7df0",
    L: "#f09a3a",
  };

  // Spawn cells inside a 4x4 box, matching the Super Rotation System.
  const SPAWN = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]],
    O: [[1, 1], [2, 1], [1, 2], [2, 2]],
    T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [0, 1], [1, 1], [2, 1]],
    L: [[2, 0], [0, 1], [1, 1], [2, 1]],
  };

  // Screen space: +x right, +y down. SRS publishes +y up, so those Y values are flipped.
  const KICKS_JLSTZ = {
    "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  };

  const KICKS_I = {
    "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  };

  const LINE_SCORES = [0, 100, 300, 500, 800];
  const LOCK_DELAY = 500;
  const MAX_LOCK_RESETS = 15;

  function rotateCells(cells) {
    return cells.map(([x, y]) => [3 - y, x]);
  }

  function buildRotations(spawn) {
    const rots = [spawn.map((cell) => cell.slice())];
    for (let i = 0; i < 3; i++) rots.push(rotateCells(rots[i]));
    return rots;
  }

  const SHAPES = {};
  TYPES.forEach((type) => {
    SHAPES[type] = buildRotations(SPAWN[type]);
  });

  function emptyRow() {
    return Array(COLS).fill(0);
  }

  function emptyBoard() {
    return Array.from({ length: ROWS }, emptyRow);
  }

  function dropInterval(level) {
    const step = Math.max(0.05, 0.8 - (level - 1) * 0.007);
    return Math.pow(step, level - 1) * 1000;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function rng() {
      value = (value + 0x6d2b79f5) >>> 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function cellsOf(piece) {
    return SHAPES[piece.type][piece.rot].map(([x, y]) => [piece.x + x, piece.y + y]);
  }

  function sameCells(a, b) {
    const left = cellsOf(a).map(([x, y]) => x + "," + y).sort();
    const right = cellsOf(b).map(([x, y]) => x + "," + y).sort();
    return left.length === right.length && left.every((cell, i) => cell === right[i]);
  }

  function createGame(options) {
    const rng = (options && options.rng) || Math.random;
    const game = {
      status: "ready",
      board: emptyBoard(),
      piece: null,
      held: null,
      holdUsed: false,
      queue: [],
      score: 0,
      lines: 0,
      level: 1,
      soft: false,
      rng: rng,
      gravAcc: 0,
      softAcc: 0,
      lockAcc: 0,
      lockResets: 0,
    };

    function fits(piece) {
      const cells = SHAPES[piece.type][piece.rot];
      for (let i = 0; i < cells.length; i++) {
        const x = piece.x + cells[i][0];
        const y = piece.y + cells[i][1];
        if (x < 0 || x >= COLS || y >= ROWS) return false;
        if (y >= 0 && game.board[y][x]) return false;
      }
      return true;
    }

    function canMove(dx, dy, rot) {
      if (!game.piece) return false;
      return fits({
        type: game.piece.type,
        x: game.piece.x + dx,
        y: game.piece.y + dy,
        rot: rot == null ? game.piece.rot : rot,
      });
    }

    function grounded() {
      return game.piece && !canMove(0, 1);
    }

    function fillBag() {
      const bag = TYPES.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(game.rng() * (i + 1));
        const swap = bag[i];
        bag[i] = bag[j];
        bag[j] = swap;
      }
      game.queue.push.apply(game.queue, bag);
    }

    function ensureQueue() {
      while (game.queue.length < 5) fillBag();
    }

    function spawn() {
      ensureQueue();
      const type = game.queue.shift();
      game.piece = { type: type, x: 3, y: 0, rot: 0 };
      game.gravAcc = 0;
      game.softAcc = 0;
      game.lockAcc = 0;
      game.lockResets = 0;
      if (!fits(game.piece)) {
        game.status = "over";
        game.piece = null;
      }
    }

    function clearLines() {
      const kept = [];
      let cleared = 0;
      for (let y = 0; y < ROWS; y++) {
        if (game.board[y].every((cell) => cell)) cleared += 1;
        else kept.push(game.board[y]);
      }
      while (kept.length < ROWS) kept.unshift(emptyRow());
      game.board = kept;
      return cleared;
    }

    function lock() {
      if (!game.piece) return;
      const cells = cellsOf(game.piece);
      for (let i = 0; i < cells.length; i++) {
        const x = cells[i][0];
        const y = cells[i][1];
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) game.board[y][x] = game.piece.type;
      }
      const cleared = clearLines();
      if (cleared) {
        game.score += LINE_SCORES[cleared] * game.level;
        game.lines += cleared;
        game.level = 1 + Math.floor(game.lines / 10);
      }
      game.holdUsed = false;
      game.piece = null;
      spawn();
    }

    function noteGroundMove(before) {
      if (!grounded()) return;
      if (before && sameCells(before, game.piece)) return;
      if (game.lockResets >= MAX_LOCK_RESETS) return;
      game.lockResets += 1;
      game.lockAcc = 0;
    }

    function tryDown(scoring) {
      if (!canMove(0, 1)) return false;
      game.piece.y += 1;
      if (scoring) game.score += 1;
      game.lockResets = 0;
      game.lockAcc = 0;
      return true;
    }

    game.ghostY = function ghostY() {
      if (!game.piece) return null;
      let y = game.piece.y;
      while (fits({ type: game.piece.type, x: game.piece.x, y: y + 1, rot: game.piece.rot })) y += 1;
      return y;
    };

    game.start = function start() {
      game.board = emptyBoard();
      game.queue = [];
      game.held = null;
      game.holdUsed = false;
      game.score = 0;
      game.lines = 0;
      game.level = 1;
      game.soft = false;
      game.status = "playing";
      fillBag();
      fillBag();
      spawn();
    };

    game.togglePause = function togglePause() {
      if (game.status === "playing") game.status = "paused";
      else if (game.status === "paused") game.status = "playing";
    };

    game.move = function move(dx) {
      if (game.status !== "playing" || !game.piece || !dx) return false;
      if (!canMove(dx, 0)) return false;
      const before = { type: game.piece.type, x: game.piece.x, y: game.piece.y, rot: game.piece.rot };
      game.piece.x += dx;
      noteGroundMove(before);
      return true;
    };

    game.rotate = function rotate(dir) {
      if (game.status !== "playing" || !game.piece) return false;
      const from = game.piece.rot;
      const to = (from + (dir < 0 ? 3 : 1)) % 4;
      const kicks = game.piece.type === "O"
        ? [[0, 0]]
        : (game.piece.type === "I" ? KICKS_I : KICKS_JLSTZ)[from + ">" + to];
      const before = { type: game.piece.type, x: game.piece.x, y: game.piece.y, rot: game.piece.rot };
      for (let i = 0; i < kicks.length; i++) {
        game.piece.rot = to;
        game.piece.x = before.x + kicks[i][0];
        game.piece.y = before.y + kicks[i][1];
        if (fits(game.piece)) {
          noteGroundMove(before);
          return true;
        }
      }
      game.piece.rot = before.rot;
      game.piece.x = before.x;
      game.piece.y = before.y;
      return false;
    };

    game.hold = function hold() {
      if (game.status !== "playing" || game.holdUsed || !game.piece) return false;
      const current = game.piece.type;
      const swapped = game.held;
      game.held = current;
      if (swapped) {
        game.piece = { type: swapped, x: 3, y: 0, rot: 0 };
        game.gravAcc = 0;
        game.softAcc = 0;
        game.lockAcc = 0;
        game.lockResets = 0;
        if (!fits(game.piece)) {
          game.status = "over";
          game.piece = null;
        }
      } else {
        spawn();
      }
      game.holdUsed = true;
      return game.status === "playing";
    };

    game.hardDrop = function hardDrop() {
      if (game.status !== "playing" || !game.piece) return 0;
      let distance = 0;
      while (canMove(0, 1)) {
        game.piece.y += 1;
        distance += 1;
      }
      game.score += distance * 2;
      lock();
      return distance;
    };

    game.setSoftDrop = function setSoftDrop(on) {
      game.soft = !!on;
      if (!on) game.softAcc = 0;
    };

    game.tick = function tick(dt) {
      if (game.status !== "playing" || !game.piece) return;
      if (game.soft) {
        game.softAcc += dt;
        while (game.softAcc >= 50) {
          game.softAcc -= 50;
          if (!tryDown(true)) {
            game.lockAcc += 50;
            if (game.lockAcc >= LOCK_DELAY) lock();
            break;
          }
        }
        return;
      }
      if (!canMove(0, 1)) {
        game.lockAcc += dt;
        if (game.lockAcc >= LOCK_DELAY) lock();
        return;
      }
      game.lockAcc = 0;
      game.gravAcc += dt;
      const interval = dropInterval(game.level);
      while (game.gravAcc >= interval) {
        game.gravAcc -= interval;
        if (!tryDown(false)) break;
      }
    };

    return game;
  }

  return {
    COLS: COLS,
    ROWS: ROWS,
    TYPES: TYPES,
    COLORS: COLORS,
    SHAPES: SHAPES,
    createGame: createGame,
    mulberry32: mulberry32,
    dropInterval: dropInterval,
  };
});
