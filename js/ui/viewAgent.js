/**
 * Stegstr AI Agent & CLI View Controller (`viewAgent.js`)
 * Manages the web terminal emulator and AI Agent documentation interaction.
 */
(function(window) {
  'use strict';

  const ViewAgent = {
    init: function() {
      this.bindEvents();
      this.loadManifests();
    },

    bindEvents: function() {
      const cliInput = document.getElementById('terminalInput');
      const terminalBody = document.getElementById('terminalOutput');

      if (cliInput && terminalBody) {
        cliInput.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            const cmd = cliInput.value;
            cliInput.value = '';

            terminalBody.innerText += `\n$ ${cmd}`;
            const output = await window.StegstrCLI.execute(cmd);
            terminalBody.innerText += `\n${output}`;
            terminalBody.scrollTop = terminalBody.scrollHeight;
          }
        });
      }
    },

    loadManifests: function() {
      const agentTxtBox = document.getElementById('agentsTxtView');
      const agentJsonBox = document.getElementById('agentJsonView');

      if (agentTxtBox) {
        fetch('/agents.txt')
          .then(res => res.text())
          .then(text => { agentTxtBox.value = text; })
          .catch(() => {
            agentTxtBox.value = `# Stegstr AI Agent Discovery Manifest\nUser-Agent: *\nAllow: /\nAgent-Spec: /.well-known/agent.json\nAgent-SDK: /js/agent/agentSdk.js\nCLI-Tool: /cli/stegstr-cli.js`;
          });
      }

      if (agentJsonBox) {
        fetch('/.well-known/agent.json')
          .then(res => res.json())
          .then(json => { agentJsonBox.value = JSON.stringify(json, null, 2); })
          .catch(() => {
            agentJsonBox.value = JSON.stringify({ name: "Stegstr Agent API", version: "1.0.0", spec: "OpenAPI/RPC" }, null, 2);
          });
      }
    }
  };

  window.StegstrAgentView = ViewAgent;
})(window);
