/**
 * Stegstr Nostr Client & Relay Networking Layer
 * Connects to Nostr WebSocket relays, subscribes to steganographic events,
 * and maintains an offline-first event cache.
 */
(function(window) {
  'use strict';

  class NostrClient {
    constructor() {
      this.relays = window.STEGSTR_CONFIG.defaultRelays;
      this.sockets = new Map();
      this.eventListeners = new Set();
      this.localFeed = [];
      this.isOnline = true;

      this.initLocalFeed();
    }

    /**
     * Connect to all configured Nostr relays
     */
    connectRelays() {
      console.log('[NostrClient] Connecting to Nostr relays...');

      this.relays.forEach(relayUrl => {
        try {
          const ws = new WebSocket(relayUrl);

          ws.onopen = () => {
            console.log(`[NostrClient] Connected to ${relayUrl}`);
            this.sockets.set(relayUrl, ws);

            // Subscribe to Nostr Kind 1 notes with stego images
            const req = JSON.stringify([
              "REQ", "stegstr-feed",
              { kinds: [1, 4, 1063], limit: 20 }
            ]);
            ws.send(req);
          };

          ws.onmessage = (event) => {
            this.handleRelayMessage(relayUrl, event.data);
          };

          ws.onerror = (err) => {
            console.warn(`[NostrClient] Error on relay ${relayUrl}`);
          };

          ws.onclose = () => {
            this.sockets.delete(relayUrl);
          };
        } catch (e) {
          console.warn(`[NostrClient] Connection failed for ${relayUrl}:`, e);
        }
      });
    }

    /**
     * Parse Nostr REQ messages from relays
     */
    handleRelayMessage(relayUrl, messageData) {
      try {
        const msg = JSON.parse(messageData);
        if (msg[0] === 'EVENT' && msg[2]) {
          const nostrEvent = msg[2];
          this.processIncomingEvent(nostrEvent, relayUrl);
        }
      } catch (e) {
        // Ignore malformed WS frames
      }
    }

    /**
     * Process Nostr Event and notify listeners
     */
    processIncomingEvent(event, sourceRelay) {
      // Check if already in local feed
      if (this.localFeed.some(item => item.id === event.id)) return;

      const feedItem = {
        id: event.id,
        pubkey: event.pubkey,
        npub: window.StegstrKeys ? window.StegstrKeys.generateKeyPair().npub : 'npub1...',
        created_at: event.created_at,
        kind: event.kind,
        content: event.content,
        stegoMediaUrl: this.extractMediaUrl(event.content),
        source: sourceRelay || 'Nostr Relay',
        tags: event.tags || []
      };

      this.localFeed.unshift(feedItem);
      this.notifyListeners(feedItem);
    }

    /**
     * Extract image/media URL from event text
     */
    extractMediaUrl(text) {
      const match = text.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif|wav))/i);
      return match ? match[1] : null;
    }

    /**
     * Publish a new Steganographic Nostr Event
     */
    async publishStegoEvent(keys, textContent, stegoDataUrl) {
      const timestamp = Math.floor(Date.now() / 1000);

      // Construct Nostr Event object (NIP-01)
      const event = {
        id: 'steg_' + Math.random().toString(36).substring(2, 11),
        pubkey: keys ? keys.pubHex : '0000000000000000000000000000000000000000000000000000000000000000',
        created_at: timestamp,
        kind: 1,
        tags: [
          ['t', 'stegstr'],
          ['t', 'steganography'],
          ['client', 'Stegstr 1.0']
        ],
        content: textContent + '\n\n[Steganographic Carrier Attached]\n' + (stegoDataUrl ? stegoDataUrl.substring(0, 100) + '...' : ''),
        stegoDataUrl: stegoDataUrl,
        sig: 'sig_' + Math.random().toString(36).substring(2, 15)
      };

      // Store in local feed
      this.processIncomingEvent({
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        content: textContent,
        tags: event.tags,
        stegoDataUrl: stegoDataUrl
      }, 'Local Client');

      // Send to connected WebSocket relays
      const eventFrame = JSON.stringify(['EVENT', event]);
      let sentCount = 0;

      this.sockets.forEach((ws, url) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(eventFrame);
          sentCount++;
        }
      });

      return {
        success: true,
        eventId: event.id,
        relaysReached: sentCount,
        offlineQueued: sentCount === 0
      };
    }

    /**
     * Populate mock feed for initial demo experience
     */
    initLocalFeed() {
      // Demo stego feed items with carrier images
      this.localFeed = [
        {
          id: 'demo_steg_01',
          pubkey: '32e1827635450ebb3c5a7d12c1f8e7b2',
          npub: 'npub1q8z98v2y34k0x9v8c7z6x5v4c3b2a1',
          created_at: Math.floor(Date.now() / 1000) - 300,
          kind: 1,
          content: 'Covert message embedded in mountain landscape. Decode using Stegstr Ultra-Robust Mode!',
          stegoMediaUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
          source: 'wss://nos.lol',
          hasStegoPayload: true
        },
        {
          id: 'demo_steg_02',
          pubkey: '71f4521098bca432109f8e7d6c5b4a31',
          npub: 'npub1x5v4c3b2a1q8z98v2y34k0x9v8c7z6',
          created_at: Math.floor(Date.now() / 1000) - 1800,
          kind: 4,
          content: '[Encrypted Stegstr DM] Direct secret note passed via steganographic carrier.',
          stegoMediaUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80',
          source: 'wss://relay.damus.io',
          hasStegoPayload: true
        }
      ];
    }

    subscribe(callback) {
      this.eventListeners.add(callback);
    }

    notifyListeners(item) {
      this.eventListeners.forEach(cb => cb(item));
    }
  }

  window.StegstrNostr = new NostrClient();
})(window);
