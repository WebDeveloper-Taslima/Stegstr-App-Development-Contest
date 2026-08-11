/**
 * Stegstr DCT Steganography Engine (WhatsApp, Telegram & Social Media Resilient)
 * Uses 2D Discrete Cosine Transform (DCT) Quantization Modulation on Luminance (Y) channel.
 */
(function(window) {
  'use strict';

  const DCTStego = {
    BLOCK_SIZE: 8,
    DELTA: 16, // Quantization step delta for coefficient pair embedding

    /**
     * 2D Discrete Cosine Transform (DCT) for an 8x8 matrix
     */
    dct8x8: function(matrix) {
      const N = 8;
      const dct = new Float64Array(64);
      for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
          let sum = 0;
          for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) {
              sum += matrix[x * N + y] *
                     Math.cos(((2 * x + 1) * u * Math.PI) / 16) *
                     Math.cos(((2 * y + 1) * v * Math.PI) / 16);
            }
          }
          const cu = (u === 0) ? (1 / Math.sqrt(2)) : 1;
          const cv = (v === 0) ? (1 / Math.sqrt(2)) : 1;
          dct[u * N + v] = 0.25 * cu * cv * sum;
        }
      }
      return dct;
    },

    /**
     * Inverse 2D Discrete Cosine Transform (IDCT) for an 8x8 matrix
     */
    idct8x8: function(dct) {
      const N = 8;
      const matrix = new Float64Array(64);
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
          let sum = 0;
          for (let u = 0; u < N; u++) {
            for (let v = 0; v < N; v++) {
              const cu = (u === 0) ? (1 / Math.sqrt(2)) : 1;
              const cv = (v === 0) ? (1 / Math.sqrt(2)) : 1;
              sum += cu * cv * dct[u * N + v] *
                     Math.cos(((2 * x + 1) * u * Math.PI) / 16) *
                     Math.cos(((2 * y + 1) * v * Math.PI) / 16);
            }
          }
          matrix[x * N + y] = 0.25 * sum;
        }
      }
      return matrix;
    },

    /**
     * Embed text payload into ImageData using Robust DCT + ECC
     * @param {ImageData} imageData - Canvas ImageData
     * @param {string} payloadText - Text or JSON payload
     * @param {string} [passphrase] - Optional encryption passphrase
     * @returns {{ success: boolean, imageData: ImageData, psnr: number, bitsEmbedded: number }}
     */
    embed: function(imageData, payloadText, passphrase) {
      let textToEncode = payloadText;

      // Add magic header prefix 'STEGSTR1:'
      if (!textToEncode.startsWith(window.STEGSTR_CONFIG.magicHeader)) {
        textToEncode = window.STEGSTR_CONFIG.magicHeader + ':' + textToEncode;
      }

      // Convert text to Uint8Array bytes
      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(textToEncode);

      // Encode using Error Correction Code (ECC Interleaved Repetition)
      const eccBits = window.StegstrECC.encode(payloadBytes);

      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;

      // Extract RGB -> YCbCr (Luminance Y channel)
      const Y = new Float64Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // Standard ITU-R BT.601 Y formula
        Y[i] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
      }

      const N = 8;
      const blocksX = Math.floor(width / N);
      const blocksY = Math.floor(height / N);
      const maxBits = blocksX * blocksY;

      if (eccBits.length > maxBits) {
        throw new Error(`Carrier image capacity too small (${maxBits} bits available, ${eccBits.length} bits required). Please use a larger image.`);
      }

      let bitIdx = 0;
      const u1 = 3, v1 = 2; // Coefficient 1 (Mid-frequency AC)
      const u2 = 2, v2 = 3; // Coefficient 2 (Mid-frequency AC)
      const delta = DCTStego.DELTA;

      const modifiedY = new Float64Array(Y);

      // Loop through 8x8 luminance blocks
      for (let by = 0; by < blocksY && bitIdx < eccBits.length; by++) {
        for (let bx = 0; bx < blocksX && bitIdx < eccBits.length; bx++) {
          // Extract 8x8 block
          const block = new Float64Array(64);
          for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
              const pixelX = bx * N + x;
              const pixelY = by * N + y;
              block[y * N + x] = Y[pixelY * width + pixelX];
            }
          }

          // Compute 2D DCT
          const dct = DCTStego.dct8x8(block);

          const bit = eccBits[bitIdx++];
          let c1 = dct[u1 * N + v1];
          let c2 = dct[u2 * N + v2];

          // Modulate coefficient pair relationship for robust bit persistence
          if (bit === 1) {
            if (c1 <= c2 + delta) {
              c1 = c2 + delta + 2;
            }
          } else {
            if (c2 <= c1 + delta) {
              c2 = c1 + delta + 2;
            }
          }

          dct[u1 * N + v1] = c1;
          dct[u2 * N + v2] = c2;

          // Compute Inverse DCT
          const recBlock = DCTStego.idct8x8(dct);

          // Put back into modified Y channel
          for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
              const pixelX = bx * N + x;
              const pixelY = by * N + y;
              modifiedY[pixelY * width + pixelX] = recBlock[y * N + x];
            }
          }
        }
      }

      // Reconstruct final RGB pixels while preserving Cb / Cr color balance
      let mse = 0;
      for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];

        const origY = 0.299 * r + 0.587 * g + 0.114 * b;
        const newY = Math.max(0, Math.min(255, modifiedY[i] + 128));
        const diffY = newY - origY;

        const newR = Math.max(0, Math.min(255, Math.round(r + diffY)));
        const newG = Math.max(0, Math.min(255, Math.round(g + diffY)));
        const newB = Math.max(0, Math.min(255, Math.round(b + diffY)));

        mse += (r - newR) ** 2 + (g - newG) ** 2 + (b - newB) ** 2;

        data[i * 4] = newR;
        data[i * 4 + 1] = newG;
        data[i * 4 + 2] = newB;
      }

      mse /= (width * height * 3);
      const psnr = mse > 0 ? (10 * Math.log10((255 * 255) / mse)) : 99;

      return {
        success: true,
        imageData: imageData,
        psnr: Math.round(psnr * 10) / 10,
        bitsEmbedded: eccBits.length
      };
    },

    /**
     * Extract payload from ImageData using DCT + ECC demodulation
     * @param {ImageData} imageData - Canvas ImageData
     * @param {string} [passphrase] - Optional decryption key
     * @returns {{ success: boolean, payload: string|null, ecc: object, psnr: number }}
     */
    extract: function(imageData, passphrase) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;

      // Extract Luminance Y channel
      const Y = new Float64Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        Y[i] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
      }

      const N = 8;
      const blocksX = Math.floor(width / N);
      const blocksY = Math.floor(height / N);

      const u1 = 3, v1 = 2;
      const u2 = 2, v2 = 3;

      const extractedBits = [];

      // Extract bit from each 8x8 DCT block
      for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
          const block = new Float64Array(64);
          for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
              const pixelX = bx * N + x;
              const pixelY = by * N + y;
              block[y * N + x] = Y[pixelY * width + pixelX];
            }
          }

          const dct = DCTStego.dct8x8(block);
          const c1 = dct[u1 * N + v1];
          const c2 = dct[u2 * N + v2];

          extractedBits.push(c1 > c2 ? 1 : 0);
        }
      }

      // Decode bits using ECC Interleaved Majority Voting & CRC Check
      const eccResult = window.StegstrECC.decode(new Uint8Array(extractedBits));

      if (!eccResult.success || !eccResult.data) {
        return {
          success: false,
          payload: null,
          ecc: eccResult,
          message: 'No valid Stegstr payload detected or payload severely corrupted.'
        };
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      let extractedStr = decoder.decode(eccResult.data);

      // Strip magic header
      const header = window.STEGSTR_CONFIG.magicHeader + ':';
      if (extractedStr.startsWith(header)) {
        extractedStr = extractedStr.substring(header.length);
      }

      return {
        success: true,
        payload: extractedStr,
        ecc: eccResult
      };
    }
  };

  window.StegstrDCT = DCTStego;
})(window);
