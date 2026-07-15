/* ═══════════════════════════════════════════════════════════════
   Wafer Die Calculator
   Center-aligned grid method for gross die estimation
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var canvas, ctx;
  var CANVAS_SIZE = 500;

  function calculate() {
    var sizeInch   = parseFloat($('wfSize').value);
    var dieX       = parseFloat($('wfDieX').value);
    var dieY       = parseFloat($('wfDieY').value);
    var scribe     = parseFloat($('wfScribe').value);
    var edgeMargin = parseFloat($('wfEdge').value);

    if (!dieX || !dieY || dieX <= 0 || dieY <= 0) return;

    var waferDiameterMm = sizeInch * 25.4;
    var waferRadius = waferDiameterMm / 2;
    var effectiveRadius = waferRadius - edgeMargin;

    var stepX = dieX + scribe;
    var stepY = dieY + scribe;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var scale = canvas.width / (waferDiameterMm * 1.05);
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;

    drawCircle(centerX, centerY, waferRadius * scale, '#333', '#555');
    drawCircle(centerX, centerY, effectiveRadius * scale, 'transparent', '#d63031', 1);

    var maxCol = Math.floor(waferRadius / stepX) + 1;
    var maxRow = Math.floor(waferRadius / stepY) + 1;

    var goodDies = 0;
    var partialDies = 0;

    for (var col = -maxCol; col <= maxCol; col++) {
      for (var row = -maxRow; row <= maxRow; row++) {
        var dieCenterX = col * stepX;
        var dieCenterY = row * stepY;

        var halfDieX = dieX / 2;
        var halfDieY = dieY / 2;

        var p1 = { x: dieCenterX - halfDieX, y: dieCenterY - halfDieY };
        var p2 = { x: dieCenterX + halfDieX, y: dieCenterY - halfDieY };
        var p3 = { x: dieCenterX + halfDieX, y: dieCenterY + halfDieY };
        var p4 = { x: dieCenterX - halfDieX, y: dieCenterY + halfDieY };

        var d1 = Math.sqrt(p1.x*p1.x + p1.y*p1.y);
        var d2 = Math.sqrt(p2.x*p2.x + p2.y*p2.y);
        var d3 = Math.sqrt(p3.x*p3.x + p3.y*p3.y);
        var d4 = Math.sqrt(p4.x*p4.x + p4.y*p4.y);

        var isInside = (d1 <= effectiveRadius && d2 <= effectiveRadius &&
                        d3 <= effectiveRadius && d4 <= effectiveRadius);

        var distCenter = Math.sqrt(dieCenterX*dieCenterX + dieCenterY*dieCenterY);
        var isVisible = distCenter < (waferRadius + Math.max(dieX, dieY));

        if (isVisible) {
          var drawX = centerX + p1.x * scale;
          var drawY = centerY + p1.y * scale;
          var drawW = dieX * scale;
          var drawH = dieY * scale;

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

    var dieArea = dieX * dieY;
    var waferArea = Math.PI * waferRadius * waferRadius;
    var totalDieArea = goodDies * dieArea;
    var util = (totalDieArea / waferArea) * 100;
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

  function init() {
    canvas = $('wfCanvas');
    ctx = canvas.getContext('2d');

    $('wfSize').addEventListener('change', calculate);
    $('wfDieX').addEventListener('input', calculate);
    $('wfDieY').addEventListener('input', calculate);
    $('wfScribe').addEventListener('input', calculate);
    $('wfEdge').addEventListener('input', calculate);

    window.addEventListener('resize', function() { calculate(); });

    calculate();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
