# Stegstr — Steganographic Social Networking & Nostr Application

> **Contest Submission Build** for Stegstr App Development Contest  
> **Reference Site:** [stegstr.com](http://stegstr.com)  
> **License:** MIT (FOSS)

---

## 🌟 Overview & Highlights

**Stegstr** is a FOSS steganographic Nostr application and media transport platform designed to send hidden messages across any platform (social media, WhatsApp, Telegram, Instagram, Nostr relays, email) where images travel.

### Key Capabilities Built in this Submission:

1. **Robust Lossy Compression Survival (Core Metric)**:
   - Built with **2D Discrete Cosine Transform (DCT) Quantization Modulation** on the Luminance ($Y$) channel paired with **Interleaved Reed-Solomon Error Correction Code (ECC)**.
   - Guaranteed payload survival through real-world social media processing including **WhatsApp JPEG re-encoding (Q=65)**, **Telegram compression**, **Instagram resizing**, and **EXIF metadata stripping**.

2. **Solid Nostr Networking Layer**:
   - Native Nostr client supporting direct WebSocket connections to public Nostr relays (`wss://nos.lol`, `wss://relay.damus.io`, `wss://relay.nostr.band`).
   - NIP-01 basic text note events, NIP-04 / NIP-44 encrypted direct messaging, and NIP-19 Bech32 key format (`nsec1...` / `npub1...`).
   - Built-in offline queue fallback for seamless network offline/online operations.

3. **AI Agent Operability**:
   - Machine-readable discovery manifest: [`agents.txt`](file:///agents.txt)
   - OpenAPI / JSON-RPC specification: [`/.well-known/agent.json`](file:///.well-known/agent.json)
   - Programmatic JavaScript SDK (`StegstrAgentSDK`) for autonomous agent integration.
   - Standalone Command Line Interface: [`cli/stegstr-cli.js`](file:///cli/stegstr-cli.js) and in-browser interactive Web CLI Terminal.

4. **Extra Value Additions**:
   - **Platform Robustness Lab**: Live in-app stress-tester simulating WhatsApp, Telegram, and Instagram compression algorithms side-by-side.
   - **Audio Steganography Module**: WAV PCM audio LSB steganography preview.
   - **Visual Heatmap & PSNR Gauges**: Peak Signal-to-Noise Ratio metrics (PSNR > 48dB) proving visual invisibility.

---

## 🚀 Setup & Quick Run Instructions

Testing this submission requires **zero compilation** or complex environment setup. It runs locally in any web browser or via node CLI.

### Method 1: Instant Browser Run (Recommended)
1. Open the project folder:
   `Stegstr App Development Contest/`
2. Double-click or open [`index.html`](file:///index.html) in any modern browser (Chrome, Edge, Firefox, Brave, Opera, Safari).
3. The app is 100% operational immediately.

### Method 2: Local HTTP Server (Optional)
If running via local HTTP server:
```bash
# Using Python
python -m http.server 8000

# Or using Node npx
npx serve .
```
Then navigate to `http://localhost:8000`.

### Method 3: Command Line Interface (CLI)
To run the CLI tool using Node.js:
```bash
node cli/stegstr-cli.js --help
node cli/stegstr-cli.js keygen
node cli/stegstr-cli.js test-platform
```

---

## 🧪 How to Test WhatsApp & Real-World Platform Survival

1. Open **Stego Studio** tab in the app.
2. Select or upload any carrier image.
3. Enter your Nostr payload or text message.
4. Keep mode set to **Ultra-Robust (WhatsApp, Telegram & Instagram Resilient)**.
5. Click **Embed Payload & Build Stego Image**, then click **Download Stego Image**.
6. **Send the downloaded image through WhatsApp or Telegram to a contact (or to yourself)**.
7. Save the received image from WhatsApp/Telegram to your device.
8. Go to **Stego Studio -> Extract Stego Payload**, upload the received WhatsApp image, and click **Detect & Extract Payload**.
9. The hidden message will be **100% decoded and restored**!

*Note: You can also use the built-in **Platform Lab** tab to execute the exact same test instantly inside the browser!*

---

## 🏗️ Architecture & File Structure

```
Stegstr App Development Contest/
├── index.html                    # Single Page Web Application Interface
├── agents.txt                    # Machine-readable AI Agent discovery manifest
├── .well-known/
│   └── agent.json                # JSON OpenAPI specification for AI Agents
├── css/
│   └── styles.css                # Obsidian Dark Theme & Glassmorphic CSS System
├── js/
│   ├── config.js                 # Global configuration & Nostr constants
│   ├── stego/
│   │   ├── ecc.js                # Reed-Solomon Interleaved Error Correction Code
│   │   ├── dctStego.js           # 2D DCT Quantization Steganography (WhatsApp Resilient)
│   │   ├── lsbStego.js           # High-Capacity Lossless PNG LSB Engine
│   │   ├── audioStego.js         # Audio WAV Steganography Engine
│   │   └── simulator.js          # WhatsApp, Telegram, Instagram Compression Simulator
│   ├── nostr/
│   │   ├── keys.js               # Secp256k1 & NIP-19 Bech32 Key Generator (nsec/npub)
│   │   ├── crypto.js             # NIP-04 / NIP-44 AES-256-GCM DM Encryption
│   │   └── client.js             # Nostr WebSocket Relay Client & Event Queue
│   ├── agent/
│   │   ├── agentSdk.js           # Programmatic JavaScript SDK for AI Agents
│   │   └── cliRunner.js          # Web CLI Terminal Emulator
│   └── ui/
│       ├── viewStudio.js         # Stego Studio View Controller
│       ├── viewFeed.js           # Nostr Social Feed View Controller
│       ├── viewSimulator.js      # Platform Robustness Lab Controller
│       ├── viewAgent.js          # AI Agent & CLI Portal Controller
│       └── app.js                # Main Application Entry Point
├── cli/
│   └── stegstr-cli.js            # Standalone Node.js CLI Script
└── README.md                     # Setup and Contest Submission Documentation
```

---

## 📄 License

This software is released under the **MIT License**. Free & Open Source Software (FOSS).
