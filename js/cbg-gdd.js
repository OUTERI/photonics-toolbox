/* ═══════════════════════════════════════════════════════════════
   Chirped Bragg Grating GDD Calculator Module
   啁啾布拉格光栅群延时色散计算器
   Interface: { init(container), resize() }
   ═══════════════════════════════════════════════════════════════ */

const CbgGddModule = (() => {

  const c = 2.99792458e8;   // m/s
  const k = 5.600e-3;       // ps²·nm 拟合常数 (R²=0.999999)

  function $(id) { return document.getElementById(id); }

  let canvas, ctx, container;

  // ── Core Calculation ────────────────────────────────────────
  function compute(N, dλ_nm, λ0_nm, neff, ng) {
    // 拟合 GDD
    const gddFit = k * N / dλ_nm;                     // ps²

    // 物理 GDD
    const λ0  = λ0_nm * 1e-9;                          // m
    const dλ  = dλ_nm * 1e-9;                          // m
    const Λ   = λ0 / (2 * neff);                       // m, Bragg 周期
    const L   = N * Λ;                                  // m, 光栅总长
    const gddPhysSI = ng * L * λ0 * λ0 / (Math.PI * c * c * dλ); // s²
    const gddPhys   = gddPhysSI * 1e24;                // ps²

    return { gddFit, gddPhys, Λ, L };
  }

  // ── Read inputs ─────────────────────────────────────────────
  function readInputs() {
    const N       = parseFloat($('cbgN').value)      || 500;
    const dλ_nm   = parseFloat($('cbgDlambda').value) || 80;
    const λ0_nm   = parseFloat($('cbgLambda0').value) || 1550;
    const neff    = parseFloat($('cbgNeff').value)    || 1.9;
    const ng      = parseFloat($('cbgNg').value)      || 2.0;
    const chirpBtn = document.querySelector('#cbgChirpGroup .preset-btn.active');
    const isAnomalous = chirpBtn && chirpBtn.dataset.chirp === 'short-first';
    return { N, dλ_nm, λ0_nm, neff, ng, isAnomalous };
  }

  // ── Update results ──────────────────────────────────────────
  function update() {
    const inp = readInputs();
    const r = compute(inp.N, inp.dλ_nm, inp.λ0_nm, inp.neff, inp.ng);

    const sign = inp.isAnomalous ? -1 : 1;

    // Display values
    $('cbgGddFit').textContent       = r.gddFit.toFixed(4);
    $('cbgGddPhys').textContent      = r.gddPhys.toFixed(4);
    $('cbgGratingLen').textContent   = (r.L * 1e3).toFixed(3);
    $('cbgPeriodLen').textContent    = (r.Λ * 1e9).toFixed(2);

    // Update slider value displays
    $('cbgNVal').textContent       = inp.N;
    $('cbgDlambdaVal').textContent = inp.dλ_nm + ' nm';
    $('cbgLambda0Val').textContent = inp.λ0_nm + ' nm';
    $('cbgNeffVal').textContent    = inp.neff.toFixed(2);
    $('cbgNgVal').textContent      = inp.ng.toFixed(2);

    // Signed GDD
    const signedEl = $('cbgGddSigned');
    const signChar = sign < 0 ? '−' : '+';
    const gddSigned = sign * r.gddFit;
    signedEl.textContent = signChar + Math.abs(gddSigned).toFixed(4);

    // Badge
    const badgeEl = $('cbgDispBadge');
    if (inp.isAnomalous) {
      signedEl.style.color = 'var(--color-primary)';
      badgeEl.innerHTML = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#e8f2fa;color:#2b7abf;">反常色散 Anomalous</span>';
    } else {
      signedEl.style.color = 'var(--color-accent-amber)';
      badgeEl.innerHTML = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#fdf3e8;color:#d4782f;">正常色散 Normal</span>';
    }

    // Validation warnings
    const warnEl = $('cbgWarning');
    let warns = [];
    if (inp.N < 10) warns.push('周期数过少，光栅反射率可能不足');
    if (inp.N > 10000) warns.push('周期数超过 10000，光栅长度较大，注意工艺可行性');
    if (inp.dλ_nm < 1) warns.push('带宽过窄，色散值极大');
    if (inp.dλ_nm > 300) warns.push('带宽超过 300 nm，超出典型 CBG 设计范围');
    if (inp.neff < 1.4 || inp.neff > 3.5) warns.push('有效折射率值异常，请检查');
    if (r.L * 1e3 > 50) warns.push('光栅总长 > 50 mm，注意芯片面积');
    if (warns.length > 0) {
      warnEl.innerHTML = warns.map(w => '⚠ ' + w).join('<br>');
      warnEl.classList.add('show');
    } else {
      warnEl.classList.remove('show');
    }

    drawChart();
  }

  // ── Presets ─────────────────────────────────────────────────
  function applyPreset(btn) {
    const ng   = parseFloat(btn.dataset.ng);
    const neff = parseFloat(btn.dataset.neff);
    if (!isNaN(ng))   $('cbgNg').value   = ng;
    if (!isNaN(neff)) $('cbgNeff').value = neff;
    document.querySelectorAll('#cbgPresets .preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    update();
  }

  // ── Chart ───────────────────────────────────────────────────
  function drawChart() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w_px = rect.width;
    const h_px = 280;

    canvas.width  = w_px * dpr;
    canvas.height = h_px * dpr;
    canvas.style.width  = w_px + 'px';
    canvas.style.height = h_px + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const pad = { top: 20, right: 36, bottom: 40, left: 64 };
    const pw = w_px - pad.left - pad.right;
    const ph = h_px - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w_px * 2, h_px * 2);

    const inp = readInputs();

    // Generate curve: GDD vs Δλ for current N
    const dλVals = [];
    const nPts = 120;
    const dλMin = Math.max(1, inp.dλ_nm * 0.1);
    const dλMax = inp.dλ_nm * 3;
    for (let i = 0; i <= nPts; i++) {
      dλVals.push(dλMin + (dλMax - dλMin) * i / nPts);
    }

    const gddCurve = dλVals.map(dl => {
      const r = compute(inp.N, dl, inp.λ0_nm, inp.neff, inp.ng);
      return r.gddFit; // use fitting model for smooth curve
    });

    // Determine Y range (log-friendly)
    const gddAtCurrent = compute(inp.N, inp.dλ_nm, inp.λ0_nm, inp.neff, inp.ng).gddFit;
    const yMax = Math.max(...gddCurve) * 1.15;
    const yMin = 0;

    function toX(dl) { return pad.left + pw * (dl - dλMin) / (dλMax - dλMin); }
    function toY(y)  { return pad.top  + ph * (1 - (y - yMin) / (yMax - yMin)); }

    // Grid
    ctx.strokeStyle = '#e8ecf1';
    ctx.lineWidth = 0.5;
    const yStep = niceStep(yMax - yMin, 5);
    for (let y = 0; y <= yMax + yStep * 0.001; y += yStep) {
      const ty = toY(y);
      ctx.beginPath(); ctx.moveTo(pad.left, ty); ctx.lineTo(pad.left + pw, ty); ctx.stroke();
    }
    const xStep = niceStep(dλMax - dλMin, 6);
    for (let x = Math.ceil(dλMin / xStep) * xStep; x <= dλMax; x += xStep) {
      const tx = toX(x);
      ctx.beginPath(); ctx.moveTo(tx, pad.top); ctx.lineTo(tx, pad.top + ph); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#c0c6ce';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + ph); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top + ph); ctx.lineTo(pad.left + pw, pad.top + ph); ctx.stroke();

    // X labels
    ctx.fillStyle = '#5f6570';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    for (let x = Math.ceil(dλMin / xStep) * xStep; x <= dλMax; x += xStep) {
      ctx.fillText(x.toFixed(tickDecimals(xStep)), toX(x), pad.top + ph + 18);
    }
    ctx.fillText('Δλ Bandwidth (nm)', pad.left + pw/2, pad.top + ph + 34);

    // Y labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= yMax + yStep * 0.001; y += yStep) {
      ctx.fillText(y.toFixed(tickDecimals(yStep)), pad.left - 8, toY(y) + 4);
    }

    // Y axis label
    ctx.save();
    ctx.translate(14, pad.top + ph/2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('|GDD| (ps²)', 0, 0);
    ctx.restore();

    // Curve
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < dλVals.length; i++) {
      const cx = toX(dλVals[i]);
      const cy = toY(gddCurve[i]);
      if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Current point marker
    const cx = toX(inp.dλ_nm);
    const cy = toY(gddAtCurrent);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.stroke();

    // Tooltip
    ctx.fillStyle = '#1a1d23';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    const labelX = cx + 10;
    const labelY = cy - 10;
    ctx.fillText('N=' + inp.N + '  Δλ=' + inp.dλ_nm.toFixed(1) + ' nm', labelX, labelY);
    ctx.fillText('|GDD|=' + gddAtCurrent.toFixed(4) + ' ps²', labelX, labelY + 16);

    // X-axis reference line at current Δλ
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, pad.top); ctx.lineTo(cx, pad.top + ph); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Chart helpers ───────────────────────────────────────────
  function niceStep(range, targetTicks) {
    targetTicks = targetTicks || 5;
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

  // ── Event Binding ───────────────────────────────────────────
  function bindEvents() {
    ['cbgN', 'cbgDlambda', 'cbgLambda0', 'cbgNeff', 'cbgNg'].forEach(id => {
      $(id).addEventListener('input', update);
    });

    // Chirp direction buttons
    document.querySelectorAll('#cbgChirpGroup .preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#cbgChirpGroup .preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        update();
      });
    });

    // Waveguide presets
    document.querySelectorAll('#cbgPresets .preset-btn').forEach(btn => {
      btn.addEventListener('click', () => applyPreset(btn));
    });
  }

  // ── Public Interface ────────────────────────────────────────
  return {
    init(el) {
      container = el;
      canvas = $('cbgChart');
      ctx = canvas.getContext('2d');
      bindEvents();
      update();
    },

    resize() {
      if (canvas && ctx) drawChart();
    }
  };

})();
