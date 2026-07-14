/* ═══════════════════════════════════════════════════════════════
   Wafer Die Calculator Module
   Center-aligned grid method for gross die estimation
   Interface: { init(container), resize() }
   ═══════════════════════════════════════════════════════════════ */

const WaferModule = (() => {

  function $(id) { return document.getElementById(id); }

  let canvas, ctx, container;
  const CANVAS_SIZE = 500; // logical size

  // ── Core calculation + drawing ────────────────────────────
  function calculate() {
    const sizeInch   = parseFloat($('wfSize').value);
    const dieX       = parseFloat($('wfDieX').value);
    const dieY       = parseFloat($('wfDieY').value);
    const scribe     = parseFloat($('wfScribe').value);
    const edgeMargin = parseFloat($('wfEdge').value);

    if (!dieX || !dieY || dieX <= 0 || dieY <= 0) return;

    const waferDiameterMm = sizeInch * 25.4;
    const waferRadius = waferDiameterMm / 2;
    const effectiveRadius = waferRadius - edgeMargin;

    const stepX = dieX + scribe;
    const stepY = dieY + scribe;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = canvas.width / (waferDiameterMm * 1.05);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw wafer
    drawCircle(centerX, centerY, waferRadius * scale, '#333', '#555');
    drawCircle(centerX, centerY, effectiveRadius * scale, 'transparent', '#d63031', 1);

    const maxCol = Math.floor(waferRadius / stepX) + 1;
    const maxRow = Math.floor(waferRadius / stepY) + 1;

    let goodDies = 0;
    let partialDies = 0;

    for (let col = -maxCol; col <= maxCol; col++) {
      for (let row = -maxRow; row <= maxRow; row++) {
        const dieCenterX = col * stepX;
        const dieCenterY = row * stepY;

        const halfDieX = dieX / 2;
        const halfDieY = dieY / 2;

        const p1 = { x: dieCenterX - halfDieX, y: dieCenterY - halfDieY };
        const p2 = { x: dieCenterX + halfDieX, y: dieCenterY - halfDieY };
        const p3 = { x: dieCenterX + halfDieX, y: dieCenterY + halfDieY };
        const p4 = { x: dieCenterX - halfDieX, y: dieCenterY + halfDieY };

        const d1 = Math.sqrt(p1.x**2 + p1.y**2);
        const d2 = Math.sqrt(p2.x**2 + p2.y**2);
        const d3 = Math.sqrt(p3.x**2 + p3.y**2);
        const d4 = Math.sqrt(p4.x**2 + p4.y**2);

        const isInside = (d1 <= effectiveRadius && d2 <= effectiveRadius &&
                          d3 <= effectiveRadius && d4 <= effectiveRadius);

        const distCenter = Math.sqrt(dieCenterX**2 + dieCenterY**2);
        const isVisible = distCenter < (waferRadius + Math.max(dieX, dieY));

        if (isVisible) {
          const drawX = centerX + p1.x * scale;
          const drawY = centerY + p1.y * scale;
          const drawW = dieX * scale;
          const drawH = dieY * scale;

          if (isInside) {
            goodDies++;
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(drawX, drawY, drawW, drawH);
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(drawX, drawY, drawW, drawH);
          } else {
            if (distCenter < waferRadius + 1) {
              partialDies++;
              ctx.globalAlpha = 0.6;
              ctx.fillStyle = '#e74c3c';
              ctx.fillRect(drawX, drawY, drawW, drawH);
              ctx.globalAlpha = 1.0;
            }
          }
        }
      }
    }

    $('wfGood').textContent    = goodDies;
    $('wfPartial').textContent = partialDies;
    $('wfTotal').textContent   = goodDies + partialDies;

    const dieArea = dieX * dieY;
    const waferArea = Math.PI * waferRadius * waferRadius;
    const totalDieArea = goodDies * dieArea;
    const util = (totalDieArea / waferArea) * 100;
    $('wfUtil').textContent = util.toFixed(2) + '%';
  }

  function drawCircle(x, y, r, fill, stroke, lineWidth) {
    lineWidth = lineWidth || 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (fill && fill !== 'transparent') {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  // ── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    $('wfSize').addEventListener('change', calculate);
    $('wfDieX').addEventListener('input', calculate);
    $('wfDieY').addEventListener('input', calculate);
    $('wfScribe').addEventListener('input', calculate);
    $('wfEdge').addEventListener('input', calculate);
  }

  // ── Public Interface ──────────────────────────────────────
  return {
    init(el) {
      container = el;
      canvas = $('wfCanvas');
      ctx = canvas.getContext('2d');
      bindEvents();
      calculate();
    },

    resize() {
      if (canvas && ctx) calculate();
    }
  };

})();
