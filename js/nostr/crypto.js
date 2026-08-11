/**
 * Stegstr Nostr Crypto Engine (NIP-04 & NIP-44 Encrypted Payload Transport)
 */
(function(window) {
  'use strict';

  const CryptoEngine = {
    /**
     * Encrypt text message using Web Crypto AES-256-GCM and passphrase / shared secret
     */
    encrypt: async function(plainText, passphrase) {
      if (!passphrase) return plainText;

      const enc = new TextEncoder();
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await window.crypto.subtle.importKey(
        'raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(plainText)
      );

      const resultBytes = new Uint8Array(16 + 12 + encrypted.byteLength);
      resultBytes.set(salt, 0);
      resultBytes.set(iv, 16);
      resultBytes.set(new Uint8Array(encrypted), 28);

      return 'ENC:' + btoa(String.fromCharCode.apply(null, resultBytes));
    },

    /**
     * Decrypt AES-256-GCM encrypted payload
     */
    decrypt: async function(encryptedText, passphrase) {
      if (!encryptedText.startsWith('ENC:')) return encryptedText;
      if (!passphrase) throw new Error('Decryption passphrase required.');

      const base64Str = encryptedText.substring(4);
      const rawStr = atob(base64Str);
      const bytes = new Uint8Array(rawStr.length);
      for (let i = 0; i < rawStr.length; i++) {
        bytes[i] = rawStr.charCodeAt(i);
      }

      const salt = bytes.subarray(0, 16);
      const iv = bytes.subarray(16, 28);
      const data = bytes.subarray(28);

      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

      const dec = new TextDecoder();
      return dec.decode(decrypted);
    }
  };

  window.StegstrCrypto = CryptoEngine;
})(window);
