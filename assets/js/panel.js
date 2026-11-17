/* ================================================================
   Panel de control · Trama de Aquí  (sin dependencias)
   Estructura de dashboard (barra lateral + vistas), productos
   editables con su imagen. Guarda en este navegador (modo prueba)
   o en Supabase si está configurado. Exporta productos.json.
   ================================================================ */
(function () {
  'use strict';
  const CFG = window.NIDITO || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$ ' + Math.round(Number(n) || 0).toLocaleString('es-CO');
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const SUPA = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } },
  };
  const K_EDITS = 'trama_panel_edits';   // { id: {campos editados} }
  const K_IMG = 'trama_panel_img';       // { id: dataURL }
  const K_NEW = 'trama_panel_nuevos';    // [productos nuevos]

  let DATA = { secciones: [], categorias: [], productos: [] };
  let EDITS = ls.get(K_EDITS, {});
  let IMG = ls.get(K_IMG, {});
  let NUEVOS = ls.get(K_NEW, []);
  let vistaActual = 'resumen';

  /* ---------- acceso ---------- */
  const acceso = $('#acceso'), app = $('#app');
  function entrar() { acceso.hidden = true; app.hidden = false; iniciar(); }
  if (sessionStorage.getItem('trama_panel') === 'ok') entrar();
  $('#form-acceso').addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('#pin').value === String(CFG.panelPin || '2026')) { sessionStorage.setItem('trama_panel', 'ok'); entrar(); }
    else { $('#pin-mal').hidden = false; $('#pin').value = ''; }
  });
  $('#salir').addEventListener('click', () => { sessionStorage.removeItem('trama_panel'); location.reload(); });

  /* ---------- avisos / estado ---------- */
  let avisoT;
  function aviso(msg, tipo) {
    const el = $('#aviso'); el.textContent = msg; el.className = 'aviso ver' + (tipo ? ' ' + tipo : '');
    clearTimeout(avisoT); avisoT = setTimeout(() => { el.className = 'aviso'; }, 2600);
  }
  function estado(txt, tipo) { const el = $('#estado'); el.textContent = txt || ''; el.className = 'estado' + (tipo ? ' ' + tipo : ''); }

  /* ---------- imagen ---------- */
  function reducirImagen(file, max, calidad) {
    return new Promise((ok, mal) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', calidad));
      };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen')); };
      img.src = url;
    });
  }

  /* ---------- datos ---------- */
  function thumb(p) {
    if (IMG[p.id]) return IMG[p.id];
    if (p.nuevo_local) return p.imagen; // dataURL de un producto nuevo
    return 'assets/img/productos/thumb/' + p.id + '.webp';
  }
  function fotoFull(p) { return IMG[p.id] || p.imagen; }

  // Producto con las ediciones locales aplicadas.
  function conEdits(p) { const e = EDITS[p.id]; return e ? Object.assign({}, p, e) : p; }
  function productos() { return DATA.productos.concat(NUEVOS).map(conEdits); }
  function catNombre(id) { const c = DATA.categorias.find((x) => x.id === id); return c ? c.nombre : id; }
  function secNombre(id) { const s = DATA.secciones.find((x) => x.id === id); return s ? s.nombre : id; }

  async function cargar() {
    estado('Cargando…');
    const r = await fetch('data/productos.json?t=' + Date.now(), { cache: 'no-store' });
    DATA = await r.json();
    DATA.secciones = DATA.secciones || [];
    DATA.categorias = DATA.categorias || [];
    DATA.productos = DATA.productos || [];
    estado('');
  }

  function guardarEdits() { ls.set(K_EDITS, EDITS); }
  function guardarImg() { if (!ls.set(K_IMG, IMG)) aviso('El navegador se quedó sin espacio para guardar fotos', 'error'); }
  function guardarNuevos() { ls.set(K_NEW, NUEVOS); }

  /* ================================================================
     Vistas
     ================================================================ */
  const TITULOS = { resumen: 'Resumen', productos: 'Productos', secciones: 'Secciones y categorías', pedidos: 'Pedidos', mensajes: 'Mensajes', ajustes: 'Ajustes' };

  function render() {
    $('#titulo').textContent = TITULOS[vistaActual] || 'Panel';
    $$('.nav-panel a').forEach((a) => a.classList.toggle('activo', a.dataset.vista === vistaActual));
    $('#cuenta-productos').textContent = productos().length;
    $('#accion').hidden = true;
    const v = VISTAS[vistaActual]; if (v) v();
  }

  const VISTAS = {};

  VISTAS.resumen = function () {
    const ps = productos();
    const porSec = DATA.secciones.map((s) => ({ s, n: ps.filter((p) => p.seccion === s.id).length }));
    const nuevos = ps.filter((p) => p.nuevo).length, dest = ps.filter((p) => p.destacado).length;
    const edit = Object.keys(EDITS).length + Object.keys(IMG).length + NUEVOS.length;
    $('#vista').innerHTML = `
      <div class="kpis">
        <div class="kpi"><b>${ps.length}</b><span>Productos</span></div>
        <div class="kpi"><b>${DATA.secciones.length}</b><span>Secciones</span></div>
        <div class="kpi"><b>${DATA.categorias.length}</b><span>Categorías</span></div>
        <div class="kpi"><b>${nuevos}</b><span>Marcados «Nuevo»</span></div>
        <div class="kpi"><b>${dest}</b><span>Destacados</span></div>
        <div class="kpi"><b>${edit}</b><span>Cambios sin exportar</span></div>
      </div>
      <div class="panel brackets" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;margin:0 0 20px;padding:18px 20px">
        <div style="min-width:220px;flex:1">
          <b style="font-family:var(--font-display);color:var(--night);font-size:18px">Catálogo maestro (PDF)</b>
          <p class="note" style="margin:4px 0 0">${ps.length} diseños con código, nombre, categoría y precio. Documento interno.</p>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <a class="btn btn-primary" href="docs/trama-catalogo-9x4k7m.pdf" download="Catalogo_Trama_de_Aqui.pdf" rel="noopener">⇣ Catálogo (PC)</a>
          <a class="btn btn-ghost" href="docs/trama-catalogo-movil-9x4k7m.pdf" download="Catalogo_Trama_movil.pdf" rel="noopener">⇣ Versión celular</a>
        </div>
      </div>
      <h3 style="font-family:var(--font-display);color:var(--night);margin:0 0 12px">Productos por sección</h3>
      <div class="lista-sec">
        ${porSec.map(({ s, n }) => `<div class="row"><div><b>${esc(s.nombre)}</b></div><span class="n">${n}</span></div>`).join('')}
      </div>`;
  };

  VISTAS.productos = function () {
    const ac = $('#accion'); ac.hidden = false; $('span', ac).textContent = 'Agregar producto';
    ac.onclick = () => editar(null);
    const st = VISTAS.productos._estado || (VISTAS.productos._estado = { sec: 'todo', cat: 'todo', q: '', vista: 'grid' });
    const ps = productos();
    const catsDe = (sec) => { const ids = new Set(ps.filter((p) => sec === 'todo' || p.seccion === sec).map((p) => p.categoria)); return DATA.categorias.filter((c) => ids.has(c.id)); };
    function dibujar() {
      const q = norm(st.q);
      let list = ps.filter((p) =>
        (st.sec === 'todo' || p.seccion === st.sec) &&
        (st.cat === 'todo' || p.categoria === st.cat) &&
        (!q || norm(p.nombre + ' ' + (p.descripcion || '') + ' ' + catNombre(p.categoria) + ' ' + (p.codigo || '')).includes(q)));
      list.sort((a, b) => st.vista === 'lista' ? (a.codigo || '').localeCompare(b.codigo || '', 'es') : a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
      if (!list.length) { $('#grid-wrap').innerHTML = `<p class="vacio">No hay productos con ese filtro.</p>`; }
      else if (st.vista === 'lista') {
        $('#grid-wrap').innerHTML = `<table class="tabla-prod"><thead><tr><th>Código</th><th>Producto</th><th>Sección · Categoría</th><th>Precio</th><th></th></tr></thead><tbody>${list.map(rowHTML).join('')}</tbody></table>`;
      } else {
        $('#grid-wrap').innerHTML = `<div class="grid-prod">${list.map(cardHTML).join('')}</div>`;
      }
      $('.conteo', $('#vista')).textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
    }
    $('#vista').innerHTML = `
      <div class="filtros">
        <select id="f-sec"><option value="todo">Todas las secciones</option>${DATA.secciones.map((s) => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('')}</select>
        <select id="f-cat"><option value="todo">Todas las categorías</option></select>
        <input id="f-q" class="busca" type="search" placeholder="Buscar por nombre o código…">
        <span class="conteo"></span>
        <div class="vista-toggle" role="group" aria-label="Modo de vista">
          <button type="button" id="v-grid" title="Tarjetas" aria-label="Tarjetas">▦</button>
          <button type="button" id="v-lista" title="Lista" aria-label="Lista">☰</button>
        </div>
      </div>
      <div id="grid-wrap"></div>`;
    const fCat = $('#f-cat');
    const pintarCats = () => { fCat.innerHTML = `<option value="todo">Todas las categorías</option>` + catsDe(st.sec).map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join(''); fCat.value = st.cat; };
    pintarCats();
    $('#f-sec').value = st.sec; $('#f-q').value = st.q;
    $('#f-sec').onchange = (e) => { st.sec = e.target.value; st.cat = 'todo'; pintarCats(); dibujar(); };
    fCat.onchange = (e) => { st.cat = e.target.value; dibujar(); };
    $('#f-q').oninput = (e) => { st.q = e.target.value; dibujar(); };
    $('#grid-wrap').addEventListener('click', (e) => { const c = e.target.closest('[data-id]'); if (c) editar(c.dataset.id); });
    const setVista = () => { $('#v-grid').classList.toggle('activo', st.vista === 'grid'); $('#v-lista').classList.toggle('activo', st.vista === 'lista'); };
    $('#v-grid').onclick = () => { st.vista = 'grid'; setVista(); dibujar(); };
    $('#v-lista').onclick = () => { st.vista = 'lista'; setVista(); dibujar(); };
    setVista();
    dibujar();
  };

  function cardHTML(p) {
    const tags = [];
    if (p.nuevo) tags.push('<span class="ptag">Nuevo</span>');
    if (p.destacado) tags.push('<span class="ptag amber">Destacado</span>');
    if (IMG[p.id]) tags.push('<span class="ptag peach">Foto editada</span>');
    return `<button class="pcard" type="button" data-id="${esc(p.id)}">
      <div class="foto"><div class="tags">${tags.join('')}</div><img loading="lazy" src="${esc(thumb(p))}" alt="${esc(p.nombre)}" onerror="this.onerror=null;this.src='${esc(fotoFull(p))}'"></div>
      <div class="cuerpo">
        <div class="nom">${esc(p.nombre)}</div>
        <div class="meta">${p.codigo ? '<b class="pcod">' + esc(p.codigo) + '</b> · ' : ''}${esc(secNombre(p.seccion))} · ${esc(catNombre(p.categoria))}</div>
        <div class="precio">${money(p.precio)}</div>
        <div class="editar">Editar →</div>
      </div></button>`;
  }
  function rowHTML(p) {
    return `<tr data-id="${esc(p.id)}"><td class="t-cod"><b>${esc(p.codigo || '')}</b></td><td class="t-nom">${esc(p.nombre)}</td><td class="t-meta">${esc(secNombre(p.seccion))} · ${esc(catNombre(p.categoria))}</td><td class="t-precio">${money(p.precio)}</td><td class="t-edit"><span class="editar">Editar →</span></td></tr>`;
  }

  /* ---------- editor de producto ---------- */
  function editar(id) {
    const base = id ? productos().find((p) => p.id === id) : null;
    const p = base || { id: '', nombre: '', precio: 45000, seccion: DATA.secciones[0] ? DATA.secciones[0].id : '', categoria: DATA.categorias[0] ? DATA.categorias[0].id : '', stock: 12, descripcion: '', destacado: false, nuevo: true };
    const esNuevo = !id;
    const m = $('#modal');
    m.innerHTML = `<form class="modal-caja" id="form-edit">
      <header><h2>${esNuevo ? 'Nuevo producto' : 'Editar producto'}</h2><button type="button" class="cerrar" data-cerrar aria-label="Cerrar">×</button></header>
      <div class="modal-cuerpo">
        <div class="foto-edit">
          <img class="mini" id="e-foto" src="${esc(thumb(p))}" alt="" onerror="this.onerror=null;this.src='${esc(fotoFull(p))}'">
          <div class="acc">
            <label class="btn btn-ghost btn-sm" style="cursor:pointer">Cambiar foto<input id="e-file" type="file" accept="image/*" hidden></label>
            <span class="nota">La foto se guarda en este navegador para verla aquí. Para cambiarla en la tienda pública, envíame la imagen nueva.</span>
          </div>
        </div>
        <div class="campo"><label for="e-nom">Nombre</label><input id="e-nom" value="${esc(p.nombre)}" required></div>
        <div class="campo-2">
          <div class="campo"><label for="e-sec">Sección</label><select id="e-sec">${DATA.secciones.map((s) => `<option value="${s.id}"${s.id === p.seccion ? ' selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select></div>
          <div class="campo"><label for="e-cat">Categoría</label><select id="e-cat">${DATA.categorias.map((c) => `<option value="${c.id}"${c.id === p.categoria ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div>
        </div>
        <div class="campo-2">
          <div class="campo"><label for="e-precio">Precio base (COP)</label><input id="e-precio" type="number" min="0" step="500" value="${Number(p.precio) || 0}"></div>
          <div class="campo"><label for="e-stock">Stock</label><input id="e-stock" type="number" min="0" value="${Number(p.stock) || 0}"></div>
        </div>
        <div class="campo"><label for="e-desc">Descripción</label><textarea id="e-desc">${esc(p.descripcion || '')}</textarea></div>
        <div class="checks">
          <label><input type="checkbox" id="e-nuevo"${p.nuevo ? ' checked' : ''}> Nuevo</label>
          <label><input type="checkbox" id="e-dest"${p.destacado ? ' checked' : ''}> Destacado</label>
        </div>
      </div>
      <footer>
        ${!esNuevo ? '<button type="button" class="btn-link" data-borrar style="color:var(--peach-text)">Eliminar</button>' : ''}
        <div class="botones"><button type="button" class="btn btn-ghost" data-cerrar>Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
      </footer>
    </form>`;
    m.showModal();
    let nuevaFoto = null;
    $$('[data-cerrar]', m).forEach((b) => b.onclick = () => m.close());
    $('#e-file', m).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { nuevaFoto = await reducirImagen(f, 900, 0.85); $('#e-foto', m).src = nuevaFoto; }
      catch (err) { aviso('No se pudo leer la imagen', 'error'); }
    };
    const borrar = $('[data-borrar]', m);
    if (borrar) borrar.onclick = async () => {
      if (!await confirmar('¿Eliminar «' + p.nombre + '» del panel? (No borra la foto del repositorio.)')) return;
      if (p.nuevo_local) { NUEVOS = NUEVOS.filter((x) => x.id !== p.id); guardarNuevos(); }
      else { EDITS[p.id] = Object.assign({}, EDITS[p.id], { _oculto: true }); guardarEdits(); }
      delete IMG[p.id]; guardarImg();
      m.close(); aviso('Producto quitado del panel'); render();
    };
    $('#form-edit', m).onsubmit = (e) => {
      e.preventDefault();
      const campos = {
        nombre: $('#e-nom', m).value.trim(),
        seccion: $('#e-sec', m).value,
        categoria: $('#e-cat', m).value,
        precio: Number($('#e-precio', m).value) || 0,
        stock: Number($('#e-stock', m).value) || 0,
        descripcion: $('#e-desc', m).value.trim(),
        nuevo: $('#e-nuevo', m).checked,
        destacado: $('#e-dest', m).checked,
      };
      if (!campos.nombre) { aviso('Escribe el nombre', 'error'); return; }
      if (esNuevo) {
        const slug = 'nuevo-' + norm(campos.nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
        const prod = Object.assign({ id: slug, nuevo_local: true, imagen: nuevaFoto || '', variantes: { nombre: 'Tamaño', opciones: ['Mediana 35×40', 'Grande 40×45'] } }, campos);
        NUEVOS.push(prod); guardarNuevos();
        if (nuevaFoto) { IMG[slug] = nuevaFoto; guardarImg(); }
      } else {
        EDITS[p.id] = Object.assign({}, EDITS[p.id], campos); delete EDITS[p.id]._oculto; guardarEdits();
        if (nuevaFoto) { IMG[p.id] = nuevaFoto; guardarImg(); }
      }
      m.close(); aviso('Guardado'); render();
    };
  }

  function confirmar(msg) {
    return new Promise((ok) => {
      const d = $('#confirmar'); $('#confirmar-msg').textContent = msg;
      const si = $('[data-si]', d), no = $('[data-no]', d);
      const cerrar = (v) => { d.close(); si.onclick = null; no.onclick = null; ok(v); };
      si.onclick = () => cerrar(true); no.onclick = () => cerrar(false);
      d.showModal();
    });
  }

  /* ---------- secciones y categorías ---------- */
  VISTAS.secciones = function () {
    const ps = productos();
    const secs = DATA.secciones.map((s) => `<div class="row"><div><b>${esc(s.nombre)}</b><small>Sección · id: ${esc(s.id)}</small></div><span class="n">${ps.filter((p) => p.seccion === s.id).length}</span></div>`).join('');
    const cats = DATA.categorias.map((c) => `<div class="row"><div><b>${esc(c.nombre)}</b><small>${esc(c.detalle || 'Categoría')} · id: ${esc(c.id)}</small></div><span class="n">${ps.filter((p) => p.categoria === c.id).length}</span></div>`).join('');
    $('#vista').innerHTML = `
      <h3 style="font-family:var(--font-display);color:var(--night);margin:0 0 12px">Secciones</h3>
      <div class="lista-sec">${secs}</div>
      <h3 style="font-family:var(--font-display);color:var(--night);margin:26px 0 12px">Categorías</h3>
      <div class="lista-sec">${cats}</div>`;
  };

  /* ---------- pedidos y mensajes (Supabase, si está configurado) ---------- */
  async function supaGet(ruta) {
    const r = await fetch(`${CFG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${ruta}`, { headers: { apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + CFG.supabaseAnonKey } });
    if (!r.ok) throw new Error('Supabase ' + r.status);
    return r.json();
  }
  function vistaSupabase(tabla, titulo, filas) {
    if (!SUPA) {
      $('#vista').innerHTML = `<p class="vacio">Los ${titulo} llegan cuando conectes Supabase.<br>Agrega <code>supabaseUrl</code> y <code>supabaseAnonKey</code> en <code>assets/js/config.js</code>.</p>`;
      return;
    }
    $('#vista').innerHTML = `<p class="vacio">Cargando…</p>`;
    supaGet(tabla + '?select=*&order=creado.desc&limit=100').then((rows) => {
      $('#vista').innerHTML = rows && rows.length ? `<div class="lista-sec">${rows.map(filas).join('')}</div>` : `<p class="vacio">Todavía no hay ${titulo}.</p>`;
    }).catch(() => { $('#vista').innerHTML = `<p class="vacio">No se pudieron cargar los ${titulo}.</p>`; });
  }
  VISTAS.pedidos = () => vistaSupabase('pedidos', 'pedidos', (o) => `<div class="row"><div><b>${esc(o.cliente || o.nombre || 'Pedido')}</b><small>${esc(o.creado || '')}</small></div><span class="n">${money(o.total || 0)}</span></div>`);
  VISTAS.mensajes = () => vistaSupabase('mensajes', 'mensajes', (o) => `<div class="row"><div><b>${esc(o.nombre || 'Mensaje')}</b><small>${esc(o.mensaje || o.correo || '')}</small></div></div>`);

  /* ---------- ajustes ---------- */
  VISTAS.ajustes = function () {
    const edit = Object.keys(EDITS).length + NUEVOS.length, fotos = Object.keys(IMG).length;
    $('#vista').innerHTML = `
      <div class="lista-sec" style="max-width:640px">
        <div class="row"><div><b>Modo de datos</b><small>${SUPA ? 'Supabase conectado.' : 'Modo prueba: los cambios se guardan solo en este navegador.'}</small></div><span class="pchip">${SUPA ? 'supabase' : 'prueba'}</span></div>
        <div class="row"><div><b>Cambios locales</b><small>${edit} productos editados · ${fotos} fotos cambiadas</small></div></div>
      </div>
      <h3 style="font-family:var(--font-display);color:var(--night);margin:26px 0 12px">Publicar los cambios</h3>
      <p class="note" style="max-width:640px;color:var(--text-2)">La tienda pública lee <code>data/productos.json</code>. Exporta el archivo con tus ediciones de texto (nombre, precio, categoría, sección, stock, descripción, etiquetas) y envíamelo o súbelo al repositorio para que se vean en vivo. <b>Las fotos nuevas</b> no van dentro del JSON: mándame la imagen y la coloco en la tienda.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
        <button class="btn btn-primary" id="exportar">Exportar productos.json</button>
        <button class="btn btn-ghost" id="recargar">Recargar del repositorio</button>
        <button class="btn btn-ghost" id="reset" style="color:var(--peach-text)">Borrar cambios locales</button>
      </div>`;
    $('#exportar').onclick = exportar;
    $('#recargar').onclick = async () => { await cargar(); aviso('Catálogo recargado'); render(); };
    $('#reset').onclick = async () => {
      if (!await confirmar('¿Borrar TODOS los cambios locales (ediciones y fotos)? No afecta la tienda publicada.')) return;
      EDITS = {}; IMG = {}; NUEVOS = []; ls.del(K_EDITS); ls.del(K_IMG); ls.del(K_NEW);
      aviso('Cambios locales borrados'); render();
    };
  };

  function exportar() {
    // Aplica ediciones de texto; conserva las rutas de imagen originales del repositorio.
    const limpiar = (p) => {
      const o = Object.assign({}, p); delete o._oculto; delete o.nuevo_local;
      if (IMG[p.id] && o.imagen && o.imagen.startsWith('data:')) o.imagen = 'assets/img/productos/' + p.id + '.jpg';
      return o;
    };
    const prods = productos().filter((p) => !p._oculto).map(limpiar);
    const out = { secciones: DATA.secciones, categorias: DATA.categorias, productos: prods };
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'productos.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    aviso('productos.json exportado (' + prods.length + ' productos)');
  }

  /* ---------- navegación ---------- */
  $$('.nav-panel a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); vistaActual = a.dataset.vista; app.classList.remove('abierto'); render();
  }));
  $('#menu-btn').addEventListener('click', () => app.classList.toggle('abierto'));
  $('#velo').addEventListener('click', () => app.classList.remove('abierto'));

  async function iniciar() {
    try { await cargar(); render(); }
    catch (e) { estado('No se pudo cargar el catálogo', 'error'); $('#vista').innerHTML = '<p class="vacio">No se pudo cargar data/productos.json.</p>'; }
  }

  // Puente para el módulo de negocio (panel-biz.js): comparte vistas, datos y utilidades.
  window.PANEL = {
    VISTAS, TITULOS, aviso, confirmar,
    render: () => render(),
    productos, catNombre, secNombre,
    ls, SUPA,
    helpers: { $, $$, esc, money, norm, reducirImagen },
  };
})();
