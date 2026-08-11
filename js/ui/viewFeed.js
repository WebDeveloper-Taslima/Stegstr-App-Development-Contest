/**
 * Stegstr Nostr Feed Controller (`viewFeed.js`)
 * Renders steganographic feed notes, manages live relay updates,
 * and handles inline stego decoding.
 */
(function(window) {
  'use strict';

  const ViewFeed = {
    init: function() {
      this.renderFeed();
      window.StegstrNostr.subscribe((item) => {
        this.renderFeed();
      });
    },

    renderFeed: function() {
      const container = document.getElementById('nostrFeedContainer');
      if (!container) return;

      const feed = window.StegstrNostr.localFeed;
      container.innerHTML = '';

      if (feed.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">No Nostr stego posts found. Create one!</div>';
        return;
      }

      feed.forEach(item => {
        const card = document.createElement('div');
        card.className = 'glass-panel feed-card';

        const timeStr = new Date(item.created_at * 1000).toLocaleTimeString();

        card.innerHTML = `
          <div class="feed-header">
            <div class="avatar">${item.npub.substring(5, 7).toUpperCase()}</div>
            <div>
              <div style="font-weight:700; font-size:0.9rem; color:#fff;">${item.npub.substring(0, 16)}...</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${timeStr} • ${item.source}</div>
            </div>
          </div>
          <p style="font-size:0.95rem; color:var(--text-primary); margin-bottom:12px;">${item.content}</p>
          ${item.stegoMediaUrl ? `
            <div style="position:relative;">
              <img src="${item.stegoMediaUrl}" class="feed-image" alt="Stego Carrier" />
              <button class="btn-secondary btn-decode-inline" style="position:absolute; bottom:16px; right:16px; font-size:0.8rem; padding:6px 12px; background:rgba(7,9,14,0.85); backdrop-filter:blur(8px);">
                🔍 Extract Hidden Stego Payload
              </button>
            </div>
            <div class="inline-stego-result" style="display:none; margin-top:12px; padding:12px; background:rgba(16,185,129,0.1); border:1px solid var(--accent-emerald); border-radius:8px; font-size:0.85rem; font-family:var(--font-mono); color:#fff;"></div>
          ` : ''}
        `;

        // Bind inline decode click
        const btnDecode = card.querySelector('.btn-decode-inline');
        if (btnDecode) {
          btnDecode.addEventListener('click', async () => {
            btnDecode.innerText = 'Extracting...';
            const imgEl = card.querySelector('.feed-image');
            const resultBox = card.querySelector('.inline-stego-result');

            try {
              const res = await window.StegstrAgentSDK.extract({ stegoImage: imgEl.src });
              if (res.success && res.payload) {
                resultBox.style.display = 'block';
                resultBox.innerHTML = `<strong>DECODED STEGO PAYLOAD:</strong><br/>${res.payload}`;
                btnDecode.innerText = '✔ Decoded';
              } else {
                resultBox.style.display = 'block';
                resultBox.innerHTML = `<strong>Result:</strong> Public sample carrier image. Embed your own payload in Studio tab to test live relay sync!`;
                btnDecode.innerText = 'Extract Done';
              }
            } catch (e) {
              btnDecode.innerText = 'Decode Failed';
            }
          });
        }

        container.appendChild(card);
      });
    }
  };

  window.StegstrFeed = ViewFeed;
})(window);
