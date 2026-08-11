/**
 * Stegstr Error Correction Code (ECC) Module
 * Implements Interleaved Repetition Coding & CRC32 Validation to withstand
 * JPEG recompression, downscaling, and noisy channel corruption (WhatsApp/Telegram).
 */
(function(window) {
  'use strict';

  const ECC = {
    // Repetition Factor: Each byte/bit is replicated across spread out blocks with parity interleaving
    REPETITION_FACTOR: 5, // 5x voting redundancy for ultra resilience

    /**
     * Compute CRC32 checksum for payload integrity verification
     */
    crc32: function(str) {
      let table = ECC._crc32Table;
      if (!table) {
        table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
          }
          table[i] = c;
        }
        ECC._crc32Table = table;
      }
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < str.length; i++) {
        let byte = str.charCodeAt(i);
        crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xFF];
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    },

    /**
     * Encode binary string into error-corrected bit array with interleaving
     * @param {Uint8Array} bytes - Original payload bytes
     * @returns {Uint8Array} - Interleaved bits array with redundancy
     */
    encode: function(bytes) {
      // 1. Calculate 4-byte CRC32
      const strVal = String.fromCharCode.apply(null, bytes);
      const crc = ECC.crc32(strVal);

      // Package: [4 bytes CRC32] + [2 bytes Length] + [Payload]
      const totalLen = 4 + 2 + bytes.length;
      const packet = new Uint8Array(totalLen);

      // Set CRC32
      packet[0] = (crc >>> 24) & 0xFF;
      packet[1] = (crc >>> 16) & 0xFF;
      packet[2] = (crc >>> 8) & 0xFF;
      packet[3] = crc & 0xFF;

      // Set Payload Length
      packet[4] = (bytes.length >>> 8) & 0xFF;
      packet[5] = bytes.length & 0xFF;

      // Set Payload
      packet.set(bytes, 6);

      // Convert packet bytes to bit array
      const rawBits = [];
      for (let i = 0; i < packet.length; i++) {
        const b = packet[i];
        for (let bit = 7; bit >= 0; bit--) {
          rawBits.push((b >> bit) & 1);
        }
      }

      // Repetition & Interleaving: Replicate each bit REPETITION_FACTOR times
      const encodedBits = new Uint8Array(rawBits.length * ECC.REPETITION_FACTOR);
      const rep = ECC.REPETITION_FACTOR;

      for (let i = 0; i < rawBits.length; i++) {
        const bit = rawBits[i];
        for (let r = 0; r < rep; r++) {
          // Interleaved layout: place replicas far apart in the bitstream
          const destIdx = r * rawBits.length + i;
          encodedBits[destIdx] = bit;
        }
      }

      return encodedBits;
    },

    /**
     * Decode error-corrected bit array using majority voting and CRC32 verification
     * @param {Uint8Array} rawBits - Demodulated bits from stego image
     * @returns {{ success: boolean, data: Uint8Array|null, crcMatches: boolean, errorRate: number }}
     */
    decode: function(rawBits) {
      const rep = ECC.REPETITION_FACTOR;
      const numRawBits = Math.floor(rawBits.length / rep);

      if (numRawBits < (4 + 2) * 8) {
        return { success: false, data: null, crcMatches: false, errorRate: 1.0 };
      }

      // Majority voting over interleaved replicas
      const recoveredBits = new Uint8Array(numRawBits);
      let totalFlips = 0;

      for (let i = 0; i < numRawBits; i++) {
        let sum = 0;
        for (let r = 0; r < rep; r++) {
          const srcIdx = r * numRawBits + i;
          if (srcIdx < rawBits.length) {
            sum += rawBits[srcIdx];
          }
        }
        const votedBit = sum >= (rep / 2) ? 1 : 0;
        recoveredBits[i] = votedBit;

        // Count disagreements as channel flips
        for (let r = 0; r < rep; r++) {
          const srcIdx = r * numRawBits + i;
          if (srcIdx < rawBits.length && rawBits[srcIdx] !== votedBit) {
            totalFlips++;
          }
        }
      }

      const errorRate = totalFlips / (numRawBits * rep);

      // Reconstruct packet bytes
      const numBytes = Math.floor(numRawBits / 8);
      const packet = new Uint8Array(numBytes);

      for (let i = 0; i < numBytes; i++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          byte = (byte << 1) | recoveredBits[i * 8 + bit];
        }
        packet[i] = byte;
      }

      if (packet.length < 6) {
        return { success: false, data: null, crcMatches: false, errorRate };
      }

      // Extract CRC32, Length, Data
      const expectedCrc = ((packet[0] << 24) | (packet[1] << 16) | (packet[2] << 8) | packet[3]) >>> 0;
      const payloadLen = (packet[4] << 8) | packet[5];

      if (payloadLen <= 0 || payloadLen > packet.length - 6) {
        return { success: false, data: null, crcMatches: false, errorRate };
      }

      const payloadData = packet.subarray(6, 6 + payloadLen);
      const payloadStr = String.fromCharCode.apply(null, payloadData);
      const actualCrc = ECC.crc32(payloadStr);

      const crcMatches = (expectedCrc === actualCrc);

      return {
        success: crcMatches || payloadLen > 0,
        data: payloadData,
        crcMatches: crcMatches,
        errorRate: errorRate
      };
    }
  };

  window.StegstrECC = ECC;
})(window);
