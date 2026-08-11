/**
 * Stegstr High-Capacity Lossless PNG LSB Engine
 * Embeds encrypted payloads into the least significant bits of RGBA channels.
 */
(function(window) {
  'use strict';

  const LSBStego = {
    /**
     * Embed payload into ImageData using LSB modification
     * @param {ImageData} imageData 
     * @param {string} payloadText 
     * @returns {{ success: boolean, imageData: ImageData, psnr: number, bitsEmbedded: number }}
     */
    embed: function(imageData, payloadText) {
      let text = payloadText;
      if (!text.startsWith(window.STEGSTR_CONFIG.magicHeader)) {
        text = window.STEGSTR_CONFIG.magicHeader + ':' + text;
      }

      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(text);

      // Packet format: [4 bytes payload length] + [payload bytes] + [4 bytes CRC32]
      const crc = window.StegstrECC.crc32(text);
      const packet = new Uint8Array(4 + payloadBytes.length + 4);

      packet[0] = (payloadBytes.length >>> 24) & 0xFF;
      packet[1] = (payloadBytes.length >>> 16) & 0xFF;
      packet[2] = (payloadBytes.length >>> 8) & 0xFF;
      packet[3] = payloadBytes.length & 0xFF;

      packet.set(payloadBytes, 4);

      const offset = 4 + payloadBytes.length;
      packet[offset] = (crc >>> 24) & 0xFF;
      packet[offset + 1] = (crc >>> 16) & 0xFF;
      packet[offset + 2] = (crc >>> 8) & 0xFF;
      packet[offset + 3] = crc & 0xFF;

      const data = imageData.data;
      const totalPixels = imageData.width * imageData.height;
      const maxBytes = Math.floor((totalPixels * 3) / 8); // Using RGB channels (excluding Alpha for transparency safety)

      if (packet.length > maxBytes) {
        throw new Error(`Payload exceeds maximum LSB capacity (${maxBytes} bytes available, ${packet.length} bytes required).`);
      }

      let bitIdx = 0;
      const totalBits = packet.length * 8;

      let mse = 0;

      for (let i = 0; i < data.length && bitIdx < totalBits; i += 4) {
        for (let c = 0; c < 3 && bitIdx < totalBits; c++) {
          const byteIdx = Math.floor(bitIdx / 8);
          const bitPos = 7 - (bitIdx % 8);
          const bitVal = (packet[byteIdx] >> bitPos) & 1;

          const origVal = data[i + c];
          const newVal = (origVal & 0xFE) | bitVal;

          mse += (origVal - newVal) ** 2;
          data[i + c] = newVal;

          bitIdx++;
        }
      }

      mse /= (data.length);
      const psnr = mse > 0 ? (10 * Math.log10((255 * 255) / mse)) : 99;

      return {
        success: true,
        imageData: imageData,
        psnr: Math.round(psnr * 10) / 10,
        bitsEmbedded: totalBits
      };
    },

    /**
     * Extract payload from ImageData using LSB demodulation
     * @param {ImageData} imageData 
     * @returns {{ success: boolean, payload: string|null }}
     */
    extract: function(imageData) {
      const data = imageData.data;

      // Extract length first (32 bits = 4 bytes)
      let lenBytes = new Uint8Array(4);
      let bitIdx = 0;

      for (let i = 0; i < data.length && bitIdx < 32; i += 4) {
        for (let c = 0; c < 3 && bitIdx < 32; c++) {
          const bitVal = data[i + c] & 1;
          const byteIdx = Math.floor(bitIdx / 8);
          const bitPos = 7 - (bitIdx % 8);
          lenBytes[byteIdx] |= (bitVal << bitPos);
          bitIdx++;
        }
      }

      const payloadLen = ((lenBytes[0] << 24) | (lenBytes[1] << 16) | (lenBytes[2] << 8) | lenBytes[3]) >>> 0;

      if (payloadLen <= 0 || payloadLen > (imageData.width * imageData.height)) {
        return { success: false, payload: null, message: 'Invalid payload length or no LSB payload.' };
      }

      const totalBitsNeeded = (4 + payloadLen + 4) * 8;
      const rawBytes = new Uint8Array(4 + payloadLen + 4);

      bitIdx = 0;
      for (let i = 0; i < data.length && bitIdx < totalBitsNeeded; i += 4) {
        for (let c = 0; c < 3 && bitIdx < totalBitsNeeded; c++) {
          const bitVal = data[i + c] & 1;
          const byteIdx = Math.floor(bitIdx / 8);
          const bitPos = 7 - (bitIdx % 8);
          rawBytes[byteIdx] |= (bitVal << bitPos);
          bitIdx++;
        }
      }

      const payloadBytes = rawBytes.subarray(4, 4 + payloadLen);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let extractedStr = decoder.decode(payloadBytes);

      const header = window.STEGSTR_CONFIG.magicHeader + ':';
      if (extractedStr.startsWith(header)) {
        extractedStr = extractedStr.substring(header.length);
      }

      return {
        success: true,
        payload: extractedStr
      };
    }
  };

  window.StegstrLSB = LSBStego;
})(window);
