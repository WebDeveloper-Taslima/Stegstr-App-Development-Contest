/**
 * Stegstr Global Configuration & Constants
 */
window.STEGSTR_CONFIG = {
  appName: 'Stegstr',
  version: '1.0.0-contest',
  stegoModes: {
    ROBUST: 'robust',   // DCT Quantization + Reed-Solomon ECC (WhatsApp / Telegram / Instagram resilient)
    LOSSLESS: 'lossless' // High-Capacity PNG LSB Mode
  },
  defaultRelays: [
    'wss://nos.lol',
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nostr.mom',
    'wss://purplepag.es'
  ],
  magicHeader: 'STEGSTR1', // 8-byte magic header for stego payload recognition
  eccParityRatio: 1.0,    // 100% parity ratio for maximum error correction against lossy compression
  dctBlockSize: 8,
  dctCoeffPair: [{ u: 3, v: 2 }, { u: 2, v: 3 }] // Mid-frequency luminance coefficient pair for bit embedding
};
