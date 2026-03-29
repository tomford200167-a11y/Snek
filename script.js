const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('status');
const speedEl = document.getElementById('speed');
const goalsEl = document.getElementById('goals');
const milestonesEl = document.getElementById('milestones');

const gridSize = 20;
const tiles = canvas.width / gridSize;
const bestScoreKey = 'snake-neon-best';
const milestoneKey = 'snake-neon-milestones';
const baseGoals = [
  { id: 'first-bite', text: 'Eat your first snack', target: 1, type: 'score' },
  { id: 'five-up', text: 'Reach score 5', target: 5, type: 'score' },
  { id: 'steady', text: 'Reach level 3', target: 3, type: 'level' },
  { id: 'bonus', text: 'Eat a golden snack', target: 1, type: 'bonus' },
];

let snake;
let direction;
let nextDirection;
let food;
let bonusFood;
let bonusExpiresAt;
let obstacles;
let score;
let level;
let best;
let gameOver;
let started;
let paused;
let loopHandle;
let bonusEaten;
let milestones;

function randomTile() {
  return {
    x: Math.floor(Math.random() * tiles),
    y: Math.floor(Math.random() * tiles),
  };
}

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

function isOnSnake(tile) {
  return snake.some((segment) => sameTile(segment, tile));
}

function isOnObstacle(tile) {
  return obstacles.some((segment) => sameTile(segment, tile));
}

function isOnFood(tile) {
  return (food && sameTile(tile, food)) || (bonusFood && sameTile(tile, bonusFood));
}

function randomFreeTile() {
  let candidate = randomTile();
  while (isOnSnake(candidate) || isOnObstacle(candidate) || isOnFood(candidate)) {
    candidate = randomTile();
  }
  return candidate;
}

function placeFood() {
  food = randomFreeTile();
}

function placeBonusFood() {
  bonusFood = randomFreeTile();
  bonusExpiresAt = Date.now() + 5000;
}

function buildObstacles() {
  const count = Math.max(0, level - 2);
  obstacles = [];
  while (obstacles.length < count) {
    const tile = randomTile();
    const safeCenter = Math.abs(tile.x - Math.floor(tiles / 2)) <= 2 && Math.abs(tile.y - Math.floor(tiles / 2)) <= 2;
    if (safeCenter || isOnSnake(tile) || isOnObstacle(tile) || isOnFood(tile)) {
      continue;
    }
    obstacles.push(tile);
  }
}

function goalDone(goal) {
  if (goal.type === 'score') return score >= goal.target;
  if (goal.type === 'level') return level >= goal.target;
  if (goal.type === 'bonus') return bonusEaten >= goal.target;
  return false;
}

function renderGoals() {
  goalsEl.innerHTML = '';
  baseGoals.forEach((goal) => {
    const li = document.createElement('li');
    const done = goalDone(goal);
    li.className = done ? 'done' : '';
    li.textContent = `${done ? '✅' : '⬜'} ${goal.text}`;
    goalsEl.append(li);
  });
}

function updateMilestones() {
  const completed = baseGoals.filter(goalDone).length;
  milestones = Math.max(milestones, completed);
  milestonesEl.textContent = String(milestones);
}

function updateUi() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  levelEl.textContent = String(level);

  if (gameOver) {
    statusEl.textContent = '💥 Game over. Press Space to restart.';
  } else if (paused) {
    statusEl.textContent = '⏸ Paused. Press P to continue.';
  } else if (!started) {
    statusEl.textContent = 'Press any movement key to start.';
  } else {
    statusEl.textContent = bonusFood ? '✨ Golden snack is live for 5 seconds!' : 'Build your streak.';
  }

  renderGoals();
  updateMilestones();
}

function resetGame() {
  const middle = Math.floor(tiles / 2);
  snake = [{ x: middle, y: middle }];
  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  score = 0;
  level = 1;
  gameOver = false;
  paused = false;
  started = false;
  bonusFood = null;
  bonusExpiresAt = 0;
  bonusEaten = 0;
  obstacles = [];
  placeFood();
  updateUi();
  draw();
}

function setDirection(x, y) {
  if (gameOver || paused) return;
  const isReversing = x === -direction.x && y === -direction.y;
  if (started && isReversing) return;
  nextDirection = { x, y };
  started = true;
  updateUi();
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') setDirection(0, -1);
  if (key === 'arrowdown' || key === 's') setDirection(0, 1);
  if (key === 'arrowleft' || key === 'a') setDirection(-1, 0);
  if (key === 'arrowright' || key === 'd') setDirection(1, 0);

  if (key === 'p' && started && !gameOver) {
    paused = !paused;
    updateUi();
  }

  if (key === ' ' && gameOver) {
    resetGame();
  }
}

function getTickMs() {
  const selected = Number(speedEl.value);
  const levelBoost = Math.min(45, (level - 1) * 3);
  return Math.max(55, selected - levelBoost);
}

function onLevelChange(previousLevel) {
  if (level !== previousLevel) {
    buildObstacles();
  }
}

function handleFoodCollision(head) {
  if (sameTile(head, food)) {
    const previousLevel = level;
    score += 1;
    level = 1 + Math.floor(score / 5);
    best = Math.max(best, score);
    onLevelChange(previousLevel);
    placeFood();

    if (score > 0 && score % 4 === 0) {
      placeBonusFood();
    }

    updateUi();
    return;
  }

  if (bonusFood && sameTile(head, bonusFood)) {
    const previousLevel = level;
    score += 3;
    bonusEaten += 1;
    level = 1 + Math.floor(score / 5);
    best = Math.max(best, score);
    bonusFood = null;
    bonusExpiresAt = 0;
    onLevelChange(previousLevel);
    updateUi();
    return;
  }

  snake.pop();
}

function step() {
  if (!gameOver && bonusFood && Date.now() > bonusExpiresAt) {
    bonusFood = null;
    bonusExpiresAt = 0;
    updateUi();
  }

  if (gameOver || !started || paused) {
    draw();
    return;
  }

  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= tiles || head.y >= tiles;
  const hitSelf = isOnSnake(head);
  const hitObstacle = isOnObstacle(head);

  if (hitWall || hitSelf || hitObstacle) {
    gameOver = true;
    started = false;
    updateUi();
    draw();
    return;
  }

  snake.unshift(head);
  handleFoodCollision(head);
  draw();
}

function drawTile(x, y, color, padding = 2) {
  ctx.fillStyle = color;
  ctx.fillRect(x * gridSize + padding, y * gridSize + padding, gridSize - padding * 2, gridSize - padding * 2);
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 1; i < tiles; i += 1) {
    const p = i * gridSize;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }
}

function draw() {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  obstacles.forEach((block) => drawTile(block.x, block.y, '#64748b', 4));
  drawTile(food.x, food.y, '#ef4444', 3);
  if (bonusFood) {
    drawTile(bonusFood.x, bonusFood.y, '#facc15', 2);
  }

  snake.forEach((segment, index) => {
    drawTile(segment.x, segment.y, index === 0 ? '#34d399' : '#10b981');
  });

  if (gameOver || paused) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameOver ? 'Game Over' : 'Paused', canvas.width / 2, canvas.height / 2);
  }
}

function startLoop() {
  clearTimeout(loopHandle);
  function tick() {
    step();
    localStorage.setItem(bestScoreKey, String(best));
    localStorage.setItem(milestoneKey, String(milestones));
    loopHandle = setTimeout(tick, getTickMs());
  }
  tick();
}

best = Number(localStorage.getItem(bestScoreKey) || '0');
milestones = Number(localStorage.getItem(milestoneKey) || '0');
window.addEventListener('keydown', onKeyDown);
speedEl.addEventListener('change', () => {
  statusEl.textContent = `Speed set to ${speedEl.options[speedEl.selectedIndex].text}.`;
});

resetGame();
startLoop();
