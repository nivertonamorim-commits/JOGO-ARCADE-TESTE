class Bullet {
  constructor(x, y, vx, vy, color, friendly = true) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.color = color; this.friendly = friendly;
    this.w = 4; this.h = 10;
  }
  update() { this.x += this.vx; this.y += this.vy; }
  draw(ctx) { ctx.fillStyle = this.color; ctx.fillRect(this.x - 2, this.y - 8, this.w, this.h); }
}

class AssetLibrary {
  constructor() {
    this.images = new Map();
    this.manifest = {
      pilots: {
        male: ['assets/ships/player_f22_a.png', 'assets/ships/player_f22_b.png'],
        female: ['assets/ships/player_f22_c.png', 'assets/ships/player_f22_d.png']
      },
      enemies: {
        small: 'assets/ships/enemy_f15_a.png',
        heavy: 'assets/ships/enemy_f15_b.png'
      },
      backgrounds: {
        desert: 'assets/maps/desert.png', highway: 'assets/maps/highway.png', city: 'assets/maps/city.png', stadium: 'assets/maps/stadium.png'
      }
    };
  }
  loadImage(path) { return new Promise(resolve => { const img = new Image(); img.onload = () => { this.images.set(path, img); resolve(img); }; img.onerror = () => resolve(null); img.src = path; }); }
  async loadAll() {
    const allPaths = [
      ...Object.values(this.manifest.pilots).flat(),
      ...Object.values(this.manifest.enemies),
      ...Object.values(this.manifest.backgrounds)
    ];
    await Promise.all(allPaths.map(p => this.loadImage(p)));
  }
  get(path) { return this.images.get(path) || null; }
}

class Player {
  constructor(game) { this.game = game; this.x = game.width / 2; this.y = game.height - 80; this.lives = 3; this.weaponLevel = 1; this.shield = 0; this.bombs = 2; }
  shoot() {
    const bullets = [new Bullet(this.x, this.y - 24, 0, -9, '#66BB6A')];
    if (this.weaponLevel >= 2) bullets.push(new Bullet(this.x - 10, this.y - 20, -0.5, -8.5, '#66BB6A'), new Bullet(this.x + 10, this.y - 20, 0.5, -8.5, '#66BB6A'));
    if (this.weaponLevel >= 3) bullets.push(new Bullet(this.x - 20, this.y - 16, -1.2, -8, '#66BB6A'), new Bullet(this.x + 20, this.y - 16, 1.2, -8, '#66BB6A'));
    this.game.bullets.push(...bullets);
  }
  draw(ctx) {
    const sprite = this.game.getPilotSprite();
    if (sprite) ctx.drawImage(sprite, this.x - 22, this.y - 34, 44, 68);
    else {
      ctx.fillStyle = '#66BB6A'; ctx.fillRect(this.x - 8, this.y - 16, 16, 28);
      ctx.fillStyle = '#1B5E20'; ctx.fillRect(this.x - 2, this.y - 18, 4, 32);
      ctx.fillStyle = '#A5D6A7'; ctx.fillRect(this.x - 6, this.y - 12, 12, 8);
    }
    if (this.shield > 0) { ctx.strokeStyle = '#FFD43B'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x, this.y, 24, 0, Math.PI * 2); ctx.stroke(); }
  }
}

class Enemy {
  constructor(x, y, type = 'small') {
    this.depth = 0;
    this.x = x; this.y = y; this.type = type;
    this.speed = { small: 2.2, mid: 1.7, miniBoss: 1.1, boss: 0.6 }[type];
    this.hp = { small: 1, mid: 5, miniBoss: 28, boss: 110 }[type];
    this.w = { small: 20, mid: 28, miniBoss: 70, boss: 110 }[type];
    this.h = { small: 20, mid: 28, miniBoss: 50, boss: 74 }[type];
    this.score = { small: 50, mid: 180, miniBoss: 1300, boss: 7000 }[type];
    this.cooldown = 0;
  }
  update(game) {
    this.y += this.speed;
    this.depth = Math.min(1, Math.max(0, this.y / game.height));
    if (this.type === 'miniBoss' || this.type === 'boss') {
      this.x += Math.sin(performance.now() / 350) * (this.type === 'boss' ? 2 : 1.3);
      this.cooldown--;
      if (this.cooldown <= 0) {
        const spread = this.type === 'boss' ? [-1.2, 0, 1.2] : [0];
        spread.forEach(vx => game.enemyBullets.push(new Bullet(this.x, this.y + this.h / 2, vx, 4.3, '#ffb36b', false)));
        this.cooldown = this.type === 'boss' ? 22 : 45;
      }
    }
  }
  draw(ctx, sprite) {
    const scale = 0.55 + this.depth * 0.95;
    const dw = this.w * scale;
    const dh = this.h * scale;
    if (sprite) ctx.drawImage(sprite, this.x - dw / 2, this.y - dh / 2, dw, dh);
    else { ctx.fillStyle = "#D96B2B"; ctx.fillRect(this.x - dw / 2, this.y - dh / 2, dw, dh); ctx.fillStyle = "#8F3E14"; ctx.fillRect(this.x - 4 * scale, this.y - dh / 2, 8 * scale, dh); }
  }
}
class PowerUp { constructor(x, y, kind) { this.x = x; this.y = y; this.kind = kind; this.r = 9; } update() { this.y += 2; } draw(ctx) { const colors = { weapon: '#FFD43B', shield: '#66BB6A', bomb: '#FDCB0F' }; ctx.fillStyle = colors[this.kind]; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill(); } }

class StageManager {
  constructor(game) { this.game = game; this.stage = 1; this.phase = 0; this.timer = 0; this.transitionFrames = 0; }
  spawnEnemies() {
    this.timer++;
    const g = this.game;
    if (this.phase === 0 && this.timer % Math.max(18, 36 - this.stage * 2) === 0) g.enemies.push(new Enemy(40 + Math.random() * (g.width - 80), -20, 'small'));
    if (this.timer > 500 && this.phase === 0) { this.phase = 1; g.enemies.push(new Enemy(g.width / 2, -50, 'miniBoss')); }
    if (this.timer > 980 && this.phase === 1 && !g.enemies.some(e => e.type === 'miniBoss')) this.phase = 2;
    if (this.phase === 2 && this.timer % Math.max(28, 55 - this.stage * 2) === 0 && this.timer < 1450) g.enemies.push(new Enemy(40 + Math.random() * (g.width - 80), -20, 'mid'));
    if (this.timer >= 1450 && this.phase === 2) { this.phase = 3; g.spawnBoss(); }
    if (this.transitionFrames > 0) this.transitionFrames--;
  }
  nextStage() { this.stage++; this.phase = 0; this.timer = 0; this.transitionFrames = 130; }
}

class UI {
  constructor(game) { this.game = game; }
  drawUI() {
    const g = this.game; const c = g.ctx;
    c.fillStyle = 'rgba(27,94,32,0.72)'; c.fillRect(8, 8, g.width - 16, 44);
    c.strokeStyle = '#FFD43B'; c.strokeRect(8, 8, g.width - 16, 44);
    c.fillStyle = '#FFD43B'; c.font = '16px monospace'; c.fillText(`SCORE ${g.score}`, 18, 35);
    c.fillStyle = '#66BB6A'; c.fillText(`LIVES ${g.player.lives}`, 165, 35);
    c.fillStyle = '#FDCB0F'; c.fillText(`WPN ${g.player.weaponLevel}`, 280, 35);
    c.fillStyle = '#FFD43B'; c.fillText(`BOMB ${g.player.bombs}`, 360, 35);
    if (g.boss) {
      c.fillStyle = '#1B5E20'; c.fillRect(50, 62, g.width - 100, 16);
      const pct = Math.max(0, g.boss.hp / 110);
      const grad = c.createLinearGradient(50, 62, g.width - 50, 76); grad.addColorStop(0, '#FFD43B'); grad.addColorStop(1, '#1B5E20');
      c.fillStyle = grad; c.fillRect(50, 62, (g.width - 100) * pct, 16); c.strokeStyle = '#FFD43B'; c.strokeRect(50, 62, g.width - 100, 16);
    }
    if (g.stageManager.transitionFrames > 0) {
      const a = g.stageManager.transitionFrames / 130;
      const grad = c.createLinearGradient(0, 0, g.width, g.height); grad.addColorStop(0, `rgba(255,212,59,${a * 0.6})`); grad.addColorStop(1, `rgba(27,94,32,${a * 0.6})`);
      c.fillStyle = grad; c.fillRect(0, 0, g.width, g.height);
      c.fillStyle = '#FFD43B'; c.font = 'bold 24px monospace'; c.fillText(`STAGE ${g.stageManager.stage}`, g.width / 2 - 62, g.height / 2);
    }
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.width = canvas.width; this.height = canvas.height;
    this.assets = new AssetLibrary(); this.player = new Player(this); this.stageManager = new StageManager(this); this.ui = new UI(this);
    this.bullets = []; this.enemyBullets = []; this.enemies = []; this.powerUps = []; this.boss = null;
    this.running = false; this.score = 0; this.lastShot = 0; this.scrollY = 0; this.env = 'desert'; this.pilot = 'male';
    this.bindControls();
  }
  getPilotSprite() {
    const list = this.assets.manifest.pilots[this.pilot] || [];
    const loaded = list.map(p => this.assets.get(p)).filter(Boolean);
    return loaded.length ? loaded[Math.floor((performance.now() / 220) % loaded.length)] : null;
  }
  getEnemySprite(type) { return this.assets.get(type === 'small' ? this.assets.manifest.enemies.small : this.assets.manifest.enemies.heavy); }
  showIntroScreen() { this.showScreen('introScreen'); }
  showCharacterSelection() { this.showScreen('characterScreen'); }
  showEnvironmentSelection() { this.showScreen('environmentScreen'); }
  showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); if (id && id !== 'none') document.getElementById(id).classList.add('active'); }
  async start() { await this.assets.loadAll(); this.running = true; this.showScreen('none'); this.loop(); this.playMusic(); }
  spawnBoss() { if (!this.boss) { this.boss = new Enemy(this.width / 2, -80, 'boss'); this.enemies.push(this.boss); } }
  bindControls() { const move = (x, y) => { this.player.x = Math.max(20, Math.min(this.width - 20, x)); this.player.y = Math.max(80, Math.min(this.height - 20, y)); }; this.canvas.addEventListener('mousemove', e => { const r = this.canvas.getBoundingClientRect(); move((e.clientX - r.left) * this.width / r.width, (e.clientY - r.top) * this.height / r.height); }); let touching = false; this.canvas.addEventListener('touchstart', e => { touching = true; e.preventDefault(); }, { passive: false }); this.canvas.addEventListener('touchmove', e => { if (!touching) return; const t = e.touches[0]; const r = this.canvas.getBoundingClientRect(); move((t.clientX - r.left) * this.width / r.width, (t.clientY - r.top) * this.height / r.height); e.preventDefault(); }, { passive: false }); this.canvas.addEventListener('touchend', () => touching = false); }
  update() {
    this.scrollY = (this.scrollY + 1.5 + this.stageManager.stage * 0.08) % this.height;
    this.stageManager.spawnEnemies();
    if (performance.now() - this.lastShot > 140) { this.player.shoot(); this.lastShot = performance.now(); this.sfx('shoot'); }
    [...this.bullets, ...this.enemyBullets].forEach(b => b.update()); this.enemies.forEach(e => e.update(this)); this.powerUps.forEach(p => p.update());
    this.collisions(); this.cleanup(); if (this.player.shield > 0) this.player.shield--;
  }
  collisions() {
    this.bullets.forEach(b => this.enemies.forEach(e => { if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) { b.y = -999; e.hp--; if (e.hp <= 0) { this.score += e.score; e.y = this.height + 999; this.sfx('boom'); if (Math.random() < 0.24) this.powerUps.push(new PowerUp(e.x, e.y, ['weapon', 'shield', 'bomb'][Math.floor(Math.random() * 3)])); if (e === this.boss) { this.boss = null; this.stageManager.nextStage(); } } } }));
    this.enemyBullets.forEach(b => { if (Math.abs(b.x - this.player.x) < 13 && Math.abs(b.y - this.player.y) < 14) { b.y = this.height + 999; this.hitPlayer(); } });
    this.enemies.forEach(e => { if (Math.abs(e.x - this.player.x) < (e.w / 2 + 10) && Math.abs(e.y - this.player.y) < (e.h / 2 + 12)) { e.y = this.height + 999; this.hitPlayer(); } });
    this.powerUps.forEach(p => { if (Math.abs(p.x - this.player.x) < 16 && Math.abs(p.y - this.player.y) < 16) { p.y = this.height + 999; if (p.kind === 'weapon') this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1); if (p.kind === 'shield') this.player.shield = 430; if (p.kind === 'bomb') this.player.bombs++; this.sfx('power'); } });
  }
  hitPlayer() { if (this.player.shield > 0) return; this.player.lives--; this.sfx('boom'); if (this.player.lives <= 0) this.gameOver(); }
  drawBackground() {
    const c = this.ctx; const bg = this.assets.get(this.assets.manifest.backgrounds[this.env]);
    if (bg) {
      c.save();
      c.translate(this.width / 2, this.height / 2);
      c.transform(1, -0.10, 0, 1, 0, 0);
      c.drawImage(bg, -this.width / 2, this.scrollY - this.height / 2 - this.height, this.width, this.height);
      c.drawImage(bg, -this.width / 2, this.scrollY - this.height / 2, this.width, this.height);
      c.restore();
      return;
    }
    const schemes = { desert: ['#66511f', '#b08a2a'], highway: ['#1d1d1d', '#2e5a34'], city: ['#1c2337', '#5c5433'], stadium: ['#194224', '#69721f'] };
    const [a, b] = schemes[this.env]; c.fillStyle = a; c.fillRect(0, 0, this.width, this.height); c.fillStyle = b; for (let i = 0; i < 24; i++) c.fillRect((i * 27 + (performance.now() / 20) % 40) % this.width, (i * 41 + (performance.now() / 12) % this.height) % this.height, 4, 16);
  }
  draw() {
    this.drawBackground();
    const c = this.ctx;
    c.save();
    c.translate(this.width / 2, this.height * 0.06);
    c.scale(1, 0.96);
    c.translate(-this.width / 2, -this.height * 0.06);
    this.player.draw(c);
    [...this.bullets, ...this.enemyBullets].forEach(b => b.draw(c));
    this.enemies.forEach(e => e.draw(c, this.getEnemySprite(e.type === 'small' ? 'small' : 'heavy')));
    this.powerUps.forEach(p => p.draw(c));
    c.restore();
    this.ui.drawUI();
  }
  cleanup() { this.bullets = this.bullets.filter(b => b.y > -40 && b.x > -20 && b.x < this.width + 20); this.enemyBullets = this.enemyBullets.filter(b => b.y < this.height + 40 && b.x > -40 && b.x < this.width + 40); this.enemies = this.enemies.filter(e => e.y < this.height + 80 && e.hp > 0); this.powerUps = this.powerUps.filter(p => p.y < this.height + 20); }
  loop = () => { if (!this.running) return; this.update(); this.draw(); requestAnimationFrame(this.loop); }
  gameOver() { this.running = false; document.getElementById('finalScore').textContent = `Final Score: ${this.score}`; this.showScreen('gameOverScreen'); }
  playMusic() { this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)(); this.musicTick(); }
  musicTick() { if (!this.running) return; const osc = this.audioCtx.createOscillator(); const gain = this.audioCtx.createGain(); osc.type = 'square'; const themes = { desert: [220, 262, 294], highway: [196, 247, 294], city: [262, 330, 392], stadium: [247, 330, 349] }; const arr = themes[this.env]; osc.frequency.value = arr[Math.floor(Math.random() * arr.length)]; gain.gain.value = 0.02; osc.connect(gain).connect(this.audioCtx.destination); osc.start(); osc.stop(this.audioCtx.currentTime + 0.12); setTimeout(() => this.musicTick(), 180); }
  sfx(kind) { if (!this.audioCtx) return; const o = this.audioCtx.createOscillator(); const g = this.audioCtx.createGain(); o.connect(g).connect(this.audioCtx.destination); o.type = 'square'; o.frequency.value = { shoot: 620, boom: 110, power: 880 }[kind] || 500; g.gain.value = 0.03; o.start(); o.stop(this.audioCtx.currentTime + 0.08); }
}

const game = new Game(document.getElementById('gameCanvas'));
document.getElementById('startBtn').addEventListener('click', () => game.showCharacterSelection());
document.querySelectorAll('[data-pilot]').forEach(btn => btn.addEventListener('click', () => { game.pilot = btn.dataset.pilot; game.showEnvironmentSelection(); }));
document.querySelectorAll('[data-env]').forEach(btn => btn.addEventListener('click', async () => { game.env = btn.dataset.env; await game.start(); }));
document.getElementById('restartBtn').addEventListener('click', () => window.location.reload());
game.showIntroScreen();
