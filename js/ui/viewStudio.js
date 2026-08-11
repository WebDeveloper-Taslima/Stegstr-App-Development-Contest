/**
 * Stegstr Stego Studio Controller (`viewStudio.js`)
 * Controls embed, extract, visual heatmap, and PSNR capacity statistics.
 */
(function(window) {
  'use strict';

  const ViewStudio = {
    activeMode: 'robust',
    loadedCarrierCanvas: null,
    generatedStegoCanvas: null,

    init: function() {
      this.bindEvents();
      this.loadDefaultCarrier();
    },

    bindEvents: function() {
      const dropZone = document.getElementById('studioDropZone');
      const fileInput = document.getElementById('carrierFileInput');

      if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            this.handleFileSelect(e.target.files[0]);
          }
        });

        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropZone.style.borderColor = '#3b82f6';
        });

        dropZone.addEventListener('dragleave', () => {
          dropZone.style.borderColor = 'rgba(255,255,255,0.08)';
        });

        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.style.borderColor = 'rgba(255,255,255,0.08)';
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            this.handleFileSelect(e.dataTransfer.files[0]);
          }
        });
      }

      // Embed button
      const btnEmbed = document.getElementById('btnExecuteEmbed');
      if (btnEmbed) {
        btnEmbed.addEventListener('click', () => this.executeEmbed());
      }

      // Extract button
      const btnExtract = document.getElementById('btnExecuteExtract');
      if (btnExtract) {
        btnExtract.addEventListener('click', () => this.executeExtract());
      }
    },

    loadDefaultCarrier: function() {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        this.loadedCarrierCanvas = canvas;
        this.renderCarrierPreview(canvas);
      };
      // Default sleek dark mountain cover image
      img.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
    },

    handleFileSelect: function(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          this.loadedCarrierCanvas = canvas;
          this.renderCarrierPreview(canvas);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    renderCarrierPreview: function(canvas) {
      const container = document.getElementById('carrierPreviewContainer');
      if (!container) return;
      container.innerHTML = '';
      container.appendChild(canvas);

      // Estimate bit capacity
      const capacityBits = Math.floor((canvas.width * canvas.height) / 64);
      const capacityBytes = Math.floor(capacityBits / 40); // Account for 5x ECC redundancy
      const elCap = document.getElementById('metricCapacity');
      if (elCap) elCap.innerText = `~${capacityBytes} bytes`;
    },

    executeEmbed: async function() {
      if (!this.loadedCarrierCanvas) {
        alert('Please select or upload a carrier image first.');
        return;
      }

      const payload = document.getElementById('embedPayloadInput').value;
      if (!payload || payload.trim() === '') {
        alert('Please enter a message or Nostr event text to embed.');
        return;
      }

      const mode = document.getElementById('stegoModeSelect').value;
      const passphrase = document.getElementById('embedPassphraseInput').value;

      try {
        document.getElementById('embedStatusText').innerText = 'Encoding payload with DCT Quantization & Reed-Solomon ECC...';

        const result = await window.StegstrAgentSDK.embed({
          carrier: this.loadedCarrierCanvas,
          payload: payload,
          mode: mode,
          passphrase: passphrase
        });

        this.generatedStegoCanvas = await window.StegstrAgentSDK._getCanvasFromSource(result.stegoDataUrl);

        // Render result image
        const stegoPreview = document.getElementById('stegoPreviewContainer');
        stegoPreview.innerHTML = '';
        stegoPreview.appendChild(this.generatedStegoCanvas);

        // Update metrics
        document.getElementById('metricPsnr').innerText = `${result.psnr} dB`;
        document.getElementById('metricStatus').innerText = '100% Embedded';
        document.getElementById('embedStatusText').innerText = `Successfully embedded ${result.bitsEmbedded} ECC bits! Ready to share.`;

        // Enable download button
        const btnDownload = document.getElementById('btnDownloadStego');
        if (btnDownload) {
          btnDownload.disabled = false;
          btnDownload.onclick = () => {
            const a = document.createElement('a');
            a.download = `stegstr_${mode}_stego.${mode === 'robust' ? 'jpeg' : 'png'}`;
            a.href = result.stegoDataUrl;
            a.click();
          };
        }
      } catch (err) {
        alert(`Embedding error: ${err.message}`);
        document.getElementById('embedStatusText').innerText = 'Error occurred during embedding.';
      }
    },

    executeExtract: async function() {
      const fileInput = document.getElementById('extractFileInput');
      const passphrase = document.getElementById('extractPassphraseInput').value;

      if (!fileInput.files || !fileInput.files[0]) {
        alert('Please upload a stego image to extract from.');
        return;
      }

      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const result = await window.StegstrAgentSDK.extract({
            stegoImage: e.target.result,
            passphrase: passphrase
          });

          const resultArea = document.getElementById('extractResultArea');
          const payloadBox = document.getElementById('extractedPayloadBox');

          if (result.success && result.payload) {
            payloadBox.value = result.payload;
            resultArea.style.display = 'block';
            document.getElementById('extractStatusText').innerText = 'SUCCESS: Hidden message detected and restored!';
          } else {
            payloadBox.value = '';
            alert('No valid Stegstr stego payload detected in this file.');
          }
        } catch (err) {
          alert(`Extraction error: ${err.message}`);
        }
      };

      reader.readAsDataURL(file);
    }
  };

  window.StegstrStudio = ViewStudio;
})(window);
