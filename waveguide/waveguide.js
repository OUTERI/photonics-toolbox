/* ═══════════════════════════════════════════════════════════════
   Waveguide Dispersion Calculator
   Si₃N₄ ridge waveguide — β₂, Aeff, ng, neff vs width
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── FEM Simulation Data ───────────────────────────────────
  const w = [
    0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0,
    2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0
  ];

  const beta2 = [
    2080.586, 1979.349, 1848.792, 1718.771, 1601.683, 1501.147, 1416.826,
    1346.902, 1289.179, 1241.560, 1202.219, 1169.626, 1142.533, 1060.248,
    1024.068, 1007.054, 998.754, 994.698, 992.812, 992.074, 991.952,
    992.160, 992.539
  ];

  const aeff_raw = [
    9.08236421098370e-13, 8.02001654130941e-13, 7.42835317372518e-13,
    7.10069976893199e-13, 6.93473585434125e-13, 6.87439062451860e-13,
    6.88658657246207e-13, 6.95056606618676e-13, 7.05272103138076e-13,
    7.18375149811203e-13, 7.33712421328728e-13, 7.50808749930651e-13,
    7.69314983418958e-13, 8.75542168152474e-13, 9.94392434396633e-13,
    1.11937540719609e-12, 1.24774655452721e-12, 1.37816305188208e-12,
    1.50989800568443e-12, 1.64252714543028e-12, 1.77578877616651e-12,
    1.90951064219206e-12, 2.04357861733513e-12
  ];
  const aeff = aeff_raw.map(v => v * 2);

  const ng = [
    1.690769, 1.722375, 1.745676, 1.762625, 1.774899, 1.783783, 1.790220,
    1.794890, 1.798275, 1.800722, 1.802479, 1.803725, 1.804593, 1.805859,
    1.805167, 1.804094, 1.803056, 1.802152, 1.801390, 1.800755, 1.800225,
    1.799781, 1.799406
  ];

  const neff = [
    1.48140739591071, 1.49141148248947, 1.50053712981718, 1.50866976039060,
    1.51583043297003, 1.52210008975701, 1.52758116476811, 1.53237613007655,
    1.53657965793813, 1.54027550021382, 1.54353590993976, 1.54642228847974,
    1.54898699230162, 1.55831023114158, 1.56399185109068, 1.56769204194162,
    1.57023070193744, 1.57204593472398, 1.57338795140065, 1.57440771634437,
    1.57520058302922, 1.57582911494959, 1.57633575250655
  ];

  // ── Interpolation ─────────────────────────────────────────
  function lerp(x, x0, x1, y0, y1) {
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }

  function interpolate(arr, x) {
    if (x <= w[0]) return arr[0];
    if (x >= w[w.length - 1]) return arr[arr.length - 1];
    let i = 0;
    while (i < w.length - 1 && w[i + 1] < x) i++;
    return lerp(x, w[i], w[i + 1], arr[i], arr[i + 1]);
  }

  function computeAll(width) {
    const aeff_display = interpolate(aeff, width) * 1e12;
    return {
      beta2_ps2km: interpolate(beta2, width),
      aeff_display: aeff_display,
      ng: interpolate(ng, width),
      neff: interpolate(neff, width),
      inRange: width >= w[0] && width <= w[w.length - 1]
    };
  }

  function fmt5(v) { return Number(v).toFixed(5); }

  // ── State ─────────────────────────────────────────────────
  let currentSeries = 'beta2';
  let canvas, ctx;

  function $(id) { return document.getElementById(id); }

  // ── Chart Helpers ─────────────────────────────────────────
  function niceStep(range, targetTicks) {
    targetTicks = targetTicks || 6;
    const raw = range / targetTicks;
    const exp = Math.floor(Math.log10(raw));
    const frac = raw / Math.pow(10, exp);
    let nice;
    if (frac <= 1.5) nice = 1;
    else if (frac <= 2.5) nice = 2;
    else if (frac <= 4) nice = 2.5;
    else if (frac <= 7.5) nice = 5;
    else nice = 10;
    if (nice === 2.5) return 2.5 * Math.pow(10, exp);
    return nice * Math.pow(10, exp);
  }

  function tickDecimals(step) {
    if (step >= 1) return 0;
    const s = step.toFixed(10);
    const dot = s.indexOf('.');
    if (dot < 0) return 0;
    for (let i = dot + 1; i < s.length; i++) {
      if (s[i] !== '0') return i - dot;
    }
    return 0;
  }

  // ── Chart Drawing ─────────────────────────────────────────
  function drawChart() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w_px = rect.width;
    const h_px = 320;

    canvas.width = w_px * dpr;
    canvas.height = h_px * dpr;
    canvas.style.width = w_px + 'px';
    canvas.style.height = h_px + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const pad = { top: 24, right: 36, bottom: 40, left: 64 };
    const pw = w_px - pad.left - pad.right;
    const ph = h_px - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w_px * 2, h_px * 2);

    const xMin = 0.7, xMax = 7.2;
    function toX(x) { return pad.left + pw * (x - xMin) / (xMax - xMin); }
    function toY(y, yMin, yMax) { return pad.top + ph * (1 - (y - yMin) / (yMax - yMin)); }

    function *tickValues(yMin, yMax) {
      const yStep = niceStep(yMax - yMin);
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + yStep * 0.001; y += yStep) {
        yield parseFloat(y.toFixed(10));
      }
    }

    function drawGrid(yMin, yMax) {
      ctx.strokeStyle = '#e8ecf1';
      ctx.lineWidth = 0.5;
      [1,2,3,4,5,6,7].forEach(t => {
        const tx = toX(t);
        ctx.beginPath(); ctx.moveTo(tx, pad.top); ctx.lineTo(tx, pad.top + ph); ctx.stroke();
      });
      for (const y of tickValues(yMin, yMax)) {
        const ty = toY(y, yMin, yMax);
        ctx.beginPath(); ctx.moveTo(pad.left, ty); ctx.lineTo(pad.left + pw, ty); ctx.stroke();
      }
    }

    function drawAxis(yMin, yMax, yLabel, color) {
      ctx.strokeStyle = '#c0c6ce';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.left, pad.top + ph); ctx.lineTo(pad.left + pw, pad.top + ph); ctx.stroke();

      ctx.fillStyle = '#5f6570';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      [1,2,3,4,5,6,7].forEach(t => {
        ctx.fillText(t, toX(t), pad.top + ph + 18);
      });
      ctx.fillText('Width (μm)', pad.left + pw/2, pad.top + ph + 34);

      ctx.textAlign = 'right';
      const yStep = niceStep(yMax - yMin);
      const dec = tickDecimals(yStep);
      for (const y of tickValues(yMin, yMax)) {
        ctx.fillText(y.toFixed(dec), pad.left - 8, toY(y, yMin, yMax) + 4);
      }

      ctx.save();
      ctx.translate(14, pad.top + ph/2);
      ctx.rotate(-Math.PI/2);
      ctx.fillStyle = color;
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    function drawLine(dataArr, yMin, yMax, color, dash) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (dash) ctx.setLineDash([6, 3]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      const nPts = 200;
      for (let i = 0; i <= nPts; i++) {
        const x = xMin + (xMax - xMin) * i / nPts;
        const y = interpolate(dataArr, x);
        const cx = toX(x);
        const cy = toY(y, yMin, yMax);
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      w.forEach((wi, i) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(toX(wi), toY(dataArr[i], yMin, yMax), 3.5, 0, Math.PI*2); ctx.fill();
      });
    }

    const selectedW = parseFloat($('wgWidthSlider').value);

    function drawCursor(x, yMin, yMax) {
      const cx = toX(x);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, pad.top); ctx.lineTo(cx, pad.top + ph); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(cx, pad.top + ph, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(x.toFixed(2), cx, pad.top + ph + 30);
    }

    if (currentSeries === 'beta2') {
      const yMin = 950, yMax = 2150;
      drawGrid(yMin, yMax);
      drawAxis(yMin, yMax, 'β₂ (ps²/km)', '#2563eb');
      drawLine(beta2, yMin, yMax, '#2563eb', false);
      drawCursor(selectedW, yMin, yMax);
    } else if (currentSeries === 'aeff') {
      const ae_display = aeff.map(v => v * 1e12);
      const yMin = 1.2, yMax = 4.3;
      drawGrid(yMin, yMax);
      drawAxis(yMin, yMax, 'Aeff (×10⁻¹² m²)', '#d97706');
      drawLine(ae_display, yMin, yMax, '#d97706', false);
      drawCursor(selectedW, yMin, yMax);
    } else if (currentSeries === 'ng') {
      const yMin = 1.68, yMax = 1.82;
      drawGrid(yMin, yMax);
      drawAxis(yMin, yMax, 'ng', '#059669');
      drawLine(ng, yMin, yMax, '#059669', false);
      drawCursor(selectedW, yMin, yMax);
    } else if (currentSeries === 'neff') {
      const yMin = 1.47, yMax = 1.59;
      drawGrid(yMin, yMax);
      drawAxis(yMin, yMax, 'neff', '#7c3aed');
      drawLine(neff, yMin, yMax, '#7c3aed', false);
      drawCursor(selectedW, yMin, yMax);
    } else if (currentSeries === 'all') {
      function norm(arr) { const min=Math.min(...arr), max=Math.max(...arr); return arr.map(v=>(v-min)/(max-min)); }
      const colors = ['#2563eb','#d97706','#059669','#7c3aed'];
      const names = ['β₂','Aeff','ng','neff'];
      const ae_display = aeff.map(v => v * 1e12);
      const datasets = [beta2, ae_display, ng, neff];
      const yMin = -0.1, yMax = 1.15;
      drawGrid(yMin, yMax);
      drawAxis(yMin, yMax, '归一化值', '#5f6570');
      datasets.forEach((d, i) => {
        drawLine(norm(d), yMin, yMax, colors[i], i >= 2);
      });
      names.forEach((n, i) => {
        ctx.fillStyle = colors[i];
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((i%2===0?'─ ':'- - ') + n, pad.left + 10 + (i % 2) * 100, pad.top + 16 + Math.floor(i/2)*16);
      });
      drawCursor(selectedW, yMin, yMax);
    }
  }

  // ── Update results ────────────────────────────────────────
  function updateResults(width) {
    const r = computeAll(width);
    $('wgBeta2').textContent = fmt5(r.beta2_ps2km);
    $('wgAeff').textContent  = fmt5(r.aeff_display);
    $('wgNg').textContent    = fmt5(r.ng);
    $('wgNeff').textContent  = fmt5(r.neff);
    $('wgWarning').classList.toggle('show', !r.inRange);
    highlightRow(width);
    drawChart();
  }

  // ── Table ─────────────────────────────────────────────────
  function buildTable() {
    const tbody = $('wgTableBody');
    const rows = w.map((wi, i) => {
      const ae_disp = (aeff[i] * 1e12);
      return '<tr data-w="' + wi + '">' +
        '<td>' + wi.toFixed(1) + '</td>' +
        '<td>' + fmt5(beta2[i]) + '</td>' +
        '<td>' + fmt5(ae_disp) + '</td>' +
        '<td>' + fmt5(ng[i]) + '</td>' +
        '<td>' + fmt5(neff[i]) + '</td>' +
        '</tr>';
    }).join('');
    tbody.innerHTML = rows;
  }

  function highlightRow(width) {
    document.querySelectorAll('#wgTableBody tr').forEach(tr => tr.classList.remove('interpolated'));
    const closest = w.reduce((best, wi) =>
      Math.abs(wi - width) < Math.abs(best - width) ? wi : best, w[0]);
    if (Math.abs(closest - width) >= 0.001 && width >= w[0] && width <= w[w.length-1]) {
      let i = 0;
      while (i < w.length - 1 && w[i + 1] < width) i++;
      const trs = document.querySelectorAll('#wgTableBody tr');
      if (trs[i]) trs[i].classList.add('interpolated');
      if (trs[i+1]) trs[i+1].classList.add('interpolated');
    }
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    canvas = $('wgChart');
    ctx = canvas.getContext('2d');
    buildTable();

    const slider = $('wgWidthSlider');
    const input  = $('wgWidthInput');

    slider.addEventListener('input', function() {
      const v = parseFloat(slider.value);
      input.value = v.toFixed(2);
      updateResults(v);
    });

    input.addEventListener('input', function() {
      let v = parseFloat(input.value);
      if (isNaN(v)) return;
      v = Math.max(0.5, Math.min(10, v));
      slider.value = v;
      updateResults(v);
    });

    $('wgTableToggle').addEventListener('click', function() {
      const wrap = $('wgTableWrap');
      const icon = $('wgToggleIcon');
      wrap.classList.toggle('hidden');
      icon.classList.toggle('collapsed');
      setTimeout(drawChart, 50);
    });

    document.querySelectorAll('#wgChartTabs .chart-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#wgChartTabs .chart-tab').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentSeries = btn.dataset.series;
        drawChart();
      });
    });

    window.addEventListener('resize', function() {
      drawChart();
    });

    updateResults(1.5);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
