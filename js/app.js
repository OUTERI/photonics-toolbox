/* ═══════════════════════════════════════════════════════════════
   App Controller — Tab navigation & module lifecycle
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // Module registry: tab-name → { module, panel, initialized }
  const registry = {
    waveguide: { module: WaveguideModule,   panel: 'panel-waveguide',  initialized: false },
    microring: { module: MicroringModule,   panel: 'panel-microring',  initialized: false },
    wafer:     { module: WaferModule,       panel: 'panel-wafer',      initialized: false }
  };

  let activeTab = 'waveguide';

  // ── Switch Tab ─────────────────────────────────────────────
  function switchTab(tabName) {
    if (tabName === activeTab) return;

    // Deactivate old
    const old = registry[activeTab];
    if (old) {
      document.querySelector(`[data-tab="${activeTab}"]`).classList.remove('active');
      document.getElementById(old.panel).classList.remove('active');
    }

    // Activate new
    activeTab = tabName;
    const entry = registry[tabName];
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(entry.panel).classList.add('active');

    // Lazy init on first visit
    if (!entry.initialized) {
      entry.module.init(document.getElementById(entry.panel));
      entry.initialized = true;
    }

    // Resize canvas after display switch (was hidden → now visible)
    setTimeout(() => entry.module.resize(), 50);
  }

  // ── Bind Tab Clicks ────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // ── Init default tab ───────────────────────────────────────
  const def = registry[activeTab];
  def.module.init(document.getElementById(def.panel));
  def.initialized = true;

  // ── Global resize → active module resize ───────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const entry = registry[activeTab];
      if (entry && entry.initialized) entry.module.resize();
    }, 150);
  });

})();
