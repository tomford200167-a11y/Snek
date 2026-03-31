const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const portalsEl = document.getElementById('portals');
const comboEl = document.getElementById('combo');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const gridSize = 20;
const tiles = canvas.width / gridSize;
const tickMs = 120;
const comboWindowTicks = 14;
const goldenFoodEvery = 7;
const goldenFoodDuration = 35;

let snake;
let direction;
let nextDirection;
let food;
let score;
let best;
let gameOver;
let started;
let paused;
let foodsEaten;
let portals;
let combo;
let comboTicksLeft;
let goldenFood;
let goldenFoodTicksLeft;

function randomTile() {
  return {
    x: Math.floor(Math.random() * tiles),
    y: Math.floor(Math.random() * tiles),
  };
}

function placeFood() {
  let candidate = randomTile();
  while (
    snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y) ||
    (portals && portals.some((portal) => portal.x === candidate.x && portal.y === candidate.y)) ||
    (goldenFood && candidate.x === goldenFood.x && candidate.y === goldenFood.y)
  ) {
    candidate = randomTile();
  }
  food = candidate;
}

function placeGoldenFood() {
  let candidate = randomTile();
  while (
    snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y) ||
    (portals && portals.some((portal) => portal.x === candidate.x && portal.y === candidate.y)) ||
    (candidate.x === food.x && candidate.y === food.y)
  ) {
    candidate = randomTile();
  }
  goldenFood = candidate;
  goldenFoodTicksLeft = goldenFoodDuration;
}

function placePortals() {
  const occupied = (tile) =>
    tile.x === food.x && tile.y === food.y ||
    snake.some((segment) => segment.x === tile.x && segment.y === tile.y);

  let first = randomTile();
  while (occupied(first)) first = randomTile();

  let second = randomTile();
  while (
    occupied(second) ||
    (second.x === first.x && second.y === first.y)
  ) {
    second = randomTile();
  }

  portals = [first, second];
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  score = 0;
  foodsEaten = 0;
  gameOver = false;
  started = false;
  paused = false;
  portals = null;
  combo = 1;
  comboTicksLeft = 0;
  goldenFood = null;
  goldenFoodTicksLeft = 0;
  placeFood();
  updateUi();
  draw();
}

function updateUi() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  portalsEl.textContent = portals ? '2' : '0';
  comboEl.textContent = `x${combo}`;
  if (gameOver) {
    statusEl.textContent = 'Game over. Press Space to restart.';
  } else if (paused) {
    statusEl.textContent = 'Paused. Press P or Pause to continue.';
  } else if (!started) {
    statusEl.textContent = 'Press any movement key to start.';
  } else if (goldenFood) {
    statusEl.textContent = `Golden snack live! ${goldenFoodTicksLeft} ticks left.`;
  } else if (portals) {
    statusEl.textContent = `Portal pair active! Combo ${comboEl.textContent}.`;
  } else {
    statusEl.textContent = `Keep going! Combo ${comboEl.textContent}.`;
  }
}

function setDirection(x, y) {
  if (gameOver) return;

  const isReversing = x === -direction.x && y === -direction.y;
  if (started && isReversing) return;

  paused = false;
  nextDirection = { x, y };
  started = true;
}

function startGame() {
  if (gameOver) {
    resetGame();
  }
  if (!started) {
    setDirection(1, 0);
  } else {
    paused = false;
    updateUi();
  }
}

function togglePause() {
  if (gameOver || !started) return;
  paused = !paused;
  updateUi();
}

function restartGame() {
  resetGame();
}

function onKeyDown(event) {
  const moveByCode = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    KeyW: [0, -1],
    KeyS: [0, 1],
    KeyA: [-1, 0],
    KeyD: [1, 0],
  };
  const moveByKey = {
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
  };
  const key = event.key.toLowerCase();
  const move = moveByCode[event.code] || moveByKey[key];

  if (move) {
    event.preventDefault();
    setDirection(move[0], move[1]);
    return;
  }

  const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
  if (isSpace && gameOver) {
    event.preventDefault();
    restartGame();
    return;
  }

  if (event.code === 'KeyP' || key === 'p') {
    event.preventDefault();
    togglePause();
  }
}

function step() {
  if (gameOver || !started || paused) {
    draw();
    return;
  }

  direction = nextDirection;
  let uiDirty = false;

  if (comboTicksLeft > 0) {
    comboTicksLeft -= 1;
    if (comboTicksLeft === 0) {
      combo = 1;
      uiDirty = true;
    }
  }

  if (goldenFood) {
    goldenFoodTicksLeft -= 1;
    uiDirty = true;
    if (goldenFoodTicksLeft <= 0) {
      goldenFood = null;
      goldenFoodTicksLeft = 0;
      uiDirty = true;
    }
  }

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (portals) {
    const [first, second] = portals;
    if (head.x === first.x && head.y === first.y) {
      head.x = second.x;
      head.y = second.y;
    } else if (head.x === second.x && head.y === second.y) {
      head.x = first.x;
      head.y = first.y;
    }
  }

  const hitWall = head.x < 0 || head.y < 0 || head.x >= tiles || head.y >= tiles;
  const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);

  if (hitWall || hitSelf) {
    gameOver = true;
    started = false;
    updateUi();
    draw();
    return;
  }

  snake.unshift(head);

  if (goldenFood && head.x === goldenFood.x && head.y === goldenFood.y) {
    combo = Math.min(combo + 1, 5);
    comboTicksLeft = comboWindowTicks;
    score += 5 * combo;
    goldenFood = null;
    goldenFoodTicksLeft = 0;
    best = Math.max(best, score);
    updateUi();
  } else if (head.x === food.x && head.y === food.y) {
    if (comboTicksLeft > 0) {
      combo = Math.min(combo + 1, 5);
    } else {
      combo = 1;
    }
    comboTicksLeft = comboWindowTicks;
    score += combo;
    foodsEaten += 1;
    best = Math.max(best, score);
    if (foodsEaten % 5 === 0) {
      placePortals();
    }
    if (foodsEaten % goldenFoodEvery === 0) {
      placeGoldenFood();
    }
    placeFood();
    updateUi();
  } else {
    snake.pop();
  }

  if (uiDirty) {
    updateUi();
  }

  draw();
}

function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize + 1, y * gridSize + 1, gridSize - 2, gridSize - 2);
}

function draw() {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTile(food.x, food.y, '#ef4444');
  if (goldenFood) {
    drawTile(goldenFood.x, goldenFood.y, '#facc15');
  }

  if (portals) {
    drawTile(portals[0].x, portals[0].y, '#38bdf8');
    drawTile(portals[1].x, portals[1].y, '#0ea5e9');
  }

  snake.forEach((segment, index) => {
    drawTile(segment.x, segment.y, index === 0 ? '#22c55e' : '#16a34a');
  });

  if (gameOver) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
  }
}

best = Number(localStorage.getItem('snake-best') || '0');
window.addEventListener('keydown', onKeyDown);
if (startBtn) startBtn.addEventListener('click', startGame);
if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
if (restartBtn) restartBtn.addEventListener('click', restartGame);
setInterval(() => {
  step();
  localStorage.setItem('snake-best', String(best));
}, tickMs);

resetGame();
