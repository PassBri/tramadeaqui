/* ================================================================
   Panel · Módulo de negocio para Trama de Aquí
   Ventas · Compras · Inventario · Clientes · Proveedores ·
   Equipo y comisiones · Gastos · Caja · Estado de resultados.
   Se apoya en panel.js (window.PANEL). Guarda en este navegador
   (modo prueba); listo para Supabase más adelante.
   ================================================================ */
(function () {
  'use strict';
  const P = window.PANEL;
  if (!P) return;
  const { $, $$, esc, money, norm } = P.helpers;
  const ls = P.ls, aviso = P.aviso, confirmar = P.confirmar;

  /* ---------- almacén de negocio ---------- */
  const K = 'trama_biz';
  const vacio = () => ({ clientes: [], proveedores: [], equipo: [], ventas: [], compras: [], gastos: [], caja: [], movimientos: [], pagos_equipo: [], empresa: { saldo_inicial: 0 } });
  let BIZ = Object.assign(vacio(), ls.get(K, {}));
  const salvar = () => { if (!ls.set(K, BIZ)) aviso('El navegador se quedó sin espacio', 'error'); };
  const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const numero = (t) => BIZ[t].reduce((m, x) => Math.max(m, x.numero || 0), 0) + 1;
  const int = (v) => Math.round(Number(v) || 0);
  const porId = (t, id) => BIZ[t].find((x) => x.id === id);

  const hoy = () => new Date().toLocaleDateString('en-CA');
  const fCorta = (s) => { try { return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }); } catch (e) { return s || ''; } };

  /* ---------- periodos ---------- */
  const PERIODOS = { hoy: 'Hoy', '7d': '7 días', '30d': '30 días', mes: 'Este mes', anio: 'Este año', todo: 'Todo' };
  function rango(per) {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth(), f = (x) => x.toLocaleDateString('en-CA');
    switch (per) {
      case 'hoy': return [hoy(), hoy()];
      case '7d': { const a = new Date(); a.setDate(a.getDate() - 6); return [f(a), hoy()]; }
      case '30d': { const a = new Date(); a.setDate(a.getDate() - 29); return [f(a), hoy()]; }
      case 'mes': return [f(new Date(y, m, 1)), f(new Date(y, m + 1, 0))];
      case 'anio': return [`${y}-01-01`, `${y}-12-31`];
      default: return ['0000-01-01', '9999-12-31'];
    }
  }
  const enRango = (fch, [a, b]) => fch >= a && fch <= b;

  /* ---------- totales y comisiones ---------- */
  function tv(v) {
    const items = v.items || [];
    const sub = items.reduce((a, i) => a + int(i.cant) * int(i.precio), 0);
    const costo = items.reduce((a, i) => a + int(i.cant) * int(i.costo), 0);
    const unidades = items.reduce((a, i) => a + int(i.cant), 0);
    const envio = int(v.envio);
    return { sub, costo, unidades, envio, total: sub + envio };
  }
  function comisionVenta(v) {
    if (v.anulada || !v.vendedor_id) return 0;
    const p = porId('equipo', v.vendedor_id); if (!p) return 0;
    return Math.round(tv(v).sub * (Number(p.comision_pct) || 0) / 100);
  }
  const totCompra = (c) => (c.items || []).reduce((a, i) => a + int(i.cant) * int(i.costo), 0) + int(c.flete);

  /* ---------- inventario ---------- */
  const baseStock = (p) => int(p.stock);
  function salidas(pid) { let s = 0; BIZ.ventas.forEach((v) => { if (v.anulada) return; (v.items || []).forEach((i) => { if (i.producto_id === pid) s += int(i.cant); }); }); return s; }
  function movs(pid) { return BIZ.movimientos.filter((m) => m.producto_id === pid).reduce((a, m) => a + int(m.delta), 0); }
  const stockActual = (p) => baseStock(p) + movs(p.id) - salidas(p.id);

  /* ================================================================
     Formulario modal genérico
     ================================================================ */
  function abrirForm(titulo, campos, valores) {
    return new Promise((resolve) => {
      const m = $('#modal'); const v = valores || {};
      const campoHTML = (c) => {
        const val = v[c.k] == null ? (c.def != null ? c.def : '') : v[c.k];
        if (c.tipo === 'select') return `<div class="campo"><label>${esc(c.label)}</label><select data-k="${c.k}">${c.vacio ? `<option value="">${esc(c.vacio)}</option>` : ''}${c.opciones.map((o) => `<option value="${esc(o.id)}"${String(o.id) === String(val) ? ' selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select></div>`;
        if (c.tipo === 'textarea') return `<div class="campo"><label>${esc(c.label)}</label><textarea data-k="${c.k}">${esc(val)}</textarea></div>`;
        const tipo = c.tipo === 'numero' || c.tipo === 'money' ? 'number' : (c.tipo === 'fecha' ? 'date' : 'text');
        return `<div class="campo"><label>${esc(c.label)}</label><input data-k="${c.k}" type="${tipo}"${c.tipo === 'money' || c.tipo === 'numero' ? ' min="0"' : ''} value="${esc(val)}"${c.req ? ' required' : ''}></div>`;
      };
      const pares = []; for (let i = 0; i < campos.length; i += 2) pares.push(campos.slice(i, i + 2));
      m.innerHTML = `<form class="modal-caja">
        <header><h2>${esc(titulo)}</h2><button type="button" class="cerrar" data-x>×</button></header>
        <div class="modal-cuerpo">${pares.map((par) => par.length === 2 && par.every((c) => c.tipo !== 'textarea') ? `<div class="campo-2">${par.map(campoHTML).join('')}</div>` : par.map(campoHTML).join('')).join('')}</div>
        <footer><div class="botones"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div></footer>
      </form>`;
      m.showModal();
      $$('[data-x]', m).forEach((b) => b.onclick = () => { m.close(); resolve(null); });
      $('form', m).onsubmit = (e) => {
        e.preventDefault(); const out = Object.assign({}, v);
        $$('[data-k]', m).forEach((el) => { const c = campos.find((x) => x.k === el.dataset.k); out[el.dataset.k] = (c && (c.tipo === 'numero' || c.tipo === 'money')) ? int(el.value) : el.value.trim(); });
        for (const c of campos) if (c.req && !out[c.k]) { aviso('Falta: ' + c.label, 'error'); return; }
        m.close(); resolve(out);
      };
    });
  }

  /* ================================================================
     CRUD genérico (clientes, proveedores, equipo, gastos)
     ================================================================ */
  function nextCodigo(tabla, prefix) {
    let max = 0; BIZ[tabla].forEach((r) => { const mt = /(\d+)\s*$/.exec(r.codigo || ''); if (mt) max = Math.max(max, parseInt(mt[1], 10)); });
    return prefix + '-' + String(max + 1).padStart(3, '0');
  }
  function crud(cfg) {
    const ac = $('#accion'); ac.hidden = false; $('span', ac).textContent = 'Agregar ' + cfg.singular;
    if (cfg.codPrefix) { let camb = false; BIZ[cfg.tabla].forEach((r) => { if (!r.codigo) { r.codigo = nextCodigo(cfg.tabla, cfg.codPrefix); camb = true; } }); if (camb) salvar(); }
    ac.onclick = async () => { const o = await abrirForm('Nuevo ' + cfg.singular, cfg.campos, cfg.nuevo ? cfg.nuevo() : {}); if (!o) return; o.id = uid(); o.creado = new Date().toISOString(); if (cfg.codPrefix) o.codigo = nextCodigo(cfg.tabla, cfg.codPrefix); BIZ[cfg.tabla].push(o); salvar(); P.render(); aviso('Guardado'); };
    const cols = (cfg.codPrefix ? [{ k: 'codigo', label: 'Código', fmt: (r) => `<b style="color:var(--peach-text,#9A5228)">${esc(r.codigo || '')}</b>` }] : []).concat(cfg.cols);
    const rows = cfg.orden ? BIZ[cfg.tabla].slice().sort(cfg.orden) : BIZ[cfg.tabla];
    $('#vista').innerHTML = rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map((c) => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('')}<th class="acc"></th></tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.fmt ? c.fmt(r) : esc(r[c.k] || '')}</td>`).join('')}<td class="acc"><button class="mini-link" data-ed="${r.id}">Editar</button> <button class="mini-link del" data-del="${r.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`
      : `<p class="vacio">Aún no hay ${cfg.titulo.toLowerCase()}. Usa «Agregar ${cfg.singular}».</p>`;
    $('#vista').onclick = async (e) => {
      const ed = e.target.closest('[data-ed]'), del = e.target.closest('[data-del]');
      if (ed) { const r = porId(cfg.tabla, ed.dataset.ed); const o = await abrirForm('Editar ' + cfg.singular, cfg.campos, r); if (!o) return; Object.assign(r, o); salvar(); P.render(); aviso('Actualizado'); }
      if (del) { const r = porId(cfg.tabla, del.dataset.del); if (!await confirmar('¿Eliminar «' + (r.nombre || r.concepto || cfg.singular) + '»?')) return; BIZ[cfg.tabla] = BIZ[cfg.tabla].filter((x) => x.id !== del.dataset.del); salvar(); P.render(); aviso('Eliminado'); }
    };
  }

  /* ================================================================
     Vistas
     ================================================================ */
  const V = P.VISTAS, T = P.TITULOS;
  Object.assign(T, { ventas: 'Ventas', compras: 'Compras', inventario: 'Inventario', clientes: 'Clientes', proveedores: 'Proveedores', equipo: 'Equipo y comisiones', gastos: 'Gastos', caja: 'Caja', resultados: 'Estado de resultados' });

  const ddmm = (f) => f ? f.slice(8, 10) + '/' + f.slice(5, 7) : '';
  V.clientes = () => crud({
    tabla: 'clientes', titulo: 'Clientes', singular: 'cliente', codPrefix: 'CL',
    cols: [{ k: 'nombre', label: 'Nombre' }, { k: 'telefono', label: 'Teléfono' }, { k: 'ciudad', label: 'Ciudad' }, { k: 'cumple', label: 'Cumpleaños', fmt: (r) => ddmm(r.cumple) }],
    campos: [{ k: 'nombre', label: 'Nombre', req: true }, { k: 'telefono', label: 'Teléfono' }, { k: 'ciudad', label: 'Ciudad' }, { k: 'correo', label: 'Correo' }, { k: 'cumple', label: 'Fecha de cumpleaños', tipo: 'fecha' }, { k: 'nota', label: 'Nota', tipo: 'textarea' }],
    orden: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  });
  V.proveedores = () => crud({
    tabla: 'proveedores', titulo: 'Proveedores', singular: 'proveedor', codPrefix: 'PR',
    cols: [{ k: 'nombre', label: 'Nombre' }, { k: 'telefono', label: 'Teléfono' }, { k: 'provee', label: 'Qué provee' }],
    campos: [{ k: 'nombre', label: 'Nombre', req: true }, { k: 'telefono', label: 'Teléfono' }, { k: 'provee', label: '¿Qué provee?', tipo: 'textarea' }, { k: 'nota', label: 'Nota', tipo: 'textarea' }],
    orden: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  });
  V.gastos = () => crud({
    tabla: 'gastos', titulo: 'Gastos', singular: 'gasto',
    cols: [{ k: 'fecha', label: 'Fecha', fmt: (r) => fCorta(r.fecha) }, { k: 'concepto', label: 'Concepto' }, { k: 'categoria', label: 'Categoría' }, { k: 'monto', label: 'Monto', num: true, fmt: (r) => money(r.monto) }],
    campos: [{ k: 'fecha', label: 'Fecha', tipo: 'fecha', req: true }, { k: 'concepto', label: 'Concepto', req: true }, { k: 'categoria', label: 'Categoría' }, { k: 'monto', label: 'Monto', tipo: 'money', req: true }],
    nuevo: () => ({ fecha: hoy() }), orden: (a, b) => (b.fecha || '').localeCompare(a.fecha || ''),
  });

  V.equipo = function () {
    const ac = $('#accion'); ac.hidden = false; $('span', ac).textContent = 'Agregar persona';
    const camposEq = [{ k: 'nombre', label: 'Nombre', req: true }, { k: 'rol', label: 'Rol (p. ej. Embajador)' }, { k: 'telefono', label: 'Teléfono' }, { k: 'comision_pct', label: 'Comisión %', tipo: 'numero' }];
    { let camb = false; BIZ.equipo.forEach((p) => { if (!p.codigo) { p.codigo = nextCodigo('equipo', 'EQ'); camb = true; } }); if (camb) salvar(); }
    ac.onclick = async () => { const o = await abrirForm('Nueva persona', camposEq, {}); if (!o) return; o.id = uid(); o.codigo = nextCodigo('equipo', 'EQ'); BIZ.equipo.push(o); salvar(); P.render(); aviso('Guardado'); };
    const saldos = {};
    BIZ.equipo.forEach((p) => { saldos[p.id] = { gen: 0, pag: 0 }; });
    BIZ.ventas.forEach((v) => { if (!v.anulada && v.vendedor_id && saldos[v.vendedor_id] && v.pago === 'pagado') saldos[v.vendedor_id].gen += comisionVenta(v); });
    BIZ.pagos_equipo.forEach((p) => { if (saldos[p.persona_id]) saldos[p.persona_id].pag += int(p.valor); });
    $('#vista').innerHTML = BIZ.equipo.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Nombre</th><th>Rol</th><th class="num">Comisión</th><th class="num">Generado</th><th class="num">Pagado</th><th class="num">Saldo</th><th class="acc"></th></tr></thead><tbody>${BIZ.equipo.map((p) => { const s = saldos[p.id]; const saldo = s.gen - s.pag; return `<tr><td><b style="color:var(--peach-text,#9A5228)">${esc(p.codigo || '')}</b></td><td>${esc(p.nombre)}</td><td>${esc(p.rol || '')}</td><td class="num">${int(p.comision_pct)}%</td><td class="num">${money(s.gen)}</td><td class="num">${money(s.pag)}</td><td class="num"><b>${money(saldo)}</b></td><td class="acc"><button class="mini-link" data-pagar="${p.id}">Pagar</button> <button class="mini-link" data-ed="${p.id}">Editar</button> <button class="mini-link del" data-del="${p.id}">Eliminar</button></td></tr>`; }).join('')}</tbody></table></div><p class="note" style="margin-top:12px;color:var(--muted)">La comisión se genera con las ventas marcadas «pagado» asignadas a la persona.</p>`
      : `<p class="vacio">Aún no hay equipo. Agrega a tus vendedores o embajadores.</p>`;
    $('#vista').onclick = async (e) => {
      const ed = e.target.closest('[data-ed]'), del = e.target.closest('[data-del]'), pg = e.target.closest('[data-pagar]');
      if (ed) { const r = porId('equipo', ed.dataset.ed); const o = await abrirForm('Editar persona', camposEq, r); if (!o) return; Object.assign(r, o); salvar(); P.render(); }
      if (del) { if (!await confirmar('¿Eliminar esta persona?')) return; BIZ.equipo = BIZ.equipo.filter((x) => x.id !== del.dataset.del); salvar(); P.render(); }
      if (pg) { const r = porId('equipo', pg.dataset.pagar); const o = await abrirForm('Pagar comisión a ' + r.nombre, [{ k: 'valor', label: 'Valor a pagar', tipo: 'money', req: true }, { k: 'fecha', label: 'Fecha', tipo: 'fecha', req: true }], { fecha: hoy() }); if (!o) return; BIZ.pagos_equipo.push({ id: uid(), persona_id: r.id, valor: o.valor, fecha: o.fecha }); salvar(); P.render(); aviso('Pago registrado'); }
    };
  };

  /* ---------- editor de ítems (ventas/compras) ---------- */
  function editorItems(cont, items, opciones, recalc) {
    const fila = (it) => {
      const d = document.createElement('div'); d.className = 'item-fila';
      const op0 = opciones ? (opciones.find((o) => o.id === it.producto_id) || opciones[0] || {}) : null;
      d.innerHTML = opciones
        ? `<select class="sel">${opciones.map((o) => `<option value="${esc(o.id)}"${o.id === it.producto_id ? ' selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select><input class="q" type="number" min="1" value="${int(it.cant) || 1}"><input class="p" type="number" min="0" value="${int(it.precio) || int(op0.precio) || 0}"><button type="button" class="mini-link del">✕</button>`
        : `<input class="desc" type="text" placeholder="Descripción" value="${esc(it.desc || '')}"><input class="q" type="number" min="1" value="${int(it.cant) || 1}"><input class="p" type="number" min="0" value="${int(it.costo) || 0}"><button type="button" class="mini-link del">✕</button>`;
      d.querySelector('.del').onclick = () => { d.remove(); recalc(); };
      d.oninput = recalc;
      if (opciones) d.querySelector('.sel').onchange = () => { const o = opciones.find((x) => x.id === d.querySelector('.sel').value); if (o && o.precio != null) d.querySelector('.p').value = o.precio; recalc(); };
      return d;
    };
    (items.length ? items : [{}]).forEach((it) => cont.appendChild(fila(it)));
    cont._add = () => { cont.appendChild(fila({})); recalc(); };
    cont._leer = () => $$('.item-fila', cont).map((d) => opciones
      ? { producto_id: d.querySelector('.sel').value, nombre: (opciones.find((o) => o.id === d.querySelector('.sel').value) || {}).nombre || '', cant: int(d.querySelector('.q').value), precio: int(d.querySelector('.p').value), costo: (opciones.find((o) => o.id === d.querySelector('.sel').value) || {}).costo || 0 }
      : { desc: d.querySelector('.desc').value, cant: int(d.querySelector('.q').value), costo: int(d.querySelector('.p').value) }).filter((i) => opciones ? i.producto_id : i.desc);
  }

  function docVenta(venta) {
    const m = $('#modal'); const v = venta || { fecha: hoy(), pago: 'pagado', canal: 'directa', items: [], envio: 0 };
    const prods = P.productos().map((p) => ({ id: p.id, nombre: p.nombre, precio: int(p.precio), costo: int(p.costo) || 0, codigo: p.codigo || '' }));
    const byId = {}; prods.forEach((p) => byId[p.id] = p);
    const etiqueta = (p) => (p.codigo ? p.codigo + ' — ' : '') + p.nombre;
    const porEtiqueta = (val) => {
      val = (val || '').trim(); if (!val) return null;
      const cod = val.split('—')[0].trim().toUpperCase();
      return prods.find((p) => p.codigo && p.codigo.toUpperCase() === cod)
        || prods.find((p) => etiqueta(p).toLowerCase() === val.toLowerCase())
        || prods.find((p) => p.nombre.toLowerCase() === val.toLowerCase()) || null;
    };
    const thumbU = (id) => `assets/img/productos/thumb/${id}.webp`;
    const cli = BIZ.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    m.innerHTML = `<form class="modal-caja">
      <header><h2>${venta ? 'Editar venta' : 'Nueva venta'}</h2><button type="button" class="cerrar" data-x>×</button></header>
      <div class="modal-cuerpo">
        <div class="campo-2">
          <div class="campo"><label>Fecha</label><input data-k="fecha" type="date" value="${esc(v.fecha)}"></div>
          <div class="campo"><label>Cliente</label><select data-k="cliente_id"><option value="">Mostrador</option>${cli.map((c) => `<option value="${c.id}"${c.id === v.cliente_id ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div>
        </div>
        <div class="campo-2">
          <div class="campo"><label>Vendedor</label><select data-k="vendedor_id"><option value="">—</option>${BIZ.equipo.map((p) => `<option value="${p.id}"${p.id === v.vendedor_id ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="campo"><label>Pago</label><select data-k="pago"><option value="pagado"${v.pago === 'pagado' ? ' selected' : ''}>Pagado</option><option value="pendiente"${v.pago === 'pendiente' ? ' selected' : ''}>Pendiente</option></select></div>
        </div>
        <div class="campo"><label>Productos</label>
          <div class="vhead"><span></span><span>Producto (busca por código o nombre)</span><span>Cant</span><span>Precio</span><span>Costo</span><span>Subtotal</span><span></span></div>
          <div class="vitems" id="items"></div>
          <button type="button" class="mini-link" id="add-item" style="justify-self:start;margin-top:6px">+ Agregar producto</button>
          <datalist id="vlist">${prods.map((p) => `<option value="${esc(etiqueta(p))}">`).join('')}</datalist>
        </div>
        <div class="campo-2"><div class="campo"><label>Envío (COP)</label><input data-k="envio" type="number" min="0" value="${int(v.envio)}"></div><div></div></div>
        <div class="barra-total"><span>Total <b id="tot">$ 0</b></span><span class="bt-gan">Ganancia <b id="gan">$ 0</b> <small id="mar">0%</small></span></div>
      </div>
      <footer>${venta ? '<button type="button" class="mini-link del" data-anular style="color:var(--peach-text)">Eliminar</button>' : ''}<div class="botones"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button type="submit" class="btn btn-primary">Guardar venta</button></div></footer>
    </form>`;
    m.showModal();
    const cont = $('#items', m);
    function recalc() {
      let sub = 0, cost = 0;
      $$('.vrow', cont).forEach((d) => {
        const q = int(d.querySelector('.q').value), pp = int(d.querySelector('.vp').value), cc = int(d.querySelector('.vc').value);
        d.querySelector('.vsub').textContent = money(q * pp); sub += q * pp; cost += q * cc;
      });
      const env = int($('[data-k=envio]', m).value);
      $('#tot', m).textContent = money(sub + env);
      const gan = sub - cost; $('#gan', m).textContent = money(gan);
      $('#mar', m).textContent = (sub ? Math.round(gan / sub * 100) : 0) + '%';
    }
    function fila(it) {
      const p = it.producto_id ? byId[it.producto_id] : null;
      const d = document.createElement('div'); d.className = 'vrow';
      d.innerHTML = `<img class="vthumb" alt="" src="${p ? thumbU(p.id) : ''}"${p ? '' : ' style="visibility:hidden"'} onerror="this.style.visibility='hidden'">`
        + `<input class="vbusca" list="vlist" placeholder="Código o nombre…" value="${p ? esc(etiqueta(p)) : ''}">`
        + `<input class="q" type="number" min="1" value="${int(it.cant) || 1}">`
        + `<input class="vp" type="number" min="0" value="${int(it.precio) || (p ? p.precio : 0)}">`
        + `<input class="vc" type="number" min="0" value="${int(it.costo) || (p ? p.costo : 0)}">`
        + `<span class="vsub">$ 0</span><button type="button" class="mini-link del">✕</button>`;
      const img = d.querySelector('.vthumb'), bus = d.querySelector('.vbusca'), vp = d.querySelector('.vp'), vc = d.querySelector('.vc');
      bus.addEventListener('change', () => { const pr = porEtiqueta(bus.value); if (pr) { img.src = thumbU(pr.id); img.style.visibility = 'visible'; vp.value = pr.precio; vc.value = pr.costo; } else { img.style.visibility = 'hidden'; } recalc(); });
      bus.addEventListener('input', () => { const pr = porEtiqueta(bus.value); if (pr) { img.src = thumbU(pr.id); img.style.visibility = 'visible'; } });
      d.querySelector('.del').onclick = () => { d.remove(); recalc(); };
      [d.querySelector('.q'), vp, vc].forEach((i) => i.addEventListener('input', recalc));
      return d;
    }
    (v.items && v.items.length ? v.items : [{}]).forEach((it) => cont.appendChild(fila(it)));
    cont._leer = () => $$('.vrow', cont).map((d) => {
      const pr = porEtiqueta(d.querySelector('.vbusca').value); if (!pr) return null;
      return { producto_id: pr.id, nombre: pr.nombre, cant: int(d.querySelector('.q').value), precio: int(d.querySelector('.vp').value), costo: int(d.querySelector('.vc').value) };
    }).filter(Boolean);
    $('#add-item', m).onclick = () => { cont.appendChild(fila({})); recalc(); };
    $('[data-k=envio]', m).oninput = recalc; recalc();
    $$('[data-x]', m).forEach((b) => b.onclick = () => m.close());
    const an = $('[data-anular]', m); if (an) an.onclick = async () => { if (!await confirmar('¿Eliminar esta venta?')) return; BIZ.ventas = BIZ.ventas.filter((x) => x.id !== v.id); salvar(); m.close(); P.render(); aviso('Venta eliminada'); };
    $('form', m).onsubmit = (e) => {
      e.preventDefault(); const its = cont._leer();
      if (!its.length) { aviso('Agrega al menos un producto (búscalo por código o nombre)', 'error'); return; }
      const o = Object.assign({}, v, { fecha: $('[data-k=fecha]', m).value, cliente_id: $('[data-k=cliente_id]', m).value, vendedor_id: $('[data-k=vendedor_id]', m).value, pago: $('[data-k=pago]', m).value, envio: int($('[data-k=envio]', m).value), items: its });
      if (!v.id) { o.id = uid(); o.numero = numero('ventas'); BIZ.ventas.push(o); } else { const r = porId('ventas', v.id); Object.assign(r, o); }
      salvar(); m.close(); P.render(); aviso('Venta guardada');
    };
  }

  V.ventas = function () {
    const ac = $('#accion'); ac.hidden = false; $('span', ac).textContent = 'Nueva venta'; ac.onclick = () => docVenta(null);
    const vs = BIZ.ventas.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.numero || 0) - (a.numero || 0));
    const nombreCli = (id) => { const c = porId('clientes', id); return c ? c.nombre : 'Mostrador'; };
    const hoyS = hoy(), mesS = hoyS.slice(0, 7), anioS = hoyS.slice(0, 4);
    const acum = (pred) => { let ven = 0, gan = 0, u = 0; BIZ.ventas.forEach((v) => { if (v.anulada || !pred((v.fecha || ''))) return; const t = tv(v); ven += t.total; gan += t.sub - t.costo; u += t.unidades; }); return { ven, gan, u }; };
    const kHoy = acum((f) => f.slice(0, 10) === hoyS), kMes = acum((f) => f.slice(0, 7) === mesS), kAnio = acum((f) => f.slice(0, 4) === anioS);
    const kpi = (lbl, k) => `<div class="vkpi"><span>${lbl}</span><b>${money(k.ven)}</b><em>Ganancia ${money(k.gan)}</em><small>${k.u} unid.</small></div>`;
    const kpis = `<div class="ventas-kpis">${kpi('Hoy', kHoy)}${kpi('Este mes', kMes)}${kpi('Este año', kAnio)}</div>`;
    $('#vista').innerHTML = kpis + (vs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th class="num">Unid.</th><th class="num">Total</th><th class="num">Ganancia</th><th class="num">Margen</th><th>Pago</th><th class="acc"></th></tr></thead><tbody>${vs.map((v) => { const t = tv(v); const g = t.sub - t.costo; const mar = t.sub ? Math.round(g / t.sub * 100) : 0; return `<tr><td>${v.numero || ''}</td><td>${fCorta(v.fecha)}</td><td>${esc(nombreCli(v.cliente_id))}</td><td class="num">${t.unidades}</td><td class="num">${money(t.total)}</td><td class="num" style="color:var(--mint-text);font-weight:700">${money(g)}</td><td class="num">${mar}%</td><td><span class="badge ${v.pago === 'pagado' ? 'ok' : 'warn'}">${v.pago === 'pagado' ? 'Pagado' : 'Pendiente'}</span></td><td class="acc"><button class="mini-link" data-ed="${v.id}">Ver / editar</button></td></tr>`; }).join('')}</tbody></table></div>`
      : `<p class="vacio">Aún no hay ventas. Usa «Nueva venta».</p>`);
    $('#vista').onclick = (e) => { const ed = e.target.closest('[data-ed]'); if (ed) docVenta(porId('ventas', ed.dataset.ed)); };
  };

  function docCompra(compra) {
    const m = $('#modal'); const c = compra || { fecha: hoy(), items: [], flete: 0 };
    m.innerHTML = `<form class="modal-caja">
      <header><h2>${compra ? 'Editar compra' : 'Nueva compra'}</h2><button type="button" class="cerrar" data-x>×</button></header>
      <div class="modal-cuerpo">
        <div class="campo-2">
          <div class="campo"><label>Fecha</label><input data-k="fecha" type="date" value="${esc(c.fecha)}"></div>
          <div class="campo"><label>Proveedor</label><select data-k="proveedor_id"><option value="">—</option>${BIZ.proveedores.map((p) => `<option value="${p.id}"${p.id === c.proveedor_id ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
        </div>
        <div class="campo"><label>Insumos / productos</label><div class="items-editor" id="items"></div><button type="button" class="mini-link" id="add-item" style="justify-self:start;margin-top:4px">+ Agregar línea</button></div>
        <div class="campo-2"><div class="campo"><label>Flete (COP)</label><input data-k="flete" type="number" min="0" value="${int(c.flete)}"></div><div></div></div>
        <div class="barra-total">Total <b id="tot">$ 0</b></div>
      </div>
      <footer>${compra ? '<button type="button" class="mini-link del" data-anular style="color:var(--peach-text)">Eliminar</button>' : ''}<div class="botones"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button type="submit" class="btn btn-primary">Guardar compra</button></div></footer>
    </form>`;
    m.showModal();
    const cont = $('#items', m);
    const recalc = () => { const its = cont._leer(); const sub = its.reduce((a, i) => a + i.cant * i.costo, 0); $('#tot', m).textContent = money(sub + int($('[data-k=flete]', m).value)); };
    editorItems(cont, c.items || [], null, recalc);
    $('#add-item', m).onclick = () => cont._add();
    $('[data-k=flete]', m).oninput = recalc; recalc();
    $$('[data-x]', m).forEach((b) => b.onclick = () => m.close());
    const an = $('[data-anular]', m); if (an) an.onclick = async () => { if (!await confirmar('¿Eliminar esta compra?')) return; BIZ.compras = BIZ.compras.filter((x) => x.id !== c.id); salvar(); m.close(); P.render(); };
    $('form', m).onsubmit = (e) => {
      e.preventDefault(); const its = cont._leer(); if (!its.length) { aviso('Agrega al menos una línea', 'error'); return; }
      const o = Object.assign({}, c, { fecha: $('[data-k=fecha]', m).value, proveedor_id: $('[data-k=proveedor_id]', m).value, flete: int($('[data-k=flete]', m).value), items: its });
      if (!c.id) { o.id = uid(); o.numero = numero('compras'); BIZ.compras.push(o); } else { Object.assign(porId('compras', c.id), o); }
      salvar(); m.close(); P.render(); aviso('Compra guardada');
    };
  }

  V.compras = function () {
    const ac = $('#accion'); ac.hidden = false; $('span', ac).textContent = 'Nueva compra'; ac.onclick = () => docCompra(null);
    const cs = BIZ.compras.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const prov = (id) => { const p = porId('proveedores', id); return p ? p.nombre : '—'; };
    $('#vista').innerHTML = cs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Fecha</th><th>Proveedor</th><th class="num">Total</th><th class="acc"></th></tr></thead><tbody>${cs.map((c) => `<tr><td>${c.numero || ''}</td><td>${fCorta(c.fecha)}</td><td>${esc(prov(c.proveedor_id))}</td><td class="num">${money(totCompra(c))}</td><td class="acc"><button class="mini-link" data-ed="${c.id}">Ver / editar</button></td></tr>`).join('')}</tbody></table></div>`
      : `<p class="vacio">Aún no hay compras registradas.</p>`;
    $('#vista').onclick = (e) => { const ed = e.target.closest('[data-ed]'); if (ed) docCompra(porId('compras', ed.dataset.ed)); };
  };

  V.inventario = function () {
    const ps = P.productos().filter((p) => !p._oculto);
    const st = V.inventario._q || (V.inventario._q = { q: '' });
    const dibujar = () => {
      const q = norm(st.q);
      const list = ps.filter((p) => !q || norm(p.nombre).includes(q)).map((p) => ({ p, s: stockActual(p) })).sort((a, b) => a.s - b.s);
      $('#inv-tabla').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Producto</th><th>Sección</th><th class="num">Vendidas</th><th class="num">Ajustes</th><th class="num">Stock</th><th class="acc"></th></tr></thead><tbody>${list.map(({ p, s }) => `<tr><td>${esc(p.nombre)}</td><td>${esc(P.secNombre(p.seccion))}</td><td class="num">${salidas(p.id)}</td><td class="num">${movs(p.id)}</td><td class="num"><span class="badge ${s <= 0 ? 'bajo' : s < 5 ? 'warn' : 'ok'}">${s}</span></td><td class="acc"><button class="mini-link" data-mov="${p.id}">Ajustar</button></td></tr>`).join('')}</tbody></table></div>`;
    };
    $('#vista').innerHTML = `<p class="note" style="color:var(--muted);margin:0 0 14px">Stock = existencia base del producto + entradas/ajustes − unidades vendidas. Ordenado de menor a mayor stock.</p><div class="filtros"><input id="inv-q" class="busca" type="search" placeholder="Buscar producto…"></div><div id="inv-tabla"></div>`;
    $('#inv-q').oninput = (e) => { st.q = e.target.value; dibujar(); };
    $('#vista').onclick = async (e) => {
      const mv = e.target.closest('[data-mov]'); if (!mv) return;
      const p = ps.find((x) => x.id === mv.dataset.mov);
      const o = await abrirForm('Ajustar stock · ' + p.nombre, [{ k: 'tipo', label: 'Movimiento', tipo: 'select', opciones: [{ id: 'entrada', nombre: 'Entrada (+)' }, { id: 'salida', nombre: 'Salida (−)' }] }, { k: 'cant', label: 'Cantidad', tipo: 'numero', req: true }, { k: 'nota', label: 'Nota' }], { tipo: 'entrada' });
      if (!o) return;
      const delta = (o.tipo === 'salida' ? -1 : 1) * Math.abs(int(o.cant));
      BIZ.movimientos.push({ id: uid(), producto_id: p.id, delta, nota: o.nota, fecha: hoy() }); salvar(); dibujar(); aviso('Stock ajustado');
    };
    dibujar();
  };

  /* ---------- Caja ---------- */
  V.caja = function () {
    const ac = $('#accion'); ac.hidden = false; $('span', ac).textContent = 'Movimiento';
    ac.onclick = async () => { const o = await abrirForm('Movimiento de caja', [{ k: 'tipo', label: 'Tipo', tipo: 'select', opciones: [{ id: 'ingreso', nombre: 'Ingreso (+)' }, { id: 'egreso', nombre: 'Egreso (−)' }] }, { k: 'concepto', label: 'Concepto', req: true }, { k: 'monto', label: 'Monto', tipo: 'money', req: true }, { k: 'fecha', label: 'Fecha', tipo: 'fecha', req: true }], { tipo: 'ingreso', fecha: hoy() }); if (!o) return; o.id = uid(); BIZ.caja.push(o); salvar(); P.render(); aviso('Registrado'); };
    const mov = [];
    BIZ.ventas.forEach((v) => { if (!v.anulada && v.pago === 'pagado') mov.push({ fecha: v.fecha, concepto: 'Venta #' + (v.numero || ''), signo: 1, monto: tv(v).total, fijo: true }); });
    BIZ.compras.forEach((c) => mov.push({ fecha: c.fecha, concepto: 'Compra #' + (c.numero || ''), signo: -1, monto: totCompra(c), fijo: true }));
    BIZ.gastos.forEach((g) => mov.push({ fecha: g.fecha, concepto: 'Gasto: ' + g.concepto, signo: -1, monto: int(g.monto), fijo: true }));
    BIZ.pagos_equipo.forEach((p) => { const per = porId('equipo', p.persona_id); mov.push({ fecha: p.fecha, concepto: 'Pago comisión ' + (per ? per.nombre : ''), signo: -1, monto: int(p.valor), fijo: true }); });
    BIZ.caja.forEach((c) => mov.push({ id: c.id, fecha: c.fecha, concepto: c.concepto, signo: c.tipo === 'egreso' ? -1 : 1, monto: int(c.monto), fijo: false }));
    mov.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const inicial = int(BIZ.empresa.saldo_inicial);
    let saldo = inicial; mov.forEach((x) => { x.saldo = (saldo += x.signo * x.monto); });
    const ingresos = mov.filter((x) => x.signo > 0).reduce((a, x) => a + x.monto, 0);
    const egresos = mov.filter((x) => x.signo < 0).reduce((a, x) => a + x.monto, 0);
    $('#vista').innerHTML = `<div class="kpis"><div class="kpi"><b>${money(saldo)}</b><span>Saldo en caja</span></div><div class="kpi"><b>${money(ingresos)}</b><span>Ingresos</span></div><div class="kpi"><b>${money(egresos)}</b><span>Egresos</span></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Monto</th><th class="num">Saldo</th><th class="acc"></th></tr></thead><tbody>${mov.slice().reverse().map((x) => `<tr><td>${fCorta(x.fecha)}</td><td>${esc(x.concepto)}</td><td class="num" style="color:${x.signo > 0 ? 'var(--mint-text)' : 'var(--peach-text)'}">${x.signo > 0 ? '+' : '−'} ${money(x.monto)}</td><td class="num">${money(x.saldo)}</td><td class="acc">${x.fijo ? '' : `<button class="mini-link del" data-del="${x.id}">Eliminar</button>`}</td></tr>`).join('')}</tbody></table></div>
      <p class="note" style="margin-top:12px;color:var(--muted)">La caja suma ventas pagadas y resta compras, gastos y pagos de comisión automáticamente. Agrega movimientos manuales con el botón de arriba.</p>`;
    $('#vista').onclick = async (e) => { const del = e.target.closest('[data-del]'); if (!del) return; if (!await confirmar('¿Eliminar este movimiento?')) return; BIZ.caja = BIZ.caja.filter((x) => x.id !== del.dataset.del); salvar(); P.render(); };
  };

  /* ---------- Estado de resultados ---------- */
  V.resultados = function () {
    const st = V.resultados._p || (V.resultados._p = { per: 'mes' });
    const dibujar = () => {
      const r = rango(st.per);
      const vs = BIZ.ventas.filter((v) => !v.anulada && enRango(v.fecha, r));
      const ingresos = vs.reduce((a, v) => a + tv(v).sub, 0);
      const costo = vs.reduce((a, v) => a + tv(v).costo, 0);
      const comis = vs.reduce((a, v) => a + comisionVenta(v), 0);
      const gastos = BIZ.gastos.filter((g) => enRango(g.fecha, r)).reduce((a, g) => a + int(g.monto), 0);
      const bruta = ingresos - costo, neta = bruta - gastos - comis;
      $('#pyg').innerHTML = `
        <div class="fila"><span>Ingresos por ventas</span><b>${money(ingresos)}</b></div>
        <div class="fila"><span>− Costo de los productos</span><b>${money(costo)}</b></div>
        <div class="fila"><span>Utilidad bruta</span><b>${money(bruta)}</b></div>
        <div class="fila"><span>− Gastos</span><b>${money(gastos)}</b></div>
        <div class="fila"><span>− Comisiones</span><b>${money(comis)}</b></div>
        <div class="fila tot"><span>Utilidad neta</span><b>${money(neta)}</b></div>`;
      $('#res-unidades').textContent = vs.reduce((a, v) => a + tv(v).unidades, 0) + ' unidades · ' + vs.length + ' ventas';
    };
    $('#vista').innerHTML = `<div class="periodos" id="per">${Object.entries(PERIODOS).map(([k, l]) => `<button data-per="${k}" class="${k === st.per ? 'activo' : ''}">${esc(l)}</button>`).join('')}</div><div class="pyg" id="pyg"></div><p class="note" style="margin-top:12px;color:var(--muted)" id="res-unidades"></p>`;
    $('#per').onclick = (e) => { const b = e.target.closest('[data-per]'); if (!b) return; st.per = b.dataset.per; $$('#per button').forEach((x) => x.classList.toggle('activo', x === b)); dibujar(); };
    dibujar();
  };

  /* ---------- enriquecer el Resumen con cifras de negocio ---------- */
  const resumenBase = V.resumen;
  V.resumen = function () {
    resumenBase();
    const r = rango('mes');
    const vs = BIZ.ventas.filter((v) => !v.anulada && enRango(v.fecha, r));
    if (!BIZ.ventas.length && !BIZ.clientes.length) return; // sin datos de negocio aún, deja el resumen de catálogo
    const ingresos = vs.reduce((a, v) => a + tv(v).total, 0);
    const extra = document.createElement('div');
    extra.innerHTML = `<h3 style="font-family:var(--font-display);color:var(--night);margin:26px 0 12px">Este mes</h3>
      <div class="kpis"><div class="kpi"><b>${vs.length}</b><span>Ventas</span></div><div class="kpi"><b>${money(ingresos)}</b><span>Ingresos</span></div><div class="kpi"><b>${BIZ.clientes.length}</b><span>Clientes</span></div><div class="kpi"><b>${BIZ.equipo.length}</b><span>Equipo</span></div></div>`;
    $('#vista').appendChild(extra);
  };

})();
