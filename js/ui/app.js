/**
 * Main Stegstr Application Controller (`app.js`)
 */
(function(window) {
  'use strict';

  class StegstrApp {
    constructor() {
      this.currentView = 'home';
      this.userKeys = null;
    }

    init() {
      console.log('Initializing Stegstr v1.0.0...');

      // Generate or load Nostr keypair
      this.initKeys();

      // Bind navigation tabs
      this.bindNavigation();

      // Initialize subviews
      if (window.StegstrStudio) window.StegstrStudio.init();
      if (window.StegstrFeed) window.StegstrFeed.init();
      if (window.StegstrSimulatorView) window.StegstrSimulatorView.init();
      if (window.StegstrAgentView) window.StegstrAgentView.init();

      // Connect to Nostr WebSocket Relays
      if (window.StegstrNostr) window.StegstrNostr.connectRelays();
    }

    initKeys() {
      const savedNsec = localStorage.getItem('stegstr_nsec');
      if (savedNsec) {
        this.userKeys = window.StegstrKeys.nsecToNpub(savedNsec);
      }
      if (!this.userKeys) {
        this.userKeys = window.StegstrKeys.generateKeyPair();
        localStorage.setItem('stegstr_nsec', this.userKeys.nsec);
      }

      // Update badge in navbar
      const badge = document.getElementById('userNpubBadge');
      if (badge) {
        badge.innerText = `${this.userKeys.npub.substring(0, 10)}...${this.userKeys.npub.slice(-4)}`;
      }
    }

    bindNavigation() {
      const navButtons = document.querySelectorAll('.nav-btn');
      navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetView = e.target.getAttribute('data-view');
          if (targetView) {
            this.switchView(targetView);
          }
        });
      });

      // Quick CTA buttons
      const ctaButtons = document.querySelectorAll('[data-cta-target]');
      ctaButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget.getAttribute('data-cta-target');
          if (target) this.switchView(target);
        });
      });
    }

    switchView(viewName) {
      this.currentView = viewName;

      // Update navbar button highlights
      document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-view') === viewName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Show target view section, hide others
      document.querySelectorAll('.view-section').forEach(section => {
        if (section.id === `view-${viewName}`) {
          section.style.display = 'block';
        } else {
          section.style.display = 'none';
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.App = new StegstrApp();
    window.App.init();
  });
})(window);
