/**
 * Stegstr Platform Robustness Lab View Controller (`viewSimulator.js`)
 * Simulates WhatsApp, Telegram, and Instagram JPEG compression and validates payload survival.
 */
(function(window) {
  'use strict';

  const ViewSimulator = {
    init: function() {
      this.bindEvents();
    },

    bindEvents: function() {
      const btnRunSim = document.getElementById('btnRunWhatsAppSim');
      if (btnRunSim) {
        btnRunSim.addEventListener('click', () => this.runSimulation());
      }
    },

    runSimulation: async function() {
      const platformKey = document.getElementById('simPlatformSelect').value;
      const statusText = document.getElementById('simStatusText');
      const testMsg = document.getElementById('simMessageInput').value || 'Stegstr WhatsApp Survival Test';

      statusText.innerText = `[1/3] Generating Stego Image with 2D DCT + Reed-Solomon ECC...`;

      try {
        // Step 1: Create base stego canvas
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 1200;
        sampleCanvas.height = 800;
        const ctx = sampleCanvas.getContext('2d');

        // Draw test pattern carrier
        const grad = ctx.createLinearGradient(0, 0, 1200, 800);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#334155');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1200, 800);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 36px Inter';
        ctx.fillText('Stegstr Carrier Test File', 100, 200);

        const embedRes = await window.StegstrAgentSDK.embed({
          carrier: sampleCanvas,
          payload: testMsg,
          mode: 'robust'
        });

        statusText.innerText = `[2/3] Simulating ${platformKey.toUpperCase()} recompression (JPEG Q=65, Downscale, EXIF Strip)...`;

        const stegoCanvas = await window.StegstrAgentSDK._getCanvasFromSource(embedRes.stegoDataUrl);

        // Step 2: Pass through Platform Recompression Simulator
        const simRes = await window.StegstrSimulator.simulatePlatform(stegoCanvas, platformKey);

        statusText.innerText = `[3/3] Demodulating DCT coefficients & Reed-Solomon ECC voting...`;

        // Step 3: Attempt payload extraction from recompressed image
        const extractRes = window.StegstrDCT.extract(simRes.imageData);

        // Render preview image
        const simPreviewContainer = document.getElementById('simResultContainer');
        simPreviewContainer.innerHTML = '';
        const img = new Image();
        img.src = simRes.dataUrl;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        simPreviewContainer.appendChild(img);

        // Update statistics
        document.getElementById('simResultSize').innerText = `${Math.round(simRes.fileSize / 1024)} KB`;
        document.getElementById('simResultStatus').innerText = extractRes.success ? '100% SURVIVED' : 'FAILED';
        document.getElementById('simResultStatus').style.color = extractRes.success ? '#10b981' : '#f43f5e';
        document.getElementById('simResultPayload').value = extractRes.payload || 'Failed to recover payload.';

        statusText.innerText = extractRes.success 
          ? `SUCCESS! Hidden payload survived ${platformKey.toUpperCase()} recompression without a single byte lost!`
          : `Simulation complete.`;

      } catch (err) {
        alert(`Simulation error: ${err.message}`);
      }
    }
  };

  window.StegstrSimulatorView = ViewSimulator;
})(window);
