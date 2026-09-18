# 🎯 Peek-a-Boo Shooter (WebRTC Multiplayer Edition)

> A minimalist, reaction-based **1-Button, 2-Colours** duel game featuring real-time, zero-cost **WebRTC Peer-to-Peer multiplayer** and local AI play.

[![Pure Client-Side](https://img.shields.io/badge/Stack-Pure%20Client--Side-000000?style=flat-square&logo=javascript)](#)
[![WebRTC P2P](https://img.shields.io/badge/Multiplayer-WebRTC%20DataChannels-2563eb?style=flat-square)](#)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages%20Ready-f38020?style=flat-square&logo=cloudflare)](#)
[![Zero Hosting Costs](https://img.shields.io/badge/Hosting%20Cost-%240%2Fmo%20Forever-16a34a?style=flat-square)](#)
[![Non-Commercial](https://img.shields.io/badge/License-Non--Commercial%20Community-gray?style=flat-square)](#)

---

## 📖 Overview

**Peek-a-Boo Shooter** is a high-tension reflex dueler. Both combatants hide behind wooden crates. When you crouch, you are protected from incoming fire. The moment you press the button, your character rises up to aim and fire—exposing your head to incoming projectiles. 

Time your peek to catch your opponent mid-shot, or bait their fire while staying safely in cover!

This repository contains a full static web build extended with **browser-to-browser WebRTC multiplayer**, eliminating the need for dedicated game servers.

---

## ✨ Features

### ⚔️ Real-Time Official Multiplayer (100% Free Forever)
* **Official Matchmaking Integration:** Replicated directly from [1b2c-m.jazzuo.com](https://1b2c-m.jazzuo.com/) with zero backend maintenance costs ($0/mo).
* **Two Play Modes:**
  * **Play with a Friend:** Generates an instant shareable invite link (`?room=<id>`) and an interactive on-screen **QR Code**.
  * **Play Random Opponent:** Global public matchmaking queue matching waiting duelist pairs.
* **10-Second Ready Check:** Sound alert (880Hz chime) and mobile haptic vibration (`[200, 100, 200]`) on match found, with interactive countdown confirmation.
* **Host-Authoritative 30 FPS Sync:** Host runs the physical duel simulation, synchronizing projectile trajectories, weapon roulette, and positions via normalized state packets.
* **Smart Reconnection Recovery:** Token-based persistent sessions (`reconnectToken`) that automatically recover matches during network interruptions.
* **Best-of-5 Duel Series:** Series scoring (first to 3 wins), round advancement, and one-tap rematch agreements.

### 🤖 Single-Player Mode
* Play against a reaction-based AI bot with escalating difficulty and reflex challenges.
* Local high-score tracking and offline leaderboard backup.

### 🏹 4 Distinct Weapons
| Weapon | Trajectory & Mechanics |
| :--- | :--- |
| **🔫 Pistol** | Standard high-velocity straight shot with balanced windup. |
| **⚡ Machine Gun** | High fire-rate automatic bursts. Keep your head down! |
| **🏹 Bow & Arrow** | Slower projectile speed requiring predictive timing. |
| **🪃 Boomerang** | Arcing projectile that returns to the thrower—can hit on the way back! |

### 🕹️ Multi-Platform Controls
* **Mobile / Touch:** Tap anywhere on the screen to peek and shoot.
* **Desktop:** Tap screen, left-click, or press **Spacebar** to shoot.

---

## 🚀 Deployment

Because this project is **100% static HTML, CSS, and Vanilla JavaScript**, it can be hosted on any static hosting platform for free with zero backend maintenance.

### Option 1: Deploy to Cloudflare Pages (Recommended)
1. Fork or push this repository to GitHub.
2. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
3. Select your repository and configure the build:
   * **Framework preset:** `None`
   * **Build command:** *(leave empty)*
   * **Build output directory:** `/` *(root)*
4. Click **Save and Deploy**.
5. *(Optional)* Cloudflare Pages Functions in [`functions/api/`](functions/api/) will automatically deploy to handle edge leaderboard requests via Cloudflare Workers (zero Python required).

### Option 2: Deploy to GitHub Pages
1. Go to your repository **Settings** $\rightarrow$ **Pages**.
2. Under **Build and deployment** $\rightarrow$ **Branch**, select `main` and root `/`.
3. Click **Save**. Your game will be live at `https://<username>.github.io/<repo>/`.

---

## 💻 Local Development & Testing

### Using Termux (Android)
A one-tap launcher script is included:
```bash
cd peek-a-boo-shooter
bash run.sh
```
Open `http://localhost:8080` in your browser.

### Using Python
```bash
python3 server.py 8080
```

### Using Node.js
```bash
npx serve .
```

---

## 📂 Project Structure

```
peek-a-boo-shooter/
├── index.html                  # Core HTML single-page app shell
├── favicon.svg                 # Vector game icon
├── leaderboard.json            # Local fallback snapshot for leaderboard
├── server.py                   # Lightweight local test server (Termux / dev only)
├── run.sh                      # One-tap shell launcher script
├── assets/
│   ├── multiplayer.js          # WebRTC P2P matchmaking & sync engine
│   ├── peerjs.min.js           # PeerJS WebRTC data channel library
│   ├── index-B8Gk-YR1.js       # Core game engine, physics, and state loop
│   ├── index-BzzhCrYK.css      # Retro stylesheet & responsive layout
│   ├── pixel_font_sprites_*.png# Game font sprite sheet with animation jitter
│   └── 100x100orig*.png        # Character animations & weapon icon sprites
└── functions/                  # Cloudflare Pages edge functions (JS only, 0 Python)
    └── api/
        ├── leaderboard.js      # Edge endpoint: GET /api/leaderboard
        └── players/score.js    # Edge endpoint: POST /api/players/score
```

---

## 📡 Multiplayer Architecture (WebRTC P2P)

```
[ Player 1 (Host) ]                             [ Player 2 (Peer) ]
        |                                                |
        |--- 1. Register Room Code (e.g. "BOO4") ------>| (PeerJS Free Signaling)
        |                                                |
        |<-- 2. Peer connects to Room Code -------------|
        |                                                |
        |================================================|
        |      Direct WebRTC DataChannel (No Server)     |
        |================================================|
        |                                                |
        |--- SHOOT / WEAPON_CONFIG (Instant P2P) ------->|
        |<-- OPPONENT_SHOOT / EMOJI (Instant P2P) -------|
        |                                                |
```

1. **Signaling:** Connection negotiation uses free public STUN/broker servers (`0.peerjs.com`) to exchange SDP offers and ICE candidates.
2. **Direct DataChannel:** Once connected, peer-to-peer data packets bypass all intermediate servers.
3. **State Resolution:** The host acts as the referee for round timers and hit resolution to ensure fair play across different network latencies.

---

## ⚖️ Attribution & Disclaimer

* **Original Concept & Art:** Based on *1 Button 2 Colours: Peek-a-Boo Shooter* created by [Jazzuo](https://1b2c.jazzuo.com/).
* **Non-Commercial Community Project:** All commercial links, donation prompts, and external monetization buttons have been intentionally removed. This project is shared strictly for educational, archival, and non-commercial community play.
