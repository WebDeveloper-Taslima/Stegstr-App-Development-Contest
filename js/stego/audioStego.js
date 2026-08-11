/**
 * Stegstr Audio Steganography Engine (Extra Value Feature)
 * Embeds encrypted payloads into 16-bit PCM WAV audio carriers using LSB phase modulation.
 */
(function(window) {
  'use strict';

  const AudioStego = {
    embedWav: function(wavArrayBuffer, payloadText) {
      let text = payloadText;
      if (!text.startsWith(window.STEGSTR_CONFIG.magicHeader)) {
        text = window.STEGSTR_CONFIG.magicHeader + ':' + text;
      }

      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(text);

      const dataView = new DataView(wavArrayBuffer.slice(0));
      const headerLength = 44; // Standard WAV PCM header

      if (dataView.byteLength <= headerLength + (payloadBytes.length + 4) * 8 * 2) {
        throw new Error('Audio file duration too short for payload.');
      }

      // Embed length (32 bits)
      const len = payloadBytes.length;
      let bitIdx = 0;

      for (let b = 0; b < 32; b++) {
        const bitVal = (len >> (31 - b)) & 1;
        const bytePos = headerLength + bitIdx * 2;
        let sample = dataView.getInt16(bytePos, true);
        sample = (sample & 0xFFFE) | bitVal;
        dataView.setInt16(bytePos, sample, true);
        bitIdx++;
      }

      // Embed payload bytes
      for (let i = 0; i < payloadBytes.length; i++) {
        const byte = payloadBytes[i];
        for (let b = 0; b < 8; b++) {
          const bitVal = (byte >> (7 - b)) & 1;
          const bytePos = headerLength + bitIdx * 2;
          let sample = dataView.getInt16(bytePos, true);
          sample = (sample & 0xFFFE) | bitVal;
          dataView.setInt16(bytePos, sample, true);
          bitIdx++;
        }
      }

      return {
        success: true,
        buffer: dataView.buffer,
        samplesUsed: bitIdx
      };
    },

    extractWav: function(wavArrayBuffer) {
      const dataView = new DataView(wavArrayBuffer);
      const headerLength = 44;

      if (dataView.byteLength < headerLength + 64) {
        return { success: false, payload: null };
      }

      let len = 0;
      for (let b = 0; b < 32; b++) {
        const bytePos = headerLength + b * 2;
        const sample = dataView.getInt16(bytePos, true);
        const bitVal = sample & 1;
        len = (len << 1) | bitVal;
      }

      if (len <= 0 || len > 100000) {
        return { success: false, payload: null, message: 'No valid audio stego payload.' };
      }

      const payloadBytes = new Uint8Array(len);
      let bitIdx = 32;

      for (let i = 0; i < len; i++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) {
          const bytePos = headerLength + bitIdx * 2;
          const sample = dataView.getInt16(bytePos, true);
          const bitVal = sample & 1;
          byte = (byte << 1) | bitVal;
          bitIdx++;
        }
        payloadBytes[i] = byte;
      }

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

  window.StegstrAudio = AudioStego;
})(window);
