// =========================================================
// GERENTE DE SOBREVIVÊNCIA — MVP (Tycoon/Idle)
// Recurso único: ENERGIA. Objetivo: sobreviver o máximo de dias.
// =========================================================

const WIDTH = 480;
const HEIGHT = 800;

// Duração de 1 "dia" do jogo em milissegundos (ajuste para testar mais rápido)
const DAY_DURATION_MS = 3000;

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#0f1a24',
  parent: 'game-container',
  scene: { create: create, update: update }
};

// Estado central do jogo — tudo que muda durante a partida vive aqui
const state = {
  day: 1,
  dayElapsed: 0,
  money: 50,
  energy: 100,
  energyCapacity: 100,
  energyProduction: 6,   // energia gerada por dia (baseline: rede elétrica)
  energyConsumption: 9,  // energia consumida por dia (baseline: casa)
  solarLevel: 0,
  batteryLevel: 0,
  gameOver: false,
  log: 'Bem-vindo! Gerencie sua energia para sobreviver.'
};

// Custos escalam a cada compra (fica mais caro upgradar)
function solarCost() { return 40 + state.solarLevel * 30; }
function batteryCost() { return 60 + state.batteryLevel * 40; }

let ui = {}; // referências aos objetos visuais (texto, barras, botões)

function create() {
  const scene = this;

  // ---------- Título ----------
  scene.add.text(WIDTH / 2, 40, 'GERENTE DE SOBREVIVÊNCIA', {
    fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
  }).setOrigin(0.5);

  // ---------- Status (dia / dinheiro) ----------
  ui.dayText = scene.add.text(20, 90, '', { fontSize: '18px', color: '#9fd3ff' });
  ui.moneyText = scene.add.text(WIDTH - 20, 90, '', { fontSize: '18px', color: '#ffd700' }).setOrigin(1, 0);

  // ---------- Barra de energia ----------
  scene.add.text(20, 130, 'ENERGIA', { fontSize: '16px', color: '#ffffff' });
  ui.energyBarBg = scene.add.rectangle(WIDTH / 2, 165, WIDTH - 40, 28, 0x24303d).setStrokeStyle(2, 0x3a4a5a);
  ui.energyBarFill = scene.add.rectangle(20, 165, WIDTH - 40, 24, 0x4caf50).setOrigin(0, 0.5);
  ui.energyText = scene.add.text(WIDTH / 2, 165, '', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);

  // ---------- Log de eventos ----------
  ui.logText = scene.add.text(20, 210, '', {
    fontSize: '14px', color: '#c9d6e0', wordWrap: { width: WIDTH - 40 }
  });

  // ---------- Botão: Painel Solar ----------
  ui.solarButton = makeButton(scene, 20, 320, WIDTH - 40, 70, 0x1e5f3f, () => buySolar(scene));
  ui.solarLabel = scene.add.text(40, 335, '', { fontSize: '15px', color: '#ffffff', fontStyle: 'bold' });
  ui.solarDesc = scene.add.text(40, 358, '+ produção de energia', { fontSize: '12px', color: '#b7d9c8' });

  // ---------- Botão: Bateria ----------
  ui.batteryButton = makeButton(scene, 20, 410, WIDTH - 40, 70, 0x1e3f5f, () => buyBattery(scene));
  ui.batteryLabel = scene.add.text(40, 425, '', { fontSize: '15px', color: '#ffffff', fontStyle: 'bold' });
  ui.batteryDesc = scene.add.text(40, 448, '+ capacidade / reduz impacto de apagões', { fontSize: '12px', color: '#b7c9d9' });

  // ---------- Painel de Game Over (escondido no início) ----------
  ui.gameOverOverlay = scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.85).setVisible(false);
  ui.gameOverText = scene.add.text(WIDTH / 2, HEIGHT / 2 - 30, '', {
    fontSize: '24px', color: '#ff6b6b', fontStyle: 'bold', align: 'center', wordWrap: { width: WIDTH - 80 }
  }).setOrigin(0.5).setVisible(false);
  ui.restartButton = makeButton(scene, WIDTH / 2 - 90, HEIGHT / 2 + 30, 180, 50, 0x555555, () => restartGame(scene));
  ui.restartButton.setVisible(false);
  ui.restartLabel = scene.add.text(WIDTH / 2, HEIGHT / 2 + 55, 'JOGAR NOVAMENTE', { fontSize: '16px', color: '#ffffff' })
    .setOrigin(0.5).setVisible(false);

  // ---------- Timer principal: avança 1 dia a cada DAY_DURATION_MS ----------
  scene.time.addEvent({ delay: DAY_DURATION_MS, loop: true, callback: () => advanceDay(scene) });

  refreshUI();
}

function update() {
  // Reservado para animações contínuas, se precisar futuramente
}

// Cria um botão retangular clicável (retângulo + interatividade)
function makeButton(scene, x, y, w, h, color, onClick) {
  const rect = scene.add.rectangle(x, y, w, h, color).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.15);
  rect.setInteractive({ useHandCursor: true });
  rect.on('pointerdown', onClick);
  rect.on('pointerover', () => rect.setAlpha(0.85));
  rect.on('pointerout', () => rect.setAlpha(1));
  return rect;
}

// ---------------- LÓGICA DE JOGO ----------------

function advanceDay(scene) {
  if (state.gameOver) return;

  state.day += 1;

  // Renda passiva simples (poderia virar "emprego" configurável depois)
  state.money += 12;

  // Balanço de energia do dia
  const net = state.energyProduction - state.energyConsumption;
  state.energy = clamp(state.energy + net, 0, state.energyCapacity);

  // Chance de apagão (evento aleatório) — bateria reduz o impacto pela metade
  const blackoutChance = 0.18;
  if (Math.random() < blackoutChance) {
    const impact = state.batteryLevel > 0 ? 15 : 30;
    state.energy = clamp(state.energy - impact, 0, state.energyCapacity);
    state.log = `⚡ Dia ${state.day}: Apagão na região! Você perdeu ${impact} de energia.`;
  } else {
    state.log = `Dia ${state.day}: tudo tranquilo. Saldo de energia: ${net >= 0 ? '+' : ''}${net}.`;
  }

  if (state.energy <= 0) {
    triggerGameOver(scene);
  }

  refreshUI();
}

function buySolar(scene) {
  if (state.gameOver) return;
  const cost = solarCost();
  if (state.money >= cost) {
    state.money -= cost;
    state.solarLevel += 1;
    state.energyProduction += 5;
    state.log = `☀️ Painel solar instalado! Produção de energia aumentou.`;
    refreshUI();
  } else {
    flashInsufficientFunds(scene, ui.solarButton);
  }
}

function buyBattery(scene) {
  if (state.gameOver) return;
  const cost = batteryCost();
  if (state.money >= cost) {
    state.money -= cost;
    state.batteryLevel += 1;
    state.energyCapacity += 40;
    state.log = `🔋 Bateria instalada! Capacidade de energia aumentou.`;
    refreshUI();
  } else {
    flashInsufficientFunds(scene, ui.batteryButton);
  }
}

function flashInsufficientFunds(scene, button) {
  state.log = 'Dinheiro insuficiente para essa melhoria ainda.';
  scene.tweens.add({ targets: button, alpha: 0.3, yoyo: true, duration: 120, repeat: 1 });
  refreshUI();
}

function triggerGameOver(scene) {
  state.gameOver = true;
  ui.gameOverOverlay.setVisible(true);
  ui.gameOverText.setText(`Sua energia acabou.\nVocê sobreviveu ${state.day} dias.`).setVisible(true);
  ui.restartButton.setVisible(true);
  ui.restartLabel.setVisible(true);
}

function restartGame(scene) {
  state.day = 1;
  state.money = 50;
  state.energy = 100;
  state.energyCapacity = 100;
  state.energyProduction = 6;
  state.energyConsumption = 9;
  state.solarLevel = 0;
  state.batteryLevel = 0;
  state.gameOver = false;
  state.log = 'Novo começo! Gerencie sua energia para sobreviver.';

  ui.gameOverOverlay.setVisible(false);
  ui.gameOverText.setVisible(false);
  ui.restartButton.setVisible(false);
  ui.restartLabel.setVisible(false);

  refreshUI();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Atualiza todos os textos e barras na tela com o estado atual
function refreshUI() {
  ui.dayText.setText(`Dia: ${state.day}`);
  ui.moneyText.setText(`R$ ${state.money}`);

  const pct = state.energy / state.energyCapacity;
  ui.energyBarFill.width = (WIDTH - 40) * pct;
  ui.energyBarFill.fillColor = pct > 0.5 ? 0x4caf50 : (pct > 0.2 ? 0xffb300 : 0xe53935);
  ui.energyText.setText(`${Math.round(state.energy)} / ${state.energyCapacity}`);

  ui.logText.setText(state.log);

  ui.solarLabel.setText(`Painel Solar (Nv. ${state.solarLevel}) — R$ ${solarCost()}`);
  ui.batteryLabel.setText(`Bateria (Nv. ${state.batteryLevel}) — R$ ${batteryCost()}`);
}

// Inicia o jogo
const game = new Phaser.Game(config);
