const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');

const gridSize = 20;
const tiles = canvas.width / gridSize;
const tickMs = 120;

let snake;
let direction;
let nextDirection;
let food;
let score;
let best;
let gameOver;
let started;

function randomTile() {
  return {
    x: Math.floor(Math.random() * tiles),
    y: Math.floor(Math.random() * tiles),
  };
}

function placeFood() {
  let candidate = randomTile();
  while (snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y)) {
    candidate = randomTile();
  }
  food = candidate;
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  score = 0;
  gameOver = false;
  started = false;
  placeFood();
  updateUi();
  draw();
}

function updateUi() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  if (gameOver) {
    statusEl.textContent = 'Game over. Press Space to restart.';
  } else if (!started) {
    statusEl.textContent = 'Press any movement key to start.';
  } else {
    statusEl.textContent = 'Keep going!';
  }
}

function setDirection(x, y) {
  if (gameOver) return;

  const isReversing = x === -direction.x && y === -direction.y;
  if (started && isReversing) return;

  nextDirection = { x, y };
  started = true;
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

function step() {
  if (gameOver || !started) {
    draw();
    return;
  }

  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

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

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    best = Math.max(best, score);
    placeFood();
    updateUi();
  } else {
    snake.pop();
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
setInterval(() => {
  step();
  localStorage.setItem('snake-best', String(best));
}, tickMs);

resetGame();
