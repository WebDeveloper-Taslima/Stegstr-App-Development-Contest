/**
 * Stegstr Social Platform Recompression Simulator
 * Replicates real-world WhatsApp, Telegram, and Instagram image processing.
 */
(function(window) {
  'use strict';

  const PlatformSimulator = {
    PLATFORMS: {
      whatsapp: {
        name: 'WhatsApp',
        quality: 0.65,
        maxDimension: 1600,
        stripMetadata: true,
        description: 'JPEG Q=65, 4:2:0 Chroma Subsampling, Max 1600px, EXIF Strip'
      },
      telegram: {
        name: 'Telegram',
        quality: 0.75,
        maxDimension: 1280,
        stripMetadata: true,
        description: 'JPEG Q=75, Max 1280px, EXIF Strip'
      },
      instagram: {
        name: 'Instagram',
        quality: 0.60,
        maxDimension: 1080,
        stripMetadata: true,
        description: 'JPEG Q=60, Square Downscale 1080px, EXIF Strip'
      }
    },

    /**
     * Simulate platform recompression on a canvas / imageData
     * @param {HTMLCanvasElement} srcCanvas - Source stego canvas
     * @param {string} platformKey - 'whatsapp' | 'telegram' | 'instagram' | custom quality
     * @param {number} [customQuality] - Optional override quality 0.1 to 1.0
     * @returns {Promise<{ canvas: HTMLCanvasElement, imageData: ImageData, dataUrl: string, fileSize: number }>}
     */
    simulatePlatform: function(srcCanvas, platformKey, customQuality) {
      return new Promise((resolve) => {
        const config = PlatformSimulator.PLATFORMS[platformKey] || {
          quality: customQuality || 0.70,
          maxDimension: 1600,
          stripMetadata: true
        };

        const quality = customQuality !== undefined ? customQuality : config.quality;

        let targetWidth = srcCanvas.width;
        let targetHeight = srcCanvas.height;

        // Apply platform max dimension constraints
        if (targetWidth > config.maxDimension || targetHeight > config.maxDimension) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * config.maxDimension) / targetWidth);
            targetWidth = config.maxDimension;
          } else {
            targetWidth = Math.round((targetWidth * config.maxDimension) / targetHeight);
            targetHeight = config.maxDimension;
          }
        }

        const simCanvas = document.createElement('canvas');
        simCanvas.width = targetWidth;
        simCanvas.height = targetHeight;
        const ctx = simCanvas.getContext('2d');

        // Draw downscaled / resized image
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

        // Convert to lossy JPEG data URL to force JPEG DCT quantization table compression
        const jpegDataUrl = simCanvas.toDataURL('image/jpeg', quality);

        const img = new Image();
        img.onload = () => {
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = img.width;
          finalCanvas.height = img.height;
          const finalCtx = finalCanvas.getContext('2d');
          finalCtx.drawImage(img, 0, 0);

          const finalImageData = finalCtx.getImageData(0, 0, img.width, img.height);
          const approxSizeBytes = Math.round((jpegDataUrl.length * 3) / 4);

          resolve({
            canvas: finalCanvas,
            imageData: finalImageData,
            dataUrl: jpegDataUrl,
            fileSize: approxSizeBytes,
            platform: config.name || 'Custom JPEG'
          });
        };
        img.src = jpegDataUrl;
      });
    }
  };

  window.StegstrSimulator = PlatformSimulator;
})(window);
