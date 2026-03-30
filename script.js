const board = document.getElementById('board');
const ctx = board.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');

const tileSize = 20;
const tileCount = board.width / tileSize;
const tickMs = 120;
const bestKey = 'simple-snake-best';

let snake;
let direction;
let nextDirection;
let food;
let score;
let best;
let running;
let gameOver;

function randomPosition() {
  return {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount),
  };
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function placeFood() {
  let candidate = randomPosition();
  while (snake.some((part) => sameCell(part, candidate))) {
    candidate = randomPosition();
  }
  food = candidate;
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);

  if (gameOver) {
    statusEl.textContent = 'Game over. Press Space to restart.';
  } else if (!running) {
    statusEl.textContent = 'Press a direction key to start.';
  } else {
    statusEl.textContent = 'Keep going!';
  }
}

function resetGame() {
  const center = Math.floor(tileCount / 2);
  snake = [{ x: center, y: center }];
  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  score = 0;
  running = false;
  gameOver = false;
  placeFood();
  updateHud();
  draw();
}

function setDirection(x, y) {
  if (gameOver) return;

  const reversing = x === -direction.x && y === -direction.y;
  if (running && reversing) return;

  nextDirection = { x, y };
  running = true;
  updateHud();
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === 'arrowup' || key === 'w') setDirection(0, -1);
  if (key === 'arrowdown' || key === 's') setDirection(0, 1);
  if (key === 'arrowleft' || key === 'a') setDirection(-1, 0);
  if (key === 'arrowright' || key === 'd') setDirection(1, 0);

  if (key === ' ' && gameOver) {
    resetGame();
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
}

function draw() {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, board.width, board.height);

  drawCell(food.x, food.y, '#ef4444');
  snake.forEach((part, i) => {
    drawCell(part.x, part.y, i === 0 ? '#22c55e' : '#16a34a');
  });

  if (gameOver) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
    ctx.fillRect(0, 0, board.width, board.height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', board.width / 2, board.height / 2);
  }
}

function step() {
  if (gameOver || !running) {
    draw();
    return;
  }

  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= tileCount || head.y >= tileCount;
  const hitSelf = snake.some((part) => sameCell(part, head));

  if (hitWall || hitSelf) {
    gameOver = true;
    running = false;
    updateHud();
    draw();
    return;
  }

  snake.unshift(head);

  if (sameCell(head, food)) {
    score += 1;
    best = Math.max(best, score);
    placeFood();
    updateHud();
  } else {
    snake.pop();
  }

  draw();
}

best = Number(localStorage.getItem(bestKey) || '0');
window.addEventListener('keydown', onKeyDown);
setInterval(() => {
  step();
  localStorage.setItem(bestKey, String(best));
}, tickMs);

resetGame();
