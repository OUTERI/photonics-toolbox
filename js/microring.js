/* ═══════════════════════════════════════════════════════════════
   Microring FSR & Radius Calculator Module
   Si₃N₄ microring resonator — FSR ↔ radius calculations
   Interface: { init(container), resize() }
   ═══════════════════════════════════════════════════════════════ */

const MicroringModule = (() => {

  const c = 2.998e8;

  function $(id) { return document.getElementById(id); }

  // ── Update all outputs ────────────────────────────────────
  function update() {
    const fsr_ghz = parseFloat($('mrFsr').value);
    const ng_val  = parseFloat($('mrNg').value);
    const lam_nm  = parseFloat($('mrLam').value);

    $('mrFsrVal').textContent = fsr_ghz + ' GHz';
    $('mrNgVal').textContent  = ng_val.toFixed(2);
    $('mrLamVal').textContent = lam_nm + ' nm';

    const lam_m  = lam_nm * 1e-9;
    const fsr_hz = fsr_ghz * 1e9;

    const R_m  = c / (ng_val * 2 * Math.PI * fsr_hz);
    const R_um = R_m * 1e6;
    const L_um = 2 * Math.PI * R_um;
    const D_um = 2 * R_um;

    const fsr_nm = (lam_m * lam_m) / (ng_val * (L_um * 1e-6)) * 1e9;

    const Q = 1e6;
    const nu0 = c / lam_m;
    const tau_s = Q / (2 * Math.PI * nu0);
    const tau_ns = tau_s * 1e9;

    $('mrR').textContent  = R_um.toFixed(1);
    $('mrL').textContent  = L_um.toFixed(1);
    $('mrD').textContent  = D_um.toFixed(1);
    $('mrFsrNm').textContent  = fsr_nm.toFixed(3);
    $('mrFsrGhz').textContent = fsr_ghz.toFixed(1);
    $('mrTau').textContent    = tau_ns.toFixed(3);

    let tip = '';
    if (R_um < 20) tip = '⚠ 半径 < 20 μm，弯曲损耗在 Si₃N₄ 中会显著增大，建议评估辐射损耗。';
    else if (R_um < 50) tip = '半径较小，需关注弯曲辐射损耗，适合高 FSR 应用。';
    else if (R_um > 500) tip = '半径较大，弯曲损耗可忽略，但器件占芯片面积增大。';
    else tip = '半径范围适中，弯曲损耗通常可接受。';
    $('mrNote').textContent = tip;
  }

  // ── Preset buttons ────────────────────────────────────────
  function setPreset(ng_val, btn) {
    $('mrNg').value = ng_val;
    document.querySelectorAll('#mrPresets .preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    update();
  }

  // ── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    $('mrFsr').addEventListener('input', update);
    $('mrNg').addEventListener('input', update);
    $('mrLam').addEventListener('input', update);

    document.querySelectorAll('#mrPresets .preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ngVal = parseFloat(btn.dataset.ng);
        if (!isNaN(ngVal)) setPreset(ngVal, btn);
        else {
          // Custom button — just highlight
          document.querySelectorAll('#mrPresets .preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
  }

  // ── Public Interface ──────────────────────────────────────
  return {
    init() {
      bindEvents();
      update();
    },
    resize() {
      // No canvas, nothing to resize
    }
  };

})();
