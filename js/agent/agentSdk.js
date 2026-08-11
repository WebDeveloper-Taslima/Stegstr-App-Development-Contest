/**
 * Stegstr AI Agent SDK (`agentSdk.js`)
 * Programmatic JavaScript SDK for AI Agents to execute steganographic operations,
 * Nostr relay synchronization, and robustness validation.
 */
(function(window) {
  'use strict';

  class StegstrAgentSDK {
    constructor() {
      this.version = '1.0.0';
      this.specUri = '/.well-known/agent.json';
    }

    /**
     * Programmatically embed a payload into a carrier image
     * @param {Object} options
     * @param {string|HTMLCanvasElement|ImageData} options.carrier - Image source
     * @param {string} options.payload - Text or JSON payload
     * @param {string} [options.mode='robust'] - 'robust' (DCT+ECC for WhatsApp) or 'lossless' (PNG LSB)
     * @param {string} [options.passphrase] - Optional AES key
     * @returns {Promise<{ success: boolean, stegoDataUrl: string, psnr: number, bitsEmbedded: number }>}
     */
    async embed(options) {
      const mode = options.mode || window.STEGSTR_CONFIG.stegoModes.ROBUST;
      const passphrase = options.passphrase;
      let textPayload = options.payload;

      if (!options.carrier) {
        throw new Error('AgentSDK.embed: carrier image missing.');
      }
      if (!textPayload) {
        throw new Error('AgentSDK.embed: payload missing.');
      }

      // Encrypt if passphrase supplied
      if (passphrase && window.StegstrCrypto) {
        textPayload = await window.StegstrCrypto.encrypt(textPayload, passphrase);
      }

      // Load carrier image to canvas
      const canvas = await this._getCanvasFromSource(options.carrier);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let result;
      if (mode === window.STEGSTR_CONFIG.stegoModes.ROBUST) {
        result = window.StegstrDCT.embed(imageData, textPayload);
      } else {
        result = window.StegstrLSB.embed(imageData, textPayload);
      }

      ctx.putImageData(result.imageData, 0, 0);
      const stegoDataUrl = canvas.toDataURL(mode === 'robust' ? 'image/jpeg' : 'image/png', 0.95);

      return {
        success: true,
        mode: mode,
        stegoDataUrl: stegoDataUrl,
        psnr: result.psnr,
        bitsEmbedded: result.bitsEmbedded,
        width: canvas.width,
        height: canvas.height
      };
    }

    /**
     * Programmatically extract payload from stego image
     * @param {Object} options
     * @param {string|HTMLCanvasElement|ImageData} options.stegoImage
     * @param {string} [options.passphrase]
     * @returns {Promise<{ success: boolean, payload: string|null, ecc: object }>}
     */
    async extract(options) {
      if (!options.stegoImage) {
        throw new Error('AgentSDK.extract: stegoImage missing.');
      }

      const canvas = await this._getCanvasFromSource(options.stegoImage);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Try DCT extraction first (WhatsApp robust mode), then fallback to LSB
      let result = window.StegstrDCT.extract(imageData);

      if (!result.success) {
        result = window.StegstrLSB.extract(imageData);
      }

      if (result.success && result.payload) {
        if (result.payload.startsWith('ENC:') && options.passphrase && window.StegstrCrypto) {
          result.payload = await window.StegstrCrypto.decrypt(result.payload, options.passphrase);
        }
      }

      return result;
    }

    /**
     * Programmatically test steganographic robustness against social platforms
     */
    async testRobustness(stegoCanvas, platformKey = 'whatsapp') {
      const simResult = await window.StegstrSimulator.simulatePlatform(stegoCanvas, platformKey);
      const extractResult = window.StegstrDCT.extract(simResult.imageData);

      return {
        platform: platformKey,
        simulatedSize: simResult.fileSize,
        extractedSuccessfully: extractResult.success,
        recoveredPayload: extractResult.payload,
        eccErrorRate: extractResult.ecc ? extractResult.ecc.errorRate : 0
      };
    }

    /**
     * Helper to resolve Image, DataURL, or Canvas into HTMLCanvasElement
     */

    _getCanvasFromSource(source) {
      return new Promise((resolve, reject) => {
        if (source instanceof HTMLCanvasElement) {
          resolve(source);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas);
        };
        img.onerror = (e) => reject(new Error('Failed to load carrier image source.'));

        if (typeof source === 'string') {
          img.src = source;
        } else if (source instanceof ImageData) {
          const canvas = document.createElement('canvas');
          canvas.width = source.width;
          canvas.height = source.height;
          canvas.getContext('2d').putImageData(source, 0, 0);
          resolve(canvas);
        } else {
          reject(new Error('Unsupported source format for carrier image.'));
        }
      });
    }
  }

  window.StegstrAgentSDK = new StegstrAgentSDK();
})(window);
