/**
 * Peek-a-Boo Shooter - WebRTC P2P Multiplayer Engine
 * 100% Client-Side JavaScript (0 Python required, runs natively on Cloudflare Pages)
 * Features pixel-perfect font rendering and retro aesthetics matching the original game.
 */

(function () {
  'use strict';

  // Game's exact sprite pixel font mapping
  const FONT_SPRITE_URL = '/assets/pixel_font_sprites_1785404885523-BNQ_ZQzH.png';
  const SS = 20;   // sprite unit size
  const SV = 140;  // sprite sheet width
  const RV = 920;  // sprite sheet height
  const BC = 140;  // animation jitter rate (ms)

  const ZC = {
    0:{row:26,cols:[1,2,3,4]},1:{row:27,cols:[1,2,3]},2:{row:28,cols:[1,2]},3:{row:29,cols:[1,2,3]},
    4:{row:30,cols:[1,2,3,4]},5:{row:31,cols:[1,2]},6:{row:32,cols:[1,2,3]},7:{row:33,cols:[1,2]},
    8:{row:34,cols:[1,2,3,4]},9:{row:35,cols:[1,2]},A:{row:0,cols:[1,2,3]},B:{row:1,cols:[1,2,3,4]},
    C:{row:2,cols:[1,2,3,4]},D:{row:3,cols:[1,2,3,4]},E:{row:4,cols:[1,2,3,4,5]},F:{row:5,cols:[1,2]},
    G:{row:6,cols:[1,2,3]},H:{row:7,cols:[1,2]},I:{row:8,cols:[1,2,3,4]},J:{row:9,cols:[1,2,3,4,5]},
    K:{row:10,cols:[1,2,3]},L:{row:11,cols:[1,2,3,4]},M:{row:12,cols:[1,2,3,4]},N:{row:13,cols:[1,2,3]},
    O:{row:14,cols:[1,2]},P:{row:15,cols:[1,2]},Q:{row:16,cols:[1,2,3,4,5]},R:{row:17,cols:[1,2,3,4]},
    S:{row:18,cols:[1,2,3,4]},T:{row:19,cols:[1,2]},U:{row:20,cols:[1,2]},V:{row:21,cols:[1,2]},
    W:{row:22,cols:[1,2,3,4]},X:{row:23,cols:[1,2]},Y:{row:24,cols:[1,2,3,4]},Z:{row:25,cols:[1,2,3]},
    ".":{row:36,cols:[1,2]},"'":{row:37,cols:[1,2,3]},",":{row:38,cols:[1,2,3,4,5]},":":{row:39,cols:[1,2]},
    "!":{row:40,cols:[1,2,3,4,5]},"?":{row:41,cols:[1,2,3,4]},"+":{row:42,cols:[1,2]},"-":{row:43,cols:[1,2]},
    "=":{row:44,cols:[1,2,3]},"€":{row:45,cols:[1,2,3]}
  };

  // State
  let peer = null;
  let conn = null;
  let isHost = false;
  let roomCode = null;
  let myPlayerName = localStorage.getItem('peekaboo-player-name') || 'Player_' + Math.floor(1000 + Math.random() * 9000);
  let opponentName = 'Opponent';
  let myWins = 0;
  let opponentWins = 0;
  let targetWins = 3; // First to 3 (Best of 5)
  let pingInterval = null;
  let lastPingTime = 0;
  let currentPing = 0;
  let isMatchActive = false;
  let roundOverTimer = null;

  // Sound effects
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, duration, type = 'square') {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function playConnectSound() {
    playTone(523.25, 0.08);
    setTimeout(() => playTone(659.25, 0.08), 80);
    setTimeout(() => playTone(783.99, 0.15), 160);
  }

  function playWinSound() {
    playTone(440, 0.08);
    setTimeout(() => playTone(554.37, 0.08), 100);
    setTimeout(() => playTone(659.25, 0.1), 200);
    setTimeout(() => playTone(880, 0.25), 300);
  }

  function playLoseSound() {
    playTone(330, 0.12, 'sawtooth');
    setTimeout(() => playTone(293.66, 0.15, 'sawtooth'), 120);
    setTimeout(() => playTone(261.63, 0.28, 'sawtooth'), 260);
  }

  // Create pixel font DOM element matching React's Ye component
  function createPixelText(text, size = 16) {
    const container = document.createElement('span');
    container.className = 'mp-pixel-text';
    container.dataset.text = text;
    container.dataset.size = size;
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.verticalAlign = 'middle';

    const b = size / SS;
    const str = String(text);
    const spans = [];

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === ' ') {
        const space = document.createElement('span');
        space.style.display = 'inline-block';
        space.style.width = `${size * 0.5}px`;
        container.appendChild(space);
        continue;
      }

      const upper = char.toUpperCase();
      const meta = ZC[upper];
      if (meta && meta.cols && meta.cols.length > 0) {
        const span = document.createElement('span');
        span.style.display = 'inline-block';
        span.style.width = `${size}px`;
        span.style.height = `${size}px`;
        span.style.flexShrink = '0';
        span.style.backgroundImage = `url(${FONT_SPRITE_URL})`;
        span.style.backgroundSize = `${SV * b}px ${RV * b}px`;
        span.style.backgroundRepeat = 'no-repeat';
        span.style.imageRendering = 'pixelated';
        container.appendChild(span);
        spans.push({ span, meta, offset: Math.random() * (BC * meta.cols.length) });
      } else {
        const fallback = document.createElement('span');
        fallback.style.fontFamily = 'Arial, sans-serif';
        fallback.style.fontWeight = 'bold';
        fallback.style.fontSize = `${size}px`;
        fallback.style.lineHeight = '1';
        fallback.style.color = 'inherit';
        fallback.textContent = char;
        container.appendChild(fallback);
      }
    }

    // Animated jitter timer
    function updateFrames() {
      if (!container.isConnected) return;
      const now = Date.now();
      for (let j = 0; j < spans.length; j++) {
        const { span, meta, offset } = spans[j];
        const colIdx = Math.floor((now + offset) / BC) % meta.cols.length;
        const sx = meta.cols[colIdx] * SS;
        const sy = meta.row * SS;
        span.style.backgroundPosition = `-${sx * b}px -${sy * b}px`;
      }
      requestAnimationFrame(updateFrames);
    }
    requestAnimationFrame(updateFrames);

    return container;
  }

  // 4-letter room code generator
  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Styles matching the game's exact black/white minimalist aesthetic
  const style = document.createElement('style');
  style.textContent = `
    .mp-ui {
      font-family: Arial, sans-serif;
      color: #000;
      box-sizing: border-box;
      user-select: none;
    }
    .mp-overlay {
      position: fixed;
      inset: 0;
      background: rgba(255, 255, 255, 0.96);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .mp-box {
      width: 100%;
      max-width: 320px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
    }
    .mp-btn-game {
      padding: 10px 20px;
      background: #ffffff;
      color: #000000;
      border: 2px solid #000000;
      border-radius: 8px;
      cursor: pointer;
      width: 80%;
      max-width: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.1s;
    }
    .mp-btn-game:hover {
      background: #f4f4f5;
    }
    .mp-btn-game:active {
      background: #000000;
      color: #ffffff;
    }
    .mp-btn-small {
      padding: 6px 12px;
      font-size: 13px;
      font-weight: bold;
      background: #ffffff;
      color: #000000;
      border: 2px solid #000000;
      border-radius: 6px;
      cursor: pointer;
    }
    .mp-input-game {
      font-size: 15px;
      font-weight: bold;
      padding: 6px 10px;
      border: 2px solid #000000;
      border-radius: 6px;
      text-align: center;
      width: 180px;
      text-transform: uppercase;
      outline: none;
    }
    .mp-tab-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .mp-tab-btn {
      background: none;
      border: none;
      font-size: 13px;
      font-weight: bold;
      color: #888;
      cursor: pointer;
      padding: 4px 8px;
      border-bottom: 2px solid transparent;
    }
    .mp-tab-btn.active {
      color: #000;
      border-bottom: 2px solid #000;
    }
    .mp-hud-top {
      position: fixed;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: #ffffff;
      border: 2px solid #000000;
      border-radius: 8px;
      padding: 4px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      font-weight: bold;
    }
    .mp-banner {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      text-align: center;
      padding: 20px;
    }
    .mp-reactions {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      gap: 6px;
      background: #ffffff;
      border: 2px solid #000;
      border-radius: 20px;
      padding: 3px 8px;
    }
    .mp-react-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 2px 4px;
      transition: transform 0.1s;
    }
    .mp-react-btn:active {
      transform: scale(1.3);
    }
    .mp-floating-emoji {
      position: fixed;
      font-size: 36px;
      z-index: 10000;
      pointer-events: none;
      animation: mpFloat 1.6s forwards ease-out;
    }
    @keyframes mpFloat {
      0% { transform: translateY(0); opacity: 0; }
      20% { opacity: 1; }
      100% { transform: translateY(-120px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Send packet
  function sendPacket(data) {
    if (conn && conn.open) {
      try {
        conn.send(data);
      } catch (e) {
        console.error('Send error:', e);
      }
    }
  }

  // Ping tracking
  function startPing() {
    stopPing();
    pingInterval = setInterval(() => {
      if (conn && conn.open) {
        lastPingTime = performance.now();
        sendPacket({ type: 'PING', t: lastPingTime });
      }
    }, 2000);
  }

  function stopPing() {
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = null;
  }

  function spawnEmoji(emoji, isLocal = true) {
    const el = document.createElement('div');
    el.className = 'mp-floating-emoji';
    el.textContent = emoji;
    el.style.left = isLocal ? '35%' : '65%';
    el.style.bottom = '90px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  // Packet receiver
  function handlePacket(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'PING':
        sendPacket({ type: 'PONG', t: data.t });
        break;

      case 'PONG':
        currentPing = Math.round(performance.now() - data.t);
        updateHudPing();
        break;

      case 'HELLO':
        opponentName = data.name || 'Opponent';
        onConnected();
        break;

      case 'START_COUNTDOWN':
        opponentName = data.hostName || opponentName;
        targetWins = data.targetWins || 3;
        startCountdown();
        break;

      case 'ROUND_START':
        window.__MP_DISTANCE = data.distance;
        window.__MP_WEAPON_IDX = data.weaponIdx;
        if (window.__MP_NEXT_ROUND) {
          window.__MP_NEXT_ROUND();
        }
        break;

      case 'OPPONENT_SHOOT':
        if (window.__MP_OPPONENT_SHOOT) {
          window.__MP_OPPONENT_SHOOT();
        }
        break;

      case 'ROUND_RESULT':
        handleRoundResultFromHost(data);
        break;

      case 'REACTION':
        spawnEmoji(data.emoji, false);
        break;

      case 'LEAVE_MATCH':
        handleOpponentLeft();
        break;
    }
  }

  // Host room
  function hostMatch(code) {
    roomCode = code.toUpperCase();
    setStatus('CREATING ROOM...');

    if (peer) peer.destroy();

    peer = new Peer('pab-' + roomCode, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', () => {
      isHost = true;
      renderHostLobby();
    });

    peer.on('connection', (incoming) => {
      conn = incoming;
      setupConnection();
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        hostMatch(generateRoomCode());
      } else {
        setStatus('ERROR: ' + err.message);
      }
    });
  }

  // Join room
  function joinMatch(code) {
    roomCode = code.trim().toUpperCase();
    if (roomCode.length !== 4) {
      setStatus('ENTER 4-LETTER CODE');
      return;
    }

    setStatus('CONNECTING TO ' + roomCode + '...');

    if (peer) peer.destroy();

    peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', () => {
      isHost = false;
      conn = peer.connect('pab-' + roomCode, { reliable: true });
      setupConnection();
    });

    peer.on('error', () => {
      setStatus('ROOM NOT FOUND');
    });
  }

  function setupConnection() {
    conn.on('open', () => {
      playConnectSound();
      startPing();

      sendPacket({
        type: 'HELLO',
        name: myPlayerName
      });

      if (isHost) {
        onConnected();
      }
    });

    conn.on('data', handlePacket);
    conn.on('close', handleOpponentLeft);
    conn.on('error', handleOpponentLeft);
  }

  function onConnected() {
    const statusEl = document.getElementById('mp-status-text');
    if (statusEl) {
      statusEl.innerHTML = '';
      statusEl.appendChild(createPixelText('CONNECTED TO ' + opponentName.toUpperCase(), 14));
    }

    if (isHost) {
      const btn = document.getElementById('mp-start-btn');
      if (btn) {
        btn.style.display = 'flex';
        btn.onclick = () => {
          sendPacket({
            type: 'START_COUNTDOWN',
            hostName: myPlayerName,
            targetWins: targetWins
          });
          startCountdown();
        };
      }
    }
  }

  function startCountdown() {
    let count = 3;
    const box = document.querySelector('.mp-box');
    if (box) {
      box.innerHTML = '';
      box.appendChild(createPixelText('GET READY', 20));
      const countEl = document.createElement('div');
      countEl.style.margin = '20px 0';
      countEl.appendChild(createPixelText(String(count), 48));
      box.appendChild(countEl);

      const timer = setInterval(() => {
        count--;
        countEl.innerHTML = '';
        if (count > 0) {
          countEl.appendChild(createPixelText(String(count), 48));
          playTone(440, 0.08);
        } else if (count === 0) {
          countEl.appendChild(createPixelText('DUEL!', 36));
          playTone(880, 0.2);
        } else {
          clearInterval(timer);
          closeModal();
          launchGame();
        }
      }, 1000);
    }
  }

  function launchGame() {
    isMatchActive = true;
    myWins = 0;
    opponentWins = 0;
    window.__MP_ACTIVE = true;

    window.__MP_ON_SHOOT = () => {
      sendPacket({ type: 'OPPONENT_SHOOT' });
    };

    window.__MP_ON_ROUND_END = (result) => {
      if (isHost) {
        let winner = 'draw';
        if (result === 'KO_WIN') {
          winner = 'host';
          myWins++;
        } else if (result === 'KO_LOSS') {
          winner = 'guest';
          opponentWins++;
        }

        sendPacket({
          type: 'ROUND_RESULT',
          winner: winner,
          hostWins: myWins,
          guestWins: opponentWins
        });

        showResultBanner(winner === 'host', winner === 'draw');
      }
    };

    if (isHost) {
      const weaponIdx = Math.floor(Math.random() * 4);
      const distance = (150 + Math.random() * 300) / 500;
      window.__MP_WEAPON_IDX = weaponIdx;
      window.__MP_DISTANCE = distance;
      sendPacket({
        type: 'ROUND_START',
        weaponIdx: weaponIdx,
        distance: distance
      });
    }

    if (window.__PAB && window.__PAB.startMultiplayer) {
      window.__PAB.startMultiplayer();
    }

    createHud();
    createReactions();
  }

  function handleRoundResultFromHost(data) {
    if (!isMatchActive) return;
    const winner = data.winner;
    myWins = data.guestWins;
    opponentWins = data.hostWins;
    showResultBanner(winner === 'guest', winner === 'draw');
  }

  function showResultBanner(isMeWinner, isDraw) {
    updateHudScore();
    if (isMeWinner) playWinSound();
    else if (!isDraw) playLoseSound();

    const banner = document.createElement('div');
    banner.className = 'mp-banner mp-ui';
    banner.id = 'mp-round-banner';

    const matchOver = myWins >= targetWins || opponentWins >= targetWins;
    const isMatchWinner = myWins >= targetWins;

    if (matchOver) {
      banner.appendChild(createPixelText(isMatchWinner ? 'MATCH VICTORY!' : 'DEFEAT!', 24));
      const scoreTxt = document.createElement('div');
      scoreTxt.style.fontSize = '14px';
      scoreTxt.style.color = '#555';
      scoreTxt.textContent = `FINAL SCORE: ${myWins} - ${opponentWins}`;
      banner.appendChild(scoreTxt);

      const againBtn = document.createElement('button');
      againBtn.className = 'mp-btn-game';
      againBtn.appendChild(createPixelText('PLAY AGAIN', 16));
      againBtn.onclick = () => {
        banner.remove();
        myWins = 0;
        opponentWins = 0;
        updateHudScore();
        if (isHost) nextRoundHost();
      };
      banner.appendChild(againBtn);

      const exitBtn = document.createElement('button');
      exitBtn.className = 'mp-btn-game';
      exitBtn.appendChild(createPixelText('EXIT TO MENU', 16));
      exitBtn.onclick = () => {
        banner.remove();
        leaveMatch();
      };
      banner.appendChild(exitBtn);
    } else {
      banner.appendChild(createPixelText(isDraw ? 'ROUND DRAW!' : (isMeWinner ? 'ROUND WON!' : 'ROUND LOST!'), 22));
      const scoreTxt = document.createElement('div');
      scoreTxt.style.fontSize = '14px';
      scoreTxt.style.color = '#555';
      scoreTxt.textContent = `SCORE: ${myWins} - ${opponentWins} (FIRST TO ${targetWins})`;
      banner.appendChild(scoreTxt);

      const timerTxt = document.createElement('div');
      timerTxt.style.fontSize = '13px';
      timerTxt.style.color = '#777';
      timerTxt.textContent = 'Next round in 3s...';
      banner.appendChild(timerTxt);

      let timeLeft = 3;
      if (roundOverTimer) clearInterval(roundOverTimer);
      roundOverTimer = setInterval(() => {
        timeLeft--;
        timerTxt.textContent = `Next round in ${timeLeft}s...`;
        if (timeLeft <= 0) {
          clearInterval(roundOverTimer);
          banner.remove();
          if (isHost) nextRoundHost();
        }
      }, 1000);
    }

    document.body.appendChild(banner);
  }

  function nextRoundHost() {
    const weaponIdx = Math.floor(Math.random() * 4);
    const distance = (150 + Math.random() * 300) / 500;
    window.__MP_WEAPON_IDX = weaponIdx;
    window.__MP_DISTANCE = distance;
    sendPacket({
      type: 'ROUND_START',
      weaponIdx: weaponIdx,
      distance: distance
    });
    if (window.__MP_NEXT_ROUND) window.__MP_NEXT_ROUND();
  }

  function createHud() {
    removeHud();
    const hud = document.createElement('div');
    hud.className = 'mp-hud-top mp-ui';
    hud.id = 'mp-hud';

    const p1 = document.createElement('span');
    p1.appendChild(createPixelText(myPlayerName.toUpperCase(), 13));
    hud.appendChild(p1);

    const score = document.createElement('span');
    score.id = 'mp-hud-score';
    score.appendChild(createPixelText(`${myWins}-${opponentWins}`, 15));
    hud.appendChild(score);

    const p2 = document.createElement('span');
    p2.appendChild(createPixelText(opponentName.toUpperCase(), 13));
    hud.appendChild(p2);

    const ping = document.createElement('span');
    ping.id = 'mp-hud-ping';
    ping.style.fontSize = '11px';
    ping.style.color = '#888';
    ping.textContent = `${currentPing || 25}ms`;
    hud.appendChild(ping);

    const exit = document.createElement('button');
    exit.className = 'mp-btn-small';
    exit.style.padding = '2px 6px';
    exit.style.fontSize = '11px';
    exit.textContent = '✕';
    exit.onclick = () => {
      if (confirm('Leave match?')) {
        sendPacket({ type: 'LEAVE_MATCH' });
        leaveMatch();
      }
    };
    hud.appendChild(exit);

    document.body.appendChild(hud);
  }

  function updateHudScore() {
    const el = document.getElementById('mp-hud-score');
    if (el) {
      el.innerHTML = '';
      el.appendChild(createPixelText(`${myWins}-${opponentWins}`, 15));
    }
  }

  function updateHudPing() {
    const el = document.getElementById('mp-hud-ping');
    if (el) el.textContent = `${currentPing}ms`;
  }

  function removeHud() {
    const hud = document.getElementById('mp-hud');
    if (hud) hud.remove();
    const react = document.getElementById('mp-react');
    if (react) react.remove();
  }

  function createReactions() {
    const bar = document.createElement('div');
    bar.className = 'mp-reactions mp-ui';
    bar.id = 'mp-react';
    ['🔥', '😂', '💀', '🎯', '👏'].forEach((em) => {
      const b = document.createElement('button');
      b.className = 'mp-react-btn';
      b.textContent = em;
      b.onclick = () => {
        spawnEmoji(em, true);
        sendPacket({ type: 'REACTION', emoji: em });
      };
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
  }

  function handleOpponentLeft() {
    if (!isMatchActive && !document.querySelector('.mp-overlay')) return;
    isMatchActive = false;
    stopPing();
    alert('Opponent disconnected.');
    leaveMatch();
  }

  function leaveMatch() {
    isMatchActive = false;
    stopPing();
    removeHud();
    const banner = document.getElementById('mp-round-banner');
    if (banner) banner.remove();

    if (conn) conn.close();
    if (peer) peer.destroy();
    conn = null;
    peer = null;

    window.__MP_ACTIVE = false;
    if (window.__PAB && window.__PAB.exitToTitle) {
      window.__PAB.exitToTitle();
    }
  }

  // Modal UI
  function openModal(defaultTab = 'host') {
    closeModal();
    myPlayerName = localStorage.getItem('peekaboo-player-name') || myPlayerName;

    const overlay = document.createElement('div');
    overlay.className = 'mp-overlay mp-ui';
    overlay.id = 'mp-overlay';

    const box = document.createElement('div');
    box.className = 'mp-box';

    // Title in authentic pixel font
    const title = document.createElement('h2');
    title.style.margin = '0';
    title.appendChild(createPixelText('MULTIPLAYER', 22));
    box.appendChild(title);

    // Name editor
    const nameRow = document.createElement('div');
    nameRow.style.display = 'flex';
    nameRow.style.alignItems = 'center';
    nameRow.style.gap = '6px';
    const nameInput = document.createElement('input');
    nameInput.className = 'mp-input-game';
    nameInput.style.width = '140px';
    nameInput.style.fontSize = '13px';
    nameInput.value = myPlayerName;
    nameInput.maxLength = 18;
    nameInput.onchange = () => {
      const v = nameInput.value.trim();
      if (v) {
        myPlayerName = v;
        localStorage.setItem('peekaboo-player-name', v);
        if (window.__PAB && window.__PAB.setPlayerName) window.__PAB.setPlayerName(v);
      }
    };
    nameRow.appendChild(nameInput);
    box.appendChild(nameRow);

    // Tab buttons
    const tabBar = document.createElement('div');
    tabBar.className = 'mp-tab-bar';

    const hostTabBtn = document.createElement('button');
    hostTabBtn.className = 'mp-tab-btn ' + (defaultTab === 'host' ? 'active' : '');
    hostTabBtn.appendChild(createPixelText('HOST', 14));

    const joinTabBtn = document.createElement('button');
    joinTabBtn.className = 'mp-tab-btn ' + (defaultTab === 'join' ? 'active' : '');
    joinTabBtn.appendChild(createPixelText('JOIN', 14));

    tabBar.appendChild(hostTabBtn);
    tabBar.appendChild(joinTabBtn);
    box.appendChild(tabBar);

    const tabContent = document.createElement('div');
    tabContent.id = 'mp-tab-content';
    tabContent.style.width = '100%';
    tabContent.style.display = 'flex';
    tabContent.style.flexDirection = 'column';
    tabContent.style.alignItems = 'center';
    tabContent.style.gap = '10px';
    box.appendChild(tabContent);

    const statusEl = document.createElement('div');
    statusEl.id = 'mp-status-text';
    statusEl.style.fontSize = '13px';
    statusEl.style.fontWeight = 'bold';
    statusEl.style.color = '#555';
    box.appendChild(statusEl);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mp-btn-game';
    closeBtn.style.marginTop = '10px';
    closeBtn.appendChild(createPixelText('BACK TO MENU', 14));
    closeBtn.onclick = closeModal;
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    hostTabBtn.onclick = () => {
      hostTabBtn.classList.add('active');
      joinTabBtn.classList.remove('active');
      renderHostTab();
    };

    joinTabBtn.onclick = () => {
      joinTabBtn.classList.add('active');
      hostTabBtn.classList.remove('active');
      renderJoinTab();
    };

    if (defaultTab === 'host') renderHostTab();
    else renderJoinTab();
  }

  function setStatus(text) {
    const el = document.getElementById('mp-status-text');
    if (el) {
      el.innerHTML = '';
      el.appendChild(createPixelText(text, 13));
    }
  }

  function renderHostTab() {
    const content = document.getElementById('mp-tab-content');
    if (!content) return;
    content.innerHTML = '';

    const code = generateRoomCode();

    const createBtn = document.createElement('button');
    createBtn.className = 'mp-btn-game';
    createBtn.appendChild(createPixelText('CREATE ROOM', 15));
    createBtn.onclick = () => hostMatch(code);
    content.appendChild(createBtn);

    const formatRow = document.createElement('div');
    formatRow.style.fontSize = '13px';
    formatRow.style.color = '#555';
    formatRow.innerHTML = `Format: <select id="mp-target-select" style="padding: 3px 6px; font-weight: bold; border: 2px solid #000; border-radius: 4px; background: white;">
      <option value="3" selected>First to 3 Wins</option>
      <option value="5">First to 5 Wins</option>
      <option value="1">1 Round Duel</option>
    </select>`;
    content.appendChild(formatRow);

    document.getElementById('mp-target-select').onchange = (e) => {
      targetWins = parseInt(e.target.value, 10);
    };
  }

  function renderHostLobby() {
    const content = document.getElementById('mp-tab-content');
    if (!content) return;
    content.innerHTML = '';

    const roomBox = document.createElement('div');
    roomBox.style.border = '2px dashed #000';
    roomBox.style.borderRadius = '6px';
    roomBox.style.padding = '10px';
    roomBox.style.width = '80%';
    roomBox.style.background = '#fafafa';

    const label = document.createElement('div');
    label.style.fontSize = '12px';
    label.style.color = '#777';
    label.textContent = 'ROOM CODE';
    roomBox.appendChild(label);

    const codeEl = document.createElement('div');
    codeEl.style.margin = '6px 0';
    codeEl.appendChild(createPixelText(roomCode, 26));
    roomBox.appendChild(codeEl);

    content.appendChild(roomBox);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '6px';

    const copyCodeBtn = document.createElement('button');
    copyCodeBtn.className = 'mp-btn-small';
    copyCodeBtn.textContent = 'Copy Code';
    copyCodeBtn.onclick = () => {
      navigator.clipboard.writeText(roomCode);
      alert('Copied room code: ' + roomCode);
    };

    const copyLinkBtn = document.createElement('button');
    copyLinkBtn.className = 'mp-btn-small';
    copyLinkBtn.textContent = 'Copy Link';
    copyLinkBtn.onclick = () => {
      const url = window.location.origin + window.location.pathname + '?room=' + roomCode;
      navigator.clipboard.writeText(url);
      alert('Copied invite link: ' + url);
    };

    btnRow.appendChild(copyCodeBtn);
    btnRow.appendChild(copyLinkBtn);
    content.appendChild(btnRow);

    setStatus('WAITING FOR OPPONENT...');

    const startBtn = document.createElement('button');
    startBtn.id = 'mp-start-btn';
    startBtn.className = 'mp-btn-game';
    startBtn.style.display = 'none';
    startBtn.appendChild(createPixelText('START MATCH ▶', 15));
    content.appendChild(startBtn);
  }

  function renderJoinTab(prefill = '') {
    const content = document.getElementById('mp-tab-content');
    if (!content) return;
    content.innerHTML = '';

    const input = document.createElement('input');
    input.className = 'mp-input-game';
    input.placeholder = 'CODE';
    input.maxLength = 4;
    input.value = prefill;
    content.appendChild(input);

    const joinBtn = document.createElement('button');
    joinBtn.className = 'mp-btn-game';
    joinBtn.appendChild(createPixelText('JOIN MATCH', 15));
    joinBtn.onclick = () => joinMatch(input.value);
    content.appendChild(joinBtn);

    input.onkeydown = (e) => {
      if (e.key === 'Enter') joinBtn.click();
    };

    if (prefill && prefill.length === 4) {
      setTimeout(() => joinBtn.click(), 200);
    }
  }

  function closeModal() {
    const overlay = document.getElementById('mp-overlay');
    if (overlay) overlay.remove();
  }

  window.__OPEN_MULTIPLAYER = openModal;

  // Auto-connect from ?room=CODE
  window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && room.trim().length === 4) {
      setTimeout(() => {
        openModal('join');
        renderJoinTab(room.trim().toUpperCase());
      }, 400);
    }
  });

})();
