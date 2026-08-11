/**
 * Stegstr Nostr Key & Bech32 (NIP-19) Utility Module
 */
(function(window) {
  'use strict';

  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

  function polymod(values) {
    let chk = 1;
    for (let p = 0; p < values.length; ++p) {
      const top = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ values[p];
      for (let i = 0; i < 5; ++i) {
        if ((top >> i) & 1) {
          chk ^= [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3][i];
        }
      }
    }
    return chk;
  }

  function hrpExpand(hrp) {
    const ret = [];
    for (let p = 0; p < hrp.length; ++p) {
      ret.push(hrp.charCodeAt(p) >> 5);
    }
    ret.push(0);
    for (let p = 0; p < hrp.length; ++p) {
      ret.push(hrp.charCodeAt(p) & 31);
    }
    return ret;
  }

  function createChecksum(hrp, data) {
    const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    const mod = polymod(values) ^ 1;
    const ret = [];
    for (let p = 0; p < 6; ++p) {
      ret.push((mod >> (5 * (5 - p))) & 31);
    }
    return ret;
  }

  function encodeBech32(hrp, bytes) {
    // Convert 8-bit bytes to 5-bit array
    const data5 = [];
    let acc = 0;
    let bits = 0;
    for (let i = 0; i < bytes.length; i++) {
      acc = (acc << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        data5.push((acc >> bits) & 31);
      }
    }
    if (bits > 0) {
      data5.push((acc << (5 - bits)) & 31);
    }

    const combined = data5.concat(createChecksum(hrp, data5));
    let ret = hrp + '1';
    for (let p = 0; p < combined.length; ++p) {
      ret += CHARSET.charAt(combined[p]);
    }
    return ret;
  }

  function decodeBech32(bechString) {
    const pos = bechString.lastIndexOf('1');
    if (pos < 1 || pos + 7 > bechString.length || bechString.length > 90) return null;
    const hrp = bechString.substring(0, pos);
    const data = [];
    for (let p = pos + 1; p < bechString.length; ++p) {
      const d = CHARSET.indexOf(bechString.charAt(p));
      if (d === -1) return null;
      data.push(d);
    }
    // Convert 5-bit to 8-bit
    const data5 = data.slice(0, data.length - 6);
    let acc = 0;
    let bits = 0;
    const bytes = [];
    for (let i = 0; i < data5.length; i++) {
      acc = (acc << 5) | data5[i];
      bits += 5;
      while (bits >= 8) {
        bits -= 8;
        bytes.push((acc >> bits) & 0xFF);
      }
    }
    return { hrp: hrp, bytes: new Uint8Array(bytes) };
  }

  function bufToHex(buffer) {
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  const NostrKeys = {
    /**
     * Generate a new random Nostr keypair
     */
    generateKeyPair: function() {
      const privBytes = new Uint8Array(32);
      window.crypto.getRandomValues(privBytes);
      const privHex = bufToHex(privBytes);

      // Derive public key hash (secp256k1 mock / x-only pubkey)
      const pubBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        pubBytes[i] = privBytes[31 - i] ^ (i * 7);
      }
      const pubHex = bufToHex(pubBytes);

      const nsec = encodeBech32('nsec', privBytes);
      const npub = encodeBech32('npub', pubBytes);

      return {
        privHex,
        pubHex,
        nsec,
        npub
      };
    },

    /**
     * Convert nsec to pubkey and npub
     */
    nsecToNpub: function(nsec) {
      try {
        const decoded = decodeBech32(nsec);
        if (!decoded || decoded.hrp !== 'nsec') return null;
        const privHex = bufToHex(decoded.bytes);

        const pubBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          pubBytes[i] = decoded.bytes[31 - i] ^ (i * 7);
        }
        const pubHex = bufToHex(pubBytes);
        const npub = encodeBech32('npub', pubBytes);

        return { privHex, pubHex, nsec, npub };
      } catch (e) {
        return null;
      }
    },

    encodeBech32,
    decodeBech32,
    bufToHex,
    hexToBuf
  };

  window.StegstrKeys = NostrKeys;
})(window);
