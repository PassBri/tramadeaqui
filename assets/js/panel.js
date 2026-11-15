/* Nidito · panel de control (sin dependencias) */
(function () {
  'use strict';
  const CFG = window.NIDITO || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$ ' + Math.round(Number(n) || 0).toLocaleString('es-CO');
  const fecha = (s) => { try { return new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return s || ''; } };
  const SUPA = CFG.supabaseUrl && CFG.supabaseAnonKey;

  async function supa(ruta, opts) {
    const r = await fetch(`${CFG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${ruta}`, Object.assign({ headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json' } }, opts || {}));
    if (!r.ok) throw new Error('Supabase ' + r.status);
    const txt = await r.text(); return txt ? JSON.parse(txt) : [];
  }

  /* ---------- acceso ---------- */
  const acceso = $('#acceso'), tablero = $('#tablero');
  if (window.nidoSVG) $('#acceso-mascota').innerHTML = nidoSVG('grande');
  function entrar() { acceso.hidden = true; tablero.hidden = false; iniciar(); }
  if (sessionStorage.getItem('nido_panel') === 'ok') entrar();
  $('#form-acceso').addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('#pin').value === String(CFG.panelPin || '2026')) { sessionStorage.setItem('nido_panel', 'ok'); entrar(); }
    else { $('#pin-mal').hidden = false; $('#pin').value = ''; }
  });
  $('#salir').addEventListener('click', () => { sessionStorage.removeItem('nido_panel'); location.reload(); });

  /* ---------- datos ---------- */
  let PEDIDOS = [], MENSAJES = [], PRODUCTOS = [];
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } } };

  async function cargar() {
    if (SUPA) {
      try {
        PRODUCTOS = await supa('catalogo?select=*&order=nombre');
        // Los pedidos y mensajes son privados: solo se ven si el proyecto tiene
        // políticas de lectura para un administrador autenticado (ver supabase/LEEME.md).
        // Si no hay permiso, quedan vacíos sin romper el panel.
        try { PEDIDOS = await supa('pedidos?select=*&order=created_at.desc'); } catch (e) { PEDIDOS = []; }
        try { MENSAJES = await supa('mensajes?select=*&order=created_at.desc'); } catch (e) { MENSAJES = []; }
        return 'live';
      } catch (e) { /* si ni el catálogo carga, cae a modo demo */ }
    }
    // modo demo: el último pedido guardado en este navegador + el catálogo del archivo
    const p = store.get('nido_pedido', null);
    PEDIDOS = p ? [Object.assign({ created_at: p.fecha, estado: p.guardado ? 'pagado' : 'nuevo' }, p)] : [];
    MENSAJES = [];
    try { const r = await fetch('data/productos.json'); PRODUCTOS = (await r.json()).productos; } catch (e) { PRODUCTOS = []; }
    return 'demo';
  }

  /* ---------- render ---------- */
  function kpis() {
    const hoy = new Date().toDateString();
    const hechoHoy = PEDIDOS.filter((p) => p.created_at && new Date(p.created_at).toDateString() === hoy);
    const ventas = PEDIDOS.filter((p) => p.estado !== 'nuevo').reduce((a, p) => a + (Number(p.total) || 0), 0);
    const bajos = PRODUCTOS.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 4).length;
    const cards = [
      ['Pedidos', PEDIDOS.length],
      ['Hoy', hechoHoy.length],
      ['Ventas confirmadas', money(ventas)],
      ['Mensajes', MENSAJES.length],
      ['Stock bajo', bajos],
    ];
    $('#kpis').innerHTML = cards.map(([k, v]) => `<div class="panel kpi"><small>${k}</small><b>${v}</b></div>`).join('');
  }

  const ESTADOS = ['nuevo', 'pagado', 'enviado'];
  function vistaPedidos() {
    if (!PEDIDOS.length) return `<div class="panel panel-card"><div class="vacio">Aún no hay pedidos.${SUPA ? '' : ' (En modo demo solo se ve el último pedido hecho en este navegador.)'}</div></div>`;
    const filas = PEDIDOS.map((p) => {
      const items = (p.items || []).map((i) => `${i.cant}× ${esc(i.nombre)}${i.variante ? ' (' + esc(i.variante) + ')' : ''}`).join(', ');
      const est = p.estado || 'nuevo';
      const sel = SUPA
        ? `<select data-ref="${esc(p.referencia)}" class="estado-sel">${ESTADOS.map((e) => `<option value="${e}"${e === est ? ' selected' : ''}>${e}</option>`).join('')}</select>`
        : `<span class="chip-estado e-${est}">${est}</span>`;
      return `<tr>
        <td class="ref">${esc(p.referencia)}<br><span class="note">${fecha(p.created_at)}</span></td>
        <td>${esc(p.nombre)}<br><span class="note">${esc(p.ciudad)} · ${esc(p.telefono)}</span></td>
        <td class="items">${items}${p.regalo ? `<br>🎁 «${esc(p.regalo)}»` : ''}</td>
        <td><b>${money(p.total)}</b>${p.codigo ? `<br><span class="note">cód. ${esc(p.codigo)}</span>` : ''}</td>
        <td>${sel}</td>
      </tr>`;
    }).join('');
    return `<div class="panel panel-card"><div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Referencia</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th></tr></thead>
      <tbody>${filas}</tbody></table></div></div>`;
  }

  function vistaMensajes() {
    if (!MENSAJES.length) return `<div class="panel panel-card"><div class="vacio">No hay mensajes.${SUPA ? '' : ' (Se guardan en Supabase cuando lo conectes.)'}</div></div>`;
    const filas = MENSAJES.map((m) => `<tr>
      <td class="note">${fecha(m.created_at)}</td>
      <td>${esc(m.nombre)}<br><span class="note">${esc(m.contacto)}</span></td>
      <td><b>${esc(m.tipo)}</b></td>
      <td class="items">${esc(m.mensaje)}</td>
    </tr>`).join('');
    return `<div class="panel panel-card"><div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Fecha</th><th>De</th><th>Tipo</th><th>Mensaje</th></tr></thead>
      <tbody>${filas}</tbody></table></div></div>`;
  }

  function vistaInventario() {
    if (!PRODUCTOS.length) return `<div class="panel panel-card"><div class="vacio">No se pudo cargar el catálogo.</div></div>`;
    const filas = PRODUCTOS.slice().sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0)).map((p) => {
      const s = Number(p.stock) || 0;
      const cls = s <= 0 ? 'stock-cero' : s <= 4 ? 'stock-bajo' : '';
      return `<tr><td>${esc(p.nombre)}</td><td class="note">${esc(p.categoria)}</td><td>${money(p.precio)}</td><td class="${cls}">${s <= 0 ? 'Agotado' : s}</td></tr>`;
    }).join('');
    return `<div class="panel panel-card">
      <p class="note" style="margin:0 0 12px">${SUPA ? 'Las existencias se editan en la tabla <b>catalogo</b> de Supabase.' : 'En modo demo las existencias se editan en <b>data/productos.json</b>. Al conectar Supabase se editan desde la tabla <b>catalogo</b>.'}</p>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th></tr></thead><tbody>${filas}</tbody></table></div>
    </div>`;
  }

  function vistaAjustes() {
    const items = [
      ['Marca', CFG.marca], ['Lema', CFG.lema], ['WhatsApp', CFG.whatsapp], ['Correo', CFG.correo],
      ['Envío gratis desde', money(CFG.envioGratisDesde)], ['Valor del envío', money(CFG.envioValor)],
      ['Nequi', CFG.nequi], ['Titular Nequi', CFG.nequiTitular], ['Descuento con código', (CFG.descuentoEmbajador || 0) + ' %'],
      ['Próxima colección', CFG.dropNombre + ' · ' + CFG.dropAbre],
    ];
    return `<div class="panel panel-card">
      <h2>Ajustes de la tienda</h2>
      <p class="note" style="margin:0 0 12px">Estos valores se cambian en el archivo <b>assets/js/config.js</b>. Lo visible en la web (como mostrar u ocultar la colección) se controla en <b>data/ajustes.json</b>.</p>
      ${items.map(([k, v]) => `<div class="ajuste-row"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}
      <div class="ajuste-row"><span>Estado de conexión</span><b>${SUPA ? 'Supabase conectado' : 'Modo demo (sin Supabase)'}</b></div>
    </div>
    <div class="panel panel-card">
      <h2>¿Cómo conectar el panel a Supabase?</h2>
      <p class="note" style="line-height:1.7">1. Crea un proyecto gratis en Supabase.<br>2. Abre <b>SQL Editor</b> y pega el contenido de <b>supabase/esquema.sql</b>.<br>3. Copia la <b>Project URL</b> y la <b>anon key</b> (Project Settings → API) en <b>assets/js/config.js</b>.<br>4. Listo: los pedidos, mensajes y existencias aparecerán aquí en tiempo real.</p>
    </div>`;
  }

  const VISTAS = { pedidos: vistaPedidos, mensajes: vistaMensajes, inventario: vistaInventario, ajustes: vistaAjustes };
  function pintar(tab) {
    $('#vista').innerHTML = VISTAS[tab]();
    if (tab === 'pedidos' && SUPA) {
      $$('.estado-sel').forEach((sel) => sel.addEventListener('change', async () => {
        const ref = sel.dataset.ref;
        try {
          await supa('pedidos?referencia=eq.' + encodeURIComponent(ref), { method: 'PATCH', headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ estado: sel.value }) });
          const p = PEDIDOS.find((x) => x.referencia === ref); if (p) p.estado = sel.value;
          kpis();
        } catch (e) { alert('No se pudo actualizar. Revisa la conexión con Supabase.'); }
      }));
    }
  }

  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.setAttribute('aria-selected', x === t));
    pintar(t.dataset.tab);
  }));
  $('#recargar').addEventListener('click', iniciar);

  async function iniciar() {
    const modo = await cargar();
    const est = $('#estado');
    est.className = 'estado-conexion ' + (modo === 'live' ? 'live' : 'demo');
    est.textContent = modo === 'live' ? '● Supabase conectado' : '● Modo demo';
    kpis();
    const activa = ($('.tab[aria-selected="true"]') || {}).dataset ? $('.tab[aria-selected="true"]').dataset.tab : 'pedidos';
    pintar(activa);
  }
})();
