/* Nidito · lógica compartida del sitio (sin dependencias) */
(function () {
  'use strict';
  const CFG = window.NIDITO || {};
  const MARCA = CFG.marca || 'Nidito';
  const page = document.body.dataset.page || '';
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$ ' + Math.round(n).toLocaleString('es-CO');
  // precio según el tamaño elegido (Grande suma el recargo; Mediana = precio base)
  const precioDe = (p, v) => Math.round((p.precio || 0) + (/grande/i.test(v || '') ? (CFG.recargoGrande || 0) : 0) + (/historia completa/i.test(v || '') ? (CFG.recargoReverso || 3000) : /reverso: minimal/i.test(v || '') ? 2000 : 0));
  const img = (id) => `assets/img/productos/${id}.svg`;
  const IMGV = '4';  // sube este número cuando cambien las imágenes (evita caché vieja)
  const foto = (p) => esc((p.imagen || img(p.id)) + '?v=' + IMGV);
  // miniatura WebP liviana para la vitrina y el carrito (cae a la imagen grande si falta)
  const thumb = (p) => esc('assets/img/productos/thumb/' + p.id + '.webp?v=' + IMGV);
  const FALLBACK = (p) => `onerror="this.onerror=null;this.src='assets/img/productos/${esc(p.id)}.jpg?v=${IMGV}'"`;
  const SIN_FOTO = `onerror="this.onerror=null;this.src='assets/img/marca/mark.png'"`;

  /* ---------- logo (símbolo de marca) ---------- */
  const LOGO = `<img class="brand-icon" src="assets/img/marca/mark.png" alt="" width="46" height="24">`;

  /* ---------- Supabase (opcional) ---------- */
  const SUPA = CFG.supabaseUrl && CFG.supabaseAnonKey;
  async function supa(ruta) {
    const r = await fetch(`${CFG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${ruta}`, { headers: { apikey: CFG.supabaseAnonKey }, cache: 'no-store' });
    if (!r.ok) throw new Error('Supabase ' + r.status);
    return r.json();
  }

  /* ---------- almacenamiento seguro ---------- */
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };

  /* ---------- iconos ---------- */
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 11l8-6 8 6v9H4z"/></svg>',
    shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 13h16M12 9v11M12 9S10 3 7.5 4.2 10.5 9 12 9zM12 9s2-6 4.5-4.8S13.5 9 12 9z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" width="17" height="17"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  };

  /* ---------- encabezado, navegación y pie ---------- */
  const NAV = [
    ['index.html', 'Inicio', 'home'],
    ['tienda.html', 'Tienda', 'shop'],
    ['regalos.html', 'Regalos', 'gift'],
    ['historia.html', 'Nosotros', 'heart'],
  ];
  const isCur = (href) => { const b = href.replace('.html', ''); return (b === 'index' ? 'inicio' : b) === page; };
  function chrome() {
    const header = $('#site-header');
    if (header) {
      header.innerHTML = `
      <div class="wrap">
        <a class="brand" href="index.html" aria-label="${esc(MARCA)}, inicio">
          ${LOGO}<span class="brand-name">${esc(MARCA)}</span>
        </a>
        <nav class="main-nav" aria-label="Principal">
          ${NAV.map(([href, label]) => `<a href="${href}"${isCur(href) ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
        </nav>
        <form class="search" action="tienda.html" role="search">
          ${I.search}<label class="sr-only" for="q">Buscar en la tienda</label>
          <input id="q" name="q" type="search" placeholder="Busca tu pueblo, paisaje o sabor…">
        </form>
        <div class="header-actions">
          <a class="icon-btn" href="panel.html" aria-label="Acceso administración" title="Acceso administración">${I.user}</a>
          <a class="icon-btn" href="carrito.html" aria-label="Carrito">${I.bag}<span class="badge" data-cart-count></span></a>
        </div>
      </div>`;
    }
    const bottom = $('#bottom-nav');
    if (bottom) {
      const items = [NAV[0], NAV[1], ['carrito.html', 'Carrito', 'bag']];
      bottom.innerHTML = items.map(([href, label, icon]) => {
        const cur = isCur(href);
        return `<a href="${href}"${cur ? ' aria-current="page"' : ''}><span class="ico">${I[icon]}${icon === 'bag' ? '<span class="badge" data-cart-count></span>' : ''}</span>${label}</a>`;
      }).join('');
    }
    const footer = $('#site-footer');
    if (footer) {
      footer.innerHTML = `
      <div class="wrap">
        <div class="foot-brand-col">
          <span class="foot-brand"><img class="brand-icon" src="assets/img/marca/mark-light.png" alt="" width="46" height="24"><span class="brand-name">${esc(MARCA)}</span></span>
          <p class="foot-desc">${esc(CFG.lema || '')}. Bolsos con los pueblos, paisajes, raíces y cultura de Colombia. Envíos a todo el país.</p>
        </div>
        <nav class="foot-cols" aria-label="Pie de página">
          <div class="foot-col">
            <h4>Explora</h4>
            <a href="tienda.html">Tienda</a>
            <a href="regalos.html">Regalos</a>
            <a href="historia.html">Nuestra historia</a>
          </div>
          <div class="foot-col">
            <h4>Ayuda</h4>
            <a href="envios.html">Envíos y devoluciones</a>
            <a href="privacidad.html">Tratamiento de datos</a>
            <a href="contacto.html">Contacto</a>
          </div>
          <div class="foot-col">
            <h4>Síguenos</h4>
            <a href="https://wa.me/${CFG.whatsapp}" rel="noopener">WhatsApp</a>
            ${CFG.instagram ? `<a href="${esc(CFG.instagram)}" rel="noopener">Instagram</a>` : ''}
            <a href="panel.html">Acceso</a>
          </div>
        </nav>
      </div>`;
    }
  }

  /* ---------- carrito ---------- */
  const Cart = {
    items() { return store.get('nido_cart', []); },
    save(items) { store.set('nido_cart', items); updateBadges(); },
    add(id, variante, qty) {
      const items = this.items();
      const key = id + '|' + (variante || '');
      const found = items.find((i) => i.key === key);
      if (found) found.qty = Math.min(50, found.qty + qty); else items.push({ key, id, variante: variante || '', qty });
      this.save(items);
    },
    setQty(key, qty) { const items = this.items().map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(50, qty)) } : i)); this.save(items); },
    remove(key) { this.save(this.items().filter((i) => i.key !== key)); },
    count() { return this.items().reduce((a, i) => a + i.qty, 0); },
    clear() { this.save([]); },
  };
  let ultimoConteo = null;
  function updateBadges() {
    const n = Cart.count();
    $$('[data-cart-count]').forEach((b) => {
      b.textContent = n; b.classList.toggle('on', n > 0);
      if (ultimoConteo !== null && n > ultimoConteo) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
    ultimoConteo = n;
  }
  let toastTimer;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- código de descuento (?ref=CODIGO) ---------- */
  const params = new URLSearchParams(location.search);
  if (params.get('ref')) store.set('nido_ref', params.get('ref').toUpperCase().slice(0, 24));

  /* ---------- datos ---------- */
  let DATA = null;
  async function data() {
    if (DATA) return DATA;
    if (SUPA) {
      try {
        const [categorias, productos] = await Promise.all([supa('categorias?select=id,nombre,detalle,imagen&order=orden'), supa('catalogo?select=*&order=nombre')]);
        DATA = { categorias, productos };
        return DATA;
      } catch (e) { /* si Supabase falla, se usa el catálogo del archivo */ }
    }
    const r = await fetch('data/productos.json', { cache: 'no-cache' });
    DATA = await r.json();
    return DATA;
  }
  const fotoCat = (c) => {
    if (c.imagen && c.imagen.includes('/')) return esc(c.imagen);
    const p = (c.imagen && DATA.productos.find((x) => x.id === c.imagen)) || DATA.productos.find((x) => x.categoria === c.id);
    return p ? foto(p) : (c.imagen ? img(c.imagen) : 'assets/img/marca/mark.png');
  };
  const catName = (id) => (DATA.categorias.find((c) => c.id === id) || {}).nombre || id;

  // costura de marca: al pasar el cursor se "cose" el borde de la lona (trama)
  const SPARK = '<svg class="seam" viewBox="0 0 100 176" preserveAspectRatio="none" aria-hidden="true"><rect x="3" y="3" width="94" height="170" rx="8" vector-effect="non-scaling-stroke"/></svg>';
  const nubes = (n) => (n ? `<span class="arisquez" role="img" aria-label="Suavidad ${n} de 5">${[1, 2, 3, 4, 5].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>` : '');
  const AL_AGREGAR = ['Agregado al carrito', 'Listo, buena elección.', 'Ya está en tu carrito.', 'Añadido · ¡lleva tu tierra contigo!'];
  const azar = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function card(p) {
    let tag = '';
    if (p.preventa) tag = '<span class="tag tag-peach">Preventa</span>';
    else if (p.nuevo) tag = '<span class="tag tag-mint">Nuevo</span>';
    const desde = p.variantes ? '<small class="desde">desde</small> ' : '';
    return `<a class="panel brackets card" href="producto.html?id=${encodeURIComponent(p.id)}">
      <div class="media">${tag}${SPARK}<img src="${thumb(p)}" ${FALLBACK(p)} alt="${esc(p.nombre)}" loading="lazy" width="420" height="741"></div>
      <span class="cat-label">${p.codigo ? '<b class="cod">' + esc(p.codigo) + '</b> · ' : ''}${esc(catName(p.categoria))}${p.linea ? ' · ' + esc(p.linea) : ''}</span>
      <h3>${esc(p.nombre)}</h3>
      <div class="meta"><span class="price">${desde}${money(p.precio)}${p.precioAntes ? `<s>${money(p.precioAntes)}</s>` : ''}</span>${nubes(p.suavidad)}</div>
    </a>`;
  }

  /* ---------- cuenta regresiva de la nueva colección ---------- */
  function countdown() {
    const box = $('[data-countdown]');
    if (!box) return;
    const end = new Date(CFG.dropAbre).getTime();
    const d = $('[data-d]', box), h = $('[data-h]', box), m = $('[data-m]', box);
    const pad = (n) => String(n).padStart(2, '0');
    function tick() {
      const left = Math.max(0, end - Date.now());
      d.textContent = pad(Math.floor(left / 864e5));
      h.textContent = pad(Math.floor(left / 36e5) % 24);
      m.textContent = pad(Math.floor(left / 6e4) % 60);
      if (left === 0) { const s = $('[data-drop-status]'); if (s) s.textContent = '¡Ya está disponible!'; }
    }
    tick(); setInterval(tick, 30000);
  }

  /* ---------- páginas ---------- */
  async function home() {
    const D = await data();
    const cats = $('#cats');
    if (cats) cats.innerHTML = D.categorias.map((c) => `
      <a class="panel brackets cat" href="tienda.html?cat=${c.id}">
        <small>${esc(c.detalle)}</small>
        <img src="${fotoCat(c)}" ${SIN_FOTO} alt="" loading="lazy" width="88" height="88">
        <strong>${esc(c.nombre)}</strong>
      </a>`).join('');
    const feat = $('#destacados');
    if (feat) feat.innerHTML = D.productos.filter((p) => p.destacado).slice(0, 8).map(card).join('');
  }

  async function tienda() {
    const D = await data();
    const secWrap = $('#secciones'), chips = $('#chips'), grid = $('#grid'), q = $('#q'), sort = $('#sort'), count = $('#count');
    const SECS = D.secciones || [];
    let sec = params.get('sec') || 'todo';
    let cat = params.get('cat') || 'todo';
    q.value = params.get('q') || '';
    // pastillas de sección (Santander · Municipios · Cultura colombiana · …)
    if (secWrap && SECS.length > 1) {
      const sopts = [{ id: 'todo', nombre: 'Todo' }].concat(SECS);
      secWrap.innerHTML = sopts.map((s) => `<button type="button" class="seg" data-sec="${s.id}" aria-pressed="${s.id === sec}">${esc(s.nombre)}</button>`).join('');
    }
    const filtro = $('#filtro');
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const inSec = (p) => sec === 'todo' || p.seccion === sec || (!p.seccion && sec === 'santander');
    const catIdsEnSec = (sid) => new Set(D.productos.filter((p) => sid === 'todo' || p.seccion === sid || (!p.seccion && sid === 'santander')).map((p) => p.categoria));
    function catsFor() {
      const ids = catIdsEnSec(sec);
      return [{ id: 'todo', nombre: 'Todo' }].concat(D.categorias.filter((c) => ids.has(c.id)));
    }
    // Temas que agrupan las secciones en el acordeón de la tienda
    const TEMAS = [
      { label: 'Santander nuestro', secs: ['santander', 'municipios', 'parques-bga', 'cabra-criolla', 'guanenta'] },
      { label: 'Colombia entera', secs: ['cultura-co', 'departamentos', 'colombia', 'destinos', 'bogota'] },
      { label: 'Riquezas de Colombia', secs: ['riquezas', 'esmeraldas'] },
      { label: 'Flora y fauna', secs: ['flora-fauna', 'flora', 'fauna', 'colombia-viva'] },
      { label: 'Arte y leyendas', secs: ['colombia-surrealista', 'mitos-leyendas', 'entre-lineas', 'raices'] },
    ];
    // Acordeón de colecciones → subcategorías (en la tienda)
    function grupoHTML(s) {
      const cats = D.categorias.filter((c) => catIdsEnSec(s.id).has(c.id));
      const subs = cats.length > 1 ? `<div class="acc-subs">${cats.map((c) => `<button type="button" class="acc-sub${sec === s.id && cat === c.id ? ' activo' : ''}" data-sec="${s.id}" data-cat="${c.id}">${esc(c.nombre)}</button>`).join('')}</div>` : '';
      return `<div class="acc-grupo${sec === s.id ? ' abierto' : ''}"><button type="button" class="acc-head${sec === s.id && cat === 'todo' ? ' activo' : ''}" data-sec="${s.id}" data-cat="todo">${esc(s.nombre)}${cats.length > 1 ? '<span class="acc-ico" aria-hidden="true">▾</span>' : ''}</button>${subs}</div>`;
    }
    function drawAcordeon() {
      if (!filtro) return;
      const porId = Object.fromEntries(SECS.map((s) => [s.id, s]));
      const usados = new Set();
      let html = `<button type="button" class="acc-todo${sec === 'todo' ? ' activo' : ''}" data-sec="todo" data-cat="todo">Todas las colecciones</button>`;
      TEMAS.forEach((t) => {
        const ss = t.secs.filter((id) => porId[id]);
        if (!ss.length) return;
        html += `<p class="acc-tema">${esc(t.label)}</p>`;
        ss.forEach((id) => { usados.add(id); html += grupoHTML(porId[id]); });
      });
      const resto = SECS.filter((s) => !usados.has(s.id));
      if (resto.length) { html += `<p class="acc-tema">Más colecciones</p>`; resto.forEach((s) => { html += grupoHTML(s); }); }
      filtro.innerHTML = html;
    }
    function drawChips() {
      if (filtro) { chips.innerHTML = ''; return; }  // en la tienda manda el acordeón
      const cs = catsFor();
      chips.innerHTML = (sec === 'todo' || cs.length <= 2) ? '' : cs.map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === cat}">${esc(c.nombre)}</button>`).join('');
    }
    function render() {
      const term = norm(q.value.trim());
      let list = D.productos.filter((p) => inSec(p) && (cat === 'todo' || p.categoria === cat) && (!term || norm(p.nombre + ' ' + p.descripcion + ' ' + catName(p.categoria) + ' ' + (p.codigo || '')).includes(term)));
      const sv = sort ? sort.value : 'relevancia';
      if (sv === 'menor') list.sort((a, b) => a.precio - b.precio);
      else if (sv === 'mayor') list.sort((a, b) => b.precio - a.precio);
      else list.sort((a, b) => (b.stock > 0) - (a.stock > 0) || (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
      grid.innerHTML = list.length ? list.map(card).join('') : `<div class="empty" style="grid-column:1/-1">${window.nidoSVG ? nidoSVG('grande') : ''}<p>No encontramos nada con esa palabra. Prueba con otra.</p></div>`;
      if (count) count.textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
      const u = new URL(location.href);
      sec === 'todo' ? u.searchParams.delete('sec') : u.searchParams.set('sec', sec);
      cat === 'todo' ? u.searchParams.delete('cat') : u.searchParams.set('cat', cat);
      q.value ? u.searchParams.set('q', q.value) : u.searchParams.delete('q');
      history.replaceState(null, '', u);
    }
    if (secWrap) secWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sec]'); if (!b) return;
      sec = b.dataset.sec; cat = 'todo';
      $$('.seg', secWrap).forEach((x) => x.setAttribute('aria-pressed', x === b));
      drawChips(); render();
    });
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      cat = b.dataset.cat; $$('.chip', chips).forEach((c) => c.setAttribute('aria-pressed', c === b));
      render();
    });
    const filtroToggle = $('#filtro-toggle');
    if (filtroToggle && filtro) filtroToggle.addEventListener('click', () => {
      const abierto = filtro.classList.toggle('abierta');
      filtroToggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    if (filtro) filtro.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sec]'); if (!b) return;
      const headConSubs = b.classList.contains('acc-head') && !!b.parentElement.querySelector('.acc-subs');
      sec = b.dataset.sec; cat = b.dataset.cat || 'todo';
      drawAcordeon(); render();
      // en móvil: cerrar el panel tras una selección final (no al abrir un grupo con subcategorías)
      if (filtroToggle && !headConSubs) { filtro.classList.remove('abierta'); filtroToggle.setAttribute('aria-expanded', 'false'); }
    });
    q.addEventListener('input', render); if (sort) sort.addEventListener('change', render);
    const qForm = q.closest('form'); if (qForm) qForm.addEventListener('submit', (e) => e.preventDefault());
    drawAcordeon(); drawChips(); render();
  }

  async function producto() {
    const D = await data();
    const p = D.productos.find((x) => x.id === params.get('id'));
    const root = $('#producto');
    if (!p) { root.innerHTML = `<div class="empty">${window.nidoSVG ? nidoSVG('grande') : ''}<p>No encontramos este bolso.</p><a class="btn btn-primary" href="tienda.html">Volver a la tienda</a></div>`; return; }
    document.title = p.nombre + ' · ' + MARCA;
    // SEO por producto: descripción, Open Graph y datos estructurados (Product)
    (function seo() {
      const absImg = new URL((p.imagen || img(p.id)), location.href).href;
      const desc = (p.descripcion || '').slice(0, 160);
      const setMeta = (sel, attr, val) => { let m = document.head.querySelector(sel); if (!m) { m = document.createElement('meta'); const [k, v] = sel.replace(/[\[\]]/g, '').split('='); m.setAttribute(k, v.replace(/"/g, '')); document.head.appendChild(m); } m.setAttribute(attr, val); };
      setMeta('meta[name="description"]', 'content', desc);
      setMeta('meta[property="og:title"]', 'content', p.nombre + ' · ' + MARCA);
      setMeta('meta[property="og:description"]', 'content', desc);
      setMeta('meta[property="og:image"]', 'content', absImg);
      setMeta('meta[property="og:url"]', 'content', location.href);
      const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.nombre, image: [absImg], description: p.descripcion || '', brand: { '@type': 'Brand', name: MARCA }, category: catName(p.categoria), offers: { '@type': 'Offer', priceCurrency: 'COP', price: p.precio, availability: 'https://schema.org/InStock', url: location.href } };
      const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    })();
    let variante = p.variantes ? p.variantes.opciones[0] : '';
    let reverso = 'Sin texto';   // predeterminado (precio = catálogo; Minimal/Historia suman)
    const REVDESC = {
      'Sin texto': 'Solo el diseño; el reverso queda limpio.',
      'Minimal': 'Marca + «Lleva tu tierra contigo» atrás. El poema completo va en la tarjeta.',
      'Historia completa': 'El manifiesto de Trama de Aquí, estampado en el reverso (+' + money(CFG.recargoReverso || 3000) + ').'
    };
    const varFull = () => (variante ? variante + ' · ' : '') + 'Reverso: ' + reverso;
    let qty = 1;
    const out = p.stock <= 0;
    const niveles = ['', 'Suave', 'Muy suave', 'Suavísimo', 'Como una nube', 'Pura ternura'];
    root.innerHTML = `
      <div class="viewer-col">
        <div class="panel brackets viewer" style="position:relative">
          <span class="ring a" aria-hidden="true"></span><span class="ring b" aria-hidden="true"></span><span class="ring c" aria-hidden="true"></span>
          <img src="${foto(p)}" ${SIN_FOTO} alt="${esc(p.nombre)}" width="300" height="300">
          <span class="viewer-cap" id="viewer-cap" hidden></span>
        </div>
        <div class="miniaturas" id="miniaturas">
          <button type="button" class="mini activa" data-face="frente"><img src="${foto(p)}" ${SIN_FOTO} alt="Frente"><span>Frente</span></button>
          <button type="button" class="mini" data-face="reverso"><img id="mini-rev-img" src="assets/img/reverso/sin-texto.jpg" alt="Reverso"><span>Reverso</span></button>
          <button type="button" class="mini" data-face="lona"><img src="assets/img/reverso/lona.jpg" alt="Detalle de la tela" loading="lazy"><span>Detalle</span></button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:18px">
        <p class="eyebrow"><a href="tienda.html?cat=${p.categoria}" style="color:inherit">${esc(catName(p.categoria))}</a>${p.linea ? ' · ' + esc(p.linea) : ''}${p.codigo ? ' · <span style="letter-spacing:.08em">Cód. ' + esc(p.codigo) + '</span>' : ''}</p>
        <h1 class="h-display" style="font-size:clamp(32px,5vw,50px)">${esc(p.nombre)}</h1>
        <div class="price" id="p-precio" style="font-size:26px">${money(precioDe(p, varFull()))}${p.precioAntes ? `<s style="font-size:15px">${money(p.precioAntes)}</s>` : ''}</div>
        ${p.humor ? `<blockquote class="humor"><span>Nota de ${esc(MARCA)}</span>${esc(p.humor)}</blockquote>` : ''}
        <p style="margin:0;color:var(--text-2)">${esc(p.descripcion)}</p>
        ${p.suavidad ? `<div class="arisquez-box"><small>Suavidad</small>${nubes(p.suavidad)}<b>${p.suavidad}/5</b><em>${niveles[p.suavidad]}</em></div>` : ''}
        ${p.limitado ? `<span class="tag tag-peach" style="align-self:flex-start">${esc(p.limitado)}</span>` : ''}
        <div class="specs">${Object.entries(p.atributos || {}).map(([k, v]) => `<div class="spec"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>
        ${p.variantes ? `<div><p class="eyebrow" id="var-label" style="margin-bottom:8px">${esc(p.variantes.nombre)}</p>
          <div class="segmented" role="radiogroup" aria-labelledby="var-label">${p.variantes.opciones.map((o, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-v="${esc(o)}">${esc(o)} · ${money(precioDe(p, o))}</button>`).join('')}</div></div>` : ''}
        <div><p class="eyebrow" id="rev-label" style="margin-bottom:8px">Reverso del bolso</p>
          <div class="segmented" role="radiogroup" aria-labelledby="rev-label">${(() => { const RR = { 'Minimal': 2000, 'Historia completa': (CFG.recargoReverso || 3000) }; return ['Sin texto','Minimal','Historia completa'].map((o) => `<button type="button" role="radio" aria-checked="${o === reverso}" data-r="${esc(o)}">${esc(o)}${RR[o] ? ' · +' + money(RR[o]) : ''}</button>`).join(''); })()}</div>
          <p class="note" id="rev-desc" style="margin-top:6px">${REVDESC[reverso]}</p></div>
        ${out ? '<div class="alert alert-amber"><span class="dot"></span>Agotado por ahora. Escríbenos y te avisamos cuando vuelva.</div>'
          : p.preventa ? `<div class="alert alert-peach"><span class="dot"></span>Preventa · ${esc(p.preventa)}</div>`
          : `<div class="alert alert-mint"><span class="dot"></span>Hecho bajo pedido · lo imprimimos para ti en ${esc(CFG.bajoPedidoDias || '3 a 5 días hábiles')}.</div>`}
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
          <div class="qty"><button type="button" data-q="-1" aria-label="Quitar uno">−</button><output aria-live="polite" id="qty">1</output><button type="button" data-q="1" aria-label="Agregar uno">+</button></div>
          ${out ? `<a class="btn btn-ghost" href="https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent('Hola, avísenme cuando vuelva: ' + p.nombre)}" rel="noopener">Avísame cuando vuelva</a>`
            : '<button type="button" class="btn btn-primary" id="add" style="flex:1;min-width:200px">Agregar al carrito</button>'}
        </div>
        <p class="note">Envío ${money(CFG.envioValor)} a toda Colombia · gratis desde ${money(CFG.envioGratisDesde)} · ¿es un regalo? lo empacamos con tarjeta.</p>
      </div>`;
    const precioEl = $('#p-precio', root);
    // Hilo de producto: Frente · Reverso · Lona
    const vimg = $('.viewer img', root);
    const vcap = $('#viewer-cap', root);
    const miniRevImg = $('#mini-rev-img', root);
    const frontSrc = vimg ? vimg.src : '';
    const backSrc = { 'Sin texto': 'assets/img/reverso/sin-texto.jpg', 'Minimal': 'assets/img/reverso/minimal.jpg', 'Historia completa': 'assets/img/reverso/historia.jpg' };
    function mostrarCara(f) {
      if (vimg) vimg.src = (f === 'reverso') ? backSrc[reverso] : (f === 'lona') ? 'assets/img/reverso/lona.jpg' : frontSrc;
      if (vcap) { if (f === 'frente') { vcap.hidden = true; } else { vcap.textContent = (f === 'reverso') ? ('Reverso · ' + reverso) : 'La textura, de cerca'; vcap.hidden = false; } }
      $$('.mini', root).forEach((m) => m.classList.toggle('activa', m.dataset.face === f));
    }
    function verReverso() { if (miniRevImg) miniRevImg.src = backSrc[reverso]; mostrarCara('reverso'); }
    $$('.mini', root).forEach((m) => m.addEventListener('click', () => { if (m.dataset.face === 'reverso' && miniRevImg) miniRevImg.src = backSrc[reverso]; mostrarCara(m.dataset.face); }));
    $$('[data-v]', root).forEach((b) => b.addEventListener('click', () => {
      variante = b.dataset.v; $$('[data-v]', root).forEach((x) => x.setAttribute('aria-checked', x === b));
      if (precioEl) precioEl.innerHTML = money(precioDe(p, varFull())) + (p.precioAntes ? `<s style="font-size:15px">${money(p.precioAntes)}</s>` : '');
    }));
    $$('[data-r]', root).forEach((b) => b.addEventListener('click', () => {
      reverso = b.dataset.r; $$('[data-r]', root).forEach((x) => x.setAttribute('aria-checked', x === b));
      const rd = $('#rev-desc', root); if (rd) rd.textContent = REVDESC[reverso];
      if (precioEl) precioEl.innerHTML = money(precioDe(p, varFull())) + (p.precioAntes ? `<s style="font-size:15px">${money(p.precioAntes)}</s>` : '');
      verReverso();   // muestra el reverso según la opción elegida
    }));
    $$('[data-q]', root).forEach((b) => b.addEventListener('click', () => {
      qty = Math.max(1, qty + Number(b.dataset.q)); $('#qty').textContent = qty;
    }));
    const add = $('#add');
    if (add) add.addEventListener('click', () => { Cart.add(p.id, varFull(), qty); if (window.nidoCelebra) window.nidoCelebra(); toast(azar(AL_AGREGAR)); });
    const rel = $('#relacionados');
    if (rel) {
      const mismos = D.productos.filter((x) => x.categoria === p.categoria && x.id !== p.id);
      const extra = mismos.length < 4 ? D.productos.filter((x) => x.seccion === p.seccion && x.categoria !== p.categoria && x.id !== p.id) : [];
      rel.innerHTML = mismos.concat(extra).slice(0, 4).map(card).join('');
      const rt = $('#rel-titulo'); if (rt) rt.textContent = 'Más de ' + catName(p.categoria);
    }
  }

  function pago() {
    const root = $('#pago'); if (!root) return;
    const p = store.get('nido_pedido', null); const ref = params.get('ref');
    if (!p || (ref && p.referencia !== ref)) {
      root.innerHTML = `<div class="empty">${window.nidoSVG ? nidoSVG('grande') : ''}<p>No encontramos ese pedido en este dispositivo. Si ya pagaste, escríbenos con tu referencia.</p><a class="btn btn-primary" href="https://wa.me/${CFG.whatsapp}" rel="noopener">Escribir por WhatsApp</a></div>`;
      return;
    }
    const num = String(CFG.nequi || '').replace(/\D/g, '');
    const numBonito = num.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    const lineas = (p.items || []).map((i) => `• ${i.cant} × ${i.codigo ? '[' + i.codigo + '] ' : ''}${i.nombre}${i.variante ? ' (' + i.variante + ')' : ''} — ${money(i.cant * i.precio)}`);
    const msg = [`¡Hola, ${MARCA}! Ya pagué mi pedido con Nequi.`, '', `Referencia: ${p.referencia}`, `Valor pagado: ${money(p.total)}`, '', ...lineas, '', `Nombre: ${p.nombre}`, `Celular: ${p.telefono}`, `Ciudad: ${p.ciudad}`, `Dirección: ${p.direccion}`, p.regalo ? `Mensaje de regalo: ${p.regalo}` : '', p.nota ? `Notas: ${p.nota}` : '', '', 'Les adjunto el comprobante.'].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    root.innerHTML = `
      <div class="pago-layout">
        <div class="panel brackets pago-caja">
          <div class="pago-total"><small>Valor a enviar</small><b>${money(p.total)}</b><span>Referencia <strong>${esc(p.referencia)}</strong></span></div>
          ${CFG.nequiQR ? `<div class="pago-qr"><img src="${esc(CFG.nequiQR)}" alt="Código QR de Nequi de ${esc(MARCA)}"><span>Escanéalo desde la app Nequi</span></div>` : ''}
          <div class="pago-dato"><small>Número Nequi</small><b>${esc(numBonito)}</b><button type="button" class="btn btn-ghost btn-sm" data-copiar="${esc(num)}">Copiar número</button></div>
          <div class="pago-dato"><small>A nombre de</small><b>${esc(CFG.nequiTitular || '')}</b></div>
          <div class="pago-dato"><small>Valor exacto</small><b>${money(p.total)}</b><button type="button" class="btn btn-ghost btn-sm" data-copiar="${p.total}">Copiar valor</button></div>
          <ol class="pasos-pago">
            <li>Abre tu app <b>Nequi</b> y toca <b>Envía</b>.</li>
            <li>Escribe el número <b>${esc(numBonito)}</b> y el valor <b>${money(p.total)}</b>.</li>
            <li>En el mensaje del envío escribe tu referencia <b>${esc(p.referencia)}</b>.</li>
            <li>Toma captura del comprobante y tócanos el botón de abajo.</li>
          </ol>
          <a class="btn btn-primary" style="width:100%" href="https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Ya pagué · enviar comprobante</a>
          <p class="note" style="margin:10px 0 0">Apenas confirmemos el pago te avisamos y despachamos tu pedido.</p>
        </div>
        <aside class="panel brackets pago-resumen">
          <h2 class="h-section" style="font-size:19px;margin:0 0 10px">Tu pedido</h2>
          ${(p.items || []).map((i) => `<div class="summary-row"><span>${i.cant} × ${i.codigo ? '<b>' + esc(i.codigo) + '</b> ' : ''}${esc(i.nombre)}${i.variante ? ' · ' + esc(i.variante) : ''}</span><span>${money(i.cant * i.precio)}</span></div>`).join('')}
          ${p.descuento ? `<div class="summary-row"><span>Código ${esc(p.codigo || '')}</span><span>− ${money(p.descuento)}</span></div>` : ''}
          <div class="summary-row"><span>Envío</span><span>${p.envio ? money(p.envio) : 'Gratis'}</span></div>
          <div class="summary-row total"><span>Total</span><span>${money(p.total)}</span></div>
          ${p.regalo ? `<p class="note" style="margin-top:12px">🎁 Mensaje de regalo: «${esc(p.regalo)}»</p>` : ''}
          <p class="note" style="margin-top:12px">Envío a: ${esc(p.nombre)} · ${esc(p.ciudad)} · ${esc(p.direccion)}</p>
        </aside>
      </div>`;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-copiar]'); if (!b) return;
      const t = b.dataset.copiar;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copiado: ' + t), () => toast(t));
    });
  }

  async function carrito() {
    const D = await data();
    const list = $('#cart-list'), sum = $('#cart-summary'), form = $('#checkout');
    const refInput = $('#ref'); refInput.value = store.get('nido_ref', '') || '';
    function lines() {
      return Cart.items().map((i) => ({ ...i, p: D.productos.find((p) => p.id === i.id) })).filter((i) => i.p);
    }
    function totals() {
      const ls = lines();
      const subtotal = ls.reduce((a, i) => a + precioDe(i.p, i.variante) * i.qty, 0);
      const ref = refInput.value.trim();
      const descuento = ref ? Math.round(subtotal * (CFG.descuentoEmbajador / 100)) : 0;
      const envioGratis = subtotal - descuento >= CFG.envioGratisDesde;
      const envio = envioGratis ? 0 : (CFG.envioValor || 0);
      return { ls, subtotal, descuento, envioGratis, envio, total: subtotal - descuento + envio, ref };
    }
    function render() {
      const t = totals();
      if (!t.ls.length) {
        list.innerHTML = `<div class="empty">${window.nidoSVG ? nidoSVG('grande') : ''}<p>Tu carrito está vacío. Explora los diseños de Santander.</p><a class="btn btn-primary" href="tienda.html">Ver la tienda</a></div>`;
        sum.hidden = true; return;
      }
      sum.hidden = false;
      list.innerHTML = t.ls.map((i) => `
        <div class="cart-item">
          <img src="${thumb(i.p)}" ${FALLBACK(i.p)} alt="" width="74" height="74">
          <div>
            <h3>${esc(i.p.nombre)}</h3>
            <small>${esc(catName(i.p.categoria))}${i.variante ? ' · ' + esc(i.variante) : ''} · ${money(precioDe(i.p, i.variante))}</small><br>
            <button type="button" class="remove" data-rm="${esc(i.key)}">Quitar</button>
          </div>
          <div class="qty"><button type="button" data-k="${esc(i.key)}" data-d="-1" aria-label="Quitar uno de ${esc(i.p.nombre)}">−</button><output>${i.qty}</output><button type="button" data-k="${esc(i.key)}" data-d="1" aria-label="Agregar uno de ${esc(i.p.nombre)}">+</button></div>
        </div>`).join('');
      $('#s-subtotal').textContent = money(t.subtotal);
      $('#s-desc-row').hidden = !t.descuento;
      $('#s-desc').textContent = '− ' + money(t.descuento);
      $('#s-envio').textContent = t.envioGratis ? 'Gratis' : money(t.envio);
      $('#s-total').textContent = money(t.total);
      const falta = CFG.envioGratisDesde - (t.subtotal - t.descuento);
      $('#s-free').textContent = t.envioGratis ? '¡Tu envío es gratis!' : `Te faltan ${money(falta)} para el envío gratis.`;
    }
    list.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { Cart.remove(rm.dataset.rm); render(); return; }
      const b = e.target.closest('[data-k]');
      if (b) { const it = Cart.items().find((i) => i.key === b.dataset.k); if (it) { Cart.setQty(it.key, it.qty + Number(b.dataset.d)); render(); } }
    });
    refInput.addEventListener('input', () => { store.set('nido_ref', refInput.value.trim().toUpperCase()); render(); });
    // mostrar/ocultar el mensaje de regalo
    const esRegalo = $('#es-regalo'), cajaRegalo = $('#caja-regalo');
    if (esRegalo && cajaRegalo) esRegalo.addEventListener('change', () => { cajaRegalo.hidden = !esRegalo.checked; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const t = totals(); const f = new FormData(form);
      const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const referencia = 'ND-' + Array.from({ length: 5 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
      const pedido = {
        referencia, nombre: f.get('nombre').trim(), telefono: f.get('telefono').trim(), ciudad: f.get('ciudad').trim(), direccion: f.get('direccion').trim(),
        nota: (f.get('notas') || '').trim() || null,
        regalo: (esRegalo && esRegalo.checked ? (f.get('regalo') || '').trim() : '') || null,
        items: t.ls.map((i) => ({ producto_id: i.p.id, codigo: i.p.codigo || '', nombre: i.p.nombre, variante: i.variante || '', cant: i.qty, precio: precioDe(i.p, i.variante) })),
        subtotal: t.subtotal, descuento: t.descuento, envio: t.envio, total: t.total, codigo: t.ref || null,
      };
      const b = $('button[type=submit]', form); b.disabled = true; b.textContent = 'Guardando tu pedido…';
      let guardado = false;
      if (SUPA) {
        try {
          const r = await fetch(`${CFG.supabaseUrl}/rest/v1/pedidos`, { method: 'POST', headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(pedido) });
          guardado = r.ok;
        } catch (err) { guardado = false; }
      }
      store.set('nido_pedido', Object.assign({ guardado, fecha: new Date().toISOString() }, pedido));
      Cart.clear();
      location.href = 'pago.html?ref=' + encodeURIComponent(referencia);
    });
    render();
  }

  function formToWhatsApp(id, title) {
    const form = $(id);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const f = new FormData(form);
      const lines = [title, ''].concat(Array.from(f.entries()).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`));
      window.open(`https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      toast('Abrimos WhatsApp con tu mensaje');
    });
  }

  /* ---------- ajustes que se cambian desde el panel (data/ajustes.json) ---------- */
  async function ajustes() {
    try {
      if (SUPA) {
        const filas = await supa('ajustes_publicos?select=clave,valor');
        filas.forEach((f) => { CFG[f.clave] = f.valor; });
      } else {
        const r = await fetch('data/ajustes.json?t=' + Date.now(), { cache: 'no-store' });
        Object.assign(CFG, await r.json());
      }
    } catch (e) { /* si falla, se usan los valores de config.js */ }
    if (CFG.mostrarColeccion === false) $$('[data-coleccion]').forEach((el) => { el.hidden = true; });
  }

  /* ---------- formulario de contacto: llega a la bandeja del panel (o a WhatsApp) ---------- */
  function contacto() {
    const f = $('#form-contacto'); if (!f) return;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f).entries());
      if (d.web) return;                                      // trampa para robots
      const datos = { nombre: d.nombre.trim(), contacto: d.contacto.trim(), tipo: d.tipo, mensaje: d.mensaje.trim() };
      const b = $('button[type=submit]', f); b.disabled = true;
      let ok = false;
      if (SUPA) {
        try {
          const r = await fetch(`${CFG.supabaseUrl}/rest/v1/mensajes`, { method: 'POST', headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(datos) });
          ok = r.ok;
        } catch (err) { ok = false; }
      }
      b.disabled = false;
      if (ok) { f.reset(); $('#contacto-ok').hidden = false; toast('Mensaje enviado. Te escribimos pronto.'); return; }
      const txt = `Hola, ${MARCA}. Soy ${datos.nombre} (${datos.contacto}).\n${datos.tipo}: ${datos.mensaje}`;
      window.open(`https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
      toast('Abrimos WhatsApp con tu mensaje');
    });
  }

  /* ---------- arranque ---------- */
  ajustes().then(arrancar);
  function arrancar() {
    chrome();
    if (window.nidoMontar) nidoMontar();
    const g404 = $('#nido-404'); if (g404 && window.nidoSVG) g404.innerHTML = nidoSVG('grande');
    $$('[data-wa]').forEach((a) => { a.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(a.dataset.wa)}`; });
    $$('[data-ig]').forEach((a) => { if (CFG.instagram) a.href = CFG.instagram; });
    updateBadges();
    countdown();
    const run = { tienda, producto, carrito }[page];  // el inicio es portada; la tienda va en tienda.html
    if (run) run().then(() => window.nidoMirar && nidoMirar()).catch(() => { const m = $('main'); if (m) m.insertAdjacentHTML('afterbegin', '<p class="wrap alert alert-amber" style="margin-top:20px">No pudimos cargar los productos. Recarga la página.</p>'); });
    contacto();
    pago();
    formToWhatsApp('#form-mayoristas', `Hola, ${MARCA}. Quiero precios por mayor / para mi negocio.`);
  }
})();
