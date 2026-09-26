import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createGame, mulberry32, SHAPES } = require("./engine.js");

test("each bag of seven contains every piece once", () => {
  const game = createGame({ rng: mulberry32(1) });
  game.start();
  const dealt = [game.piece.type, ...game.queue];
  for (let bag = 0; bag < 2; bag++) {
    const slice = dealt.slice(bag * 7, bag * 7 + 7);
    assert.equal(new Set(slice).size, 7);
  }
});

test("hard drop scores two points per row and locks the piece", () => {
  const game = createGame({ rng: mulberry32(2) });
  game.start();
  game.piece = { type: "O", x: 3, y: 0, rot: 0 };
  game.score = 0;
  const distance = game.hardDrop();
  assert.equal(distance, 17);
  assert.equal(game.score, 34);
  assert.equal(game.board[19][4], "O");
  assert.equal(game.board[19][5], "O");
  assert.ok(game.piece);
  assert.notEqual(game.piece.type, undefined);
});

test("four filled rows score a tetris and disappear", () => {
  const game = createGame({ rng: mulberry32(3) });
  game.start();
  for (let y = 16; y < 20; y++) {
    for (let x = 0; x < 10; x++) game.board[y][x] = x === 0 ? 0 : "J";
  }
  assert.deepEqual(SHAPES.I[1], [[2, 0], [2, 1], [2, 2], [2, 3]]);
  game.piece = { type: "I", x: -2, y: 16, rot: 1 };
  game.hardDrop();
  assert.equal(game.lines, 4);
  assert.equal(game.score, 800);
  assert.ok(game.board[19].every((cell) => cell === 0));
});

test("the I piece kicks left when a plain rotation would leave the board", () => {
  const game = createGame({ rng: mulberry32(4) });
  game.start();
  game.piece = { type: "I", x: 7, y: 0, rot: 1 };
  assert.equal(game.rotate(1), true);
  assert.equal(game.piece.rot, 2);
  assert.equal(game.piece.x, 6);
  assert.equal(game.piece.y, 0);
});

test("a blocked spawn ends the game", () => {
  const game = createGame({ rng: mulberry32(5) });
  game.start();
  game.board[1][4] = "O";
  game.piece = { type: "O", x: 3, y: 16, rot: 0 };
  game.hardDrop();
  assert.equal(game.status, "over");
  assert.equal(game.piece, null);
});

test("hold swaps once per piece", () => {
  const game = createGame({ rng: mulberry32(6) });
  game.start();
  const first = game.piece.type;
  assert.equal(game.hold(), true);
  assert.equal(game.held, first);
  assert.notEqual(game.piece.type, first);
  assert.equal(game.hold(), false);
});

test("gravity locks a grounded piece after the lock delay", () => {
  const game = createGame({ rng: mulberry32(7) });
  game.start();
  game.piece = { type: "O", x: 3, y: 17, rot: 0 };
  game.tick(499);
  assert.equal(game.board[19][4], 0);
  game.tick(1);
  assert.equal(game.board[19][4], "O");
});
