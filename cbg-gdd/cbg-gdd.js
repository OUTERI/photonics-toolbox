/* ═══════════════════════════════════════════════════════════════
   Chirped Bragg Grating GDD Calculator
   啁啾布拉格光栅群延时色散计算器
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var c = 2.99792458e8;   // m/s
  var k = 5.600e-3;       // ps^2.nm fitting constant (R^2=0.999999)

  function $(id) { return document.getElementById(id); }

  var canvas, ctx;

  // ── Core Calculation ──────────────────────────────────────
  function compute(N, dL_nm, L0_nm, neff, ng) {
    var gddFit = k * N / dL_nm;

    var L0  = L0_nm * 1e-9;
    var dL  = dL_nm * 1e-9;
    var Lambda = L0 / (2 * neff);
    var L   = N * Lambda;
    var gddPhysSI = ng * L * L0 * L0 / (Math.PI * c * c * dL);
    var gddPhys   = gddPhysSI * 1e24;

    return { gddFit: gddFit, gddPhys: gddPhys, Lambda: Lambda, L: L };
  }

  function readInputs() {
    var N       = parseFloat($('cbgN').value)      || 500;
    var dL_nm   = parseFloat($('cbgDlambda').value) || 80;
    var L0_nm   = parseFloat($('cbgLambda0').value) || 1550;
    var neff    = parseFloat($('cbgNeff').value)    || 1.9;
    var ng      = parseFloat($('cbgNg').value)      || 2.0;
    var chirpBtn = document.querySelector('#cbgChirpGroup .preset-btn.active');
    var isAnomalous = chirpBtn && chirpBtn.dataset.chirp === 'short-first';
    return { N: N, dL_nm: dL_nm, L0_nm: L0_nm, neff: neff, ng: ng, isAnomalous: isAnomalous };
  }

  // ── Update results ────────────────────────────────────────
  function update() {
    var inp = readInputs();
    var r = compute(inp.N, inp.dL_nm, inp.L0_nm, inp.neff, inp.ng);
    var sign = inp.isAnomalous ? -1 : 1;

    $('cbgNVal').textContent       = inp.N;
    $('cbgDlambdaVal').textContent = inp.dL_nm + ' nm';
    $('cbgLambda0Val').textContent = inp.L0_nm + ' nm';
    $('cbgNeffVal').textContent    = inp.neff.toFixed(2);
    $('cbgNgVal').textContent      = inp.ng.toFixed(2);

    $('cbgGddFit').textContent     = r.gddFit.toFixed(4);
    $('cbgGddPhys').textContent    = r.gddPhys.toFixed(4);
    $('cbgGratingLen').textContent = (r.L * 1e3).toFixed(3);
    $('cbgPeriodLen').textContent  = (r.Lambda * 1e9).toFixed(2);

    var signedEl = $('cbgGddSigned');
    var gddSigned = sign * r.gddFit;
    var signChar = sign < 0 ? '−' : '+';
    signedEl.textContent = signChar + Math.abs(gddSigned).toFixed(4);

    var badgeEl = $('cbgDispBadge');
    if (inp.isAnomalous) {
      signedEl.style.color = 'var(--color-primary)';
      badgeEl.innerHTML = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#e8f2fa;color:#2b7abf;">反常色散 Anomalous</span>';
    } else {
      signedEl.style.color = 'var(--color-accent-amber)';
      badgeEl.innerHTML = '<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#fdf3e8;color:#d4782f;">正常色散 Normal</span>';
    }

    var warnEl = $('cbgWarning');
    var warns = [];
    if (inp.N < 10) warns.push('⚠ 周期数过少，光栅反射率可能不足');
    if (inp.N > 10000) warns.push('⚠ 周期数超过 10000，光栅长度较大，注意工艺可行性');
    if (inp.dL_nm < 1) warns.push('⚠ 带宽过窄，色散值极大');
    if (inp.dL_nm > 300) warns.push('⚠ 带宽超过 300 nm，超出典型 CBG 设计范围');
    if (inp.neff < 1.4 || inp.neff > 3.5) warns.push('⚠ 有效折射率值异常，请检查');
    if (r.L * 1e3 > 50) warns.push('⚠ 光栅总长 > 50 mm，注意芯片面积');
    if (warns.length > 0) {
      warnEl.innerHTML = warns.join('<br>');
      warnEl.classList.add('show');
    } else {
      warnEl.classList.remove('show');
    }

    drawChart();
  }

  function applyPreset(btn) {
    var ng   = parseFloat(btn.dataset.ng);
    var neff = parseFloat(btn.dataset.neff);
    if (!isNaN(ng))   $('cbgNg').value   = ng;
    if (!isNaN(neff)) $('cbgNeff').value = neff;
    document.querySelectorAll('#cbgPresets .preset-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    update();
  }

  // ── Chart ─────────────────────────────────────────────────
  function niceStep(range, targetTicks) {
    targetTicks = targetTicks || 5;
    var raw = range / targetTicks;
    var exp = Math.floor(Math.log10(raw));
    var frac = raw / Math.pow(10, exp);
    var nice;
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
    var s = step.toFixed(10);
    var dot = s.indexOf('.');
    if (dot < 0) return 0;
    for (var i = dot + 1; i < s.length; i++) {
      if (s[i] !== '0') return i - dot;
    }
    return 0;
  }

  function drawChart() {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.parentElement.getBoundingClientRect();
    var w_px = rect.width;
    var h_px = 280;

    canvas.width  = w_px * dpr;
    canvas.height = h_px * dpr;
    canvas.style.width  = w_px + 'px';
    canvas.style.height = h_px + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    var pad = { top: 20, right: 36, bottom: 40, left: 64 };
    var pw = w_px - pad.left - pad.right;
    var ph = h_px - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w_px * 2, h_px * 2);

    var inp = readInputs();

    var dLVals = [];
    var nPts = 120;
    var dLMin = Math.max(1, inp.dL_nm * 0.1);
    var dLMax = inp.dL_nm * 3;
    for (var i = 0; i <= nPts; i++) {
      dLVals.push(dLMin + (dLMax - dLMin) * i / nPts);
    }

    var gddCurve = dLVals.map(function(dl) {
      return compute(inp.N, dl, inp.L0_nm, inp.neff, inp.ng).gddFit;
    });

    var gddAtCurrent = compute(inp.N, inp.dL_nm, inp.L0_nm, inp.neff, inp.ng).gddFit;
    var yMax = Math.max.apply(null, gddCurve) * 1.15;
    var yMin = 0;

    function toX(dl) { return pad.left + pw * (dl - dLMin) / (dLMax - dLMin); }
    function toY(y)  { return pad.top  + ph * (1 - (y - yMin) / (yMax - yMin)); }

    ctx.strokeStyle = '#e8ecf1';
    ctx.lineWidth = 0.5;
    var yStep = niceStep(yMax - yMin, 5);
    for (var y = 0; y <= yMax + yStep * 0.001; y += yStep) {
      var ty = toY(y);
      ctx.beginPath(); ctx.moveTo(pad.left, ty); ctx.lineTo(pad.left + pw, ty); ctx.stroke();
    }
    var xStep = niceStep(dLMax - dLMin, 6);
    for (var x = Math.ceil(dLMin / xStep) * xStep; x <= dLMax; x += xStep) {
      var tx = toX(x);
      ctx.beginPath(); ctx.moveTo(tx, pad.top); ctx.lineTo(tx, pad.top + ph); ctx.stroke();
    }

    ctx.strokeStyle = '#c0c6ce';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + ph); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top + ph); ctx.lineTo(pad.left + pw, pad.top + ph); ctx.stroke();

    ctx.fillStyle = '#5f6570';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    for (var x2 = Math.ceil(dLMin / xStep) * xStep; x2 <= dLMax; x2 += xStep) {
      ctx.fillText(x2.toFixed(tickDecimals(xStep)), toX(x2), pad.top + ph + 18);
    }
    ctx.fillText('Δλ Bandwidth (nm)', pad.left + pw/2, pad.top + ph + 34);

    ctx.textAlign = 'right';
    for (var y2 = 0; y2 <= yMax + yStep * 0.001; y2 += yStep) {
      ctx.fillText(y2.toFixed(tickDecimals(yStep)), pad.left - 8, toY(y2) + 4);
    }

    ctx.save();
    ctx.translate(14, pad.top + ph/2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('|GDD| (ps²)', 0, 0);
    ctx.restore();

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var i2 = 0; i2 < dLVals.length; i2++) {
      var cx = toX(dLVals[i2]);
      var cy = toY(gddCurve[i2]);
      if (i2 === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    var cxMark = toX(inp.dL_nm);
    var cyMark = toY(gddAtCurrent);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(cxMark, cyMark, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cxMark, cyMark, 5, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#1a1d23';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    var labelX = cxMark + 10;
    var labelY = cyMark - 10;
    ctx.fillText('N=' + inp.N + '  Δλ=' + inp.dL_nm.toFixed(1) + ' nm', labelX, labelY);
    ctx.fillText('|GDD|=' + gddAtCurrent.toFixed(4) + ' ps²', labelX, labelY + 16);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cxMark, pad.top); ctx.lineTo(cxMark, pad.top + ph); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    canvas = $('cbgChart');
    ctx = canvas.getContext('2d');

    ['cbgN', 'cbgDlambda', 'cbgLambda0', 'cbgNeff', 'cbgNg'].forEach(function(id) {
      $(id).addEventListener('input', update);
    });

    document.querySelectorAll('#cbgChirpGroup .preset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#cbgChirpGroup .preset-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        update();
      });
    });

    document.querySelectorAll('#cbgPresets .preset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { applyPreset(btn); });
    });

    window.addEventListener('resize', function() { drawChart(); });

    update();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
