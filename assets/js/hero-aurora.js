/* Hero aurora · gradiente animado autocontenido (canvas 2D), colores de marca.
   Ligero, pausa con la pestaña oculta y respeta prefers-reduced-motion. */
(function () {
  var c = document.querySelector('.hero-canvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  if (!ctx) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // manchas de color (tonos claros de marca: salvia, durazno, miel, verde)
  var blobs = [
    { col: '#CFE3D3', x: 0.18, y: 0.30, r: 0.72, ax: 0.000060, ay: 0.000041, px: 0.0, py: 1.1 },
    { col: '#F0D6BE', x: 0.82, y: 0.38, r: 0.78, ax: 0.000052, ay: 0.000069, px: 2.0, py: 0.4 },
    { col: '#ECDAA6', x: 0.52, y: 0.82, r: 0.66, ax: 0.000045, ay: 0.000050, px: 4.0, py: 3.0 },
    { col: '#D8E7CC', x: 0.64, y: 0.16, r: 0.60, ax: 0.000071, ay: 0.000033, px: 1.0, py: 5.0 }
  ];
  function size() {
    var r = c.getBoundingClientRect();
    var d = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * d));
    c.height = Math.max(1, Math.round(r.height * d));
  }
  size();
  window.addEventListener('resize', size);
  function draw(t) {
    var W = c.width, H = c.height, m = Math.max(W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#F7F0E2';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var cx = (b.x + Math.sin(t * b.ax + b.px) * 0.14) * W;
      var cy = (b.y + Math.cos(t * b.ay + b.py) * 0.14) * H;
      var rr = b.r * m;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, b.col + 'd0');
      g.addColorStop(1, b.col + '00');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }
  if (reduce) { draw(0); return; }
  var running = true;
  function loop() { if (!running) return; draw(performance.now()); requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) loop();
  });
  loop();
})();
