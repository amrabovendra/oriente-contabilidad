// Oriente - Contabilidad: frontend simple en JS normal (sin frameworks),
// igual de espíritu que la app de ganado.

let SESION = null; // { nombre, rol }

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function formatoMoneda(n) {
  return Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}
function formatoFecha(f) {
  return new Date(f).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
}

async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  if (res.status === 401) {
    mostrarLogin();
    throw new Error('Sesión expirada.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : 'Error en el servidor.');
  return data;
}

// ---------- Login ----------
function mostrarLogin() {
  $('#pantalla-login').classList.remove('oculto');
  $('#app').classList.add('oculto');
}
function mostrarApp() {
  $('#pantalla-login').classList.add('oculto');
  $('#app').classList.remove('oculto');
}

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  const usuario = $('#login-usuario').value.trim();
  const clave = $('#login-clave').value;
  try {
    const data = await api('/auth/login', { method: 'POST', body: { usuario, clave } });
    SESION = data;
    iniciarApp();
  } catch (err) {
    $('#login-error').textContent = 'Usuario o clave incorrectos.';
  }
});

$('#btn-salir').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' });
  SESION = null;
  mostrarLogin();
});

// ---------- Navegación ----------
const SECCIONES_BASE = [
  { id: 'libro', etiqueta: 'Libro contable' },
  { id: 'gastos', etiqueta: 'Gastos' },
  { id: 'creditos', etiqueta: 'Créditos' },
  { id: 'compras-generales', etiqueta: 'Compras generales' },
  { id: 'transporte', etiqueta: 'Transporte' },
  { id: 'desprendible', etiqueta: 'Desprendible' },
];
const SECCIONES_ADMIN = [
  { id: 'compra-ganado', etiqueta: 'Compra de ganado' },
  { id: 'venta-ganado', etiqueta: 'Venta de ganado' },
  { id: 'usuarios', etiqueta: 'Usuarios' },
];

function construirNav() {
  const nav = $('#nav-principal');
  nav.innerHTML = '';
  const secciones = SESION.rol === 'ADMIN' ? [...SECCIONES_BASE, ...SECCIONES_ADMIN] : SECCIONES_BASE;
  for (const s of secciones) {
    const btn = document.createElement('button');
    btn.textContent = s.etiqueta;
    btn.dataset.seccion = s.id;
    btn.addEventListener('click', () => irASeccion(s.id));
    nav.appendChild(btn);
  }
}

function irASeccion(id) {
  $$('nav button').forEach((b) => b.classList.toggle('activo', b.dataset.seccion === id));
  $$('.seccion').forEach((s) => s.classList.toggle('activa', s.dataset.seccion === id));
  const cargadores = {
    libro: cargarLibro,
    gastos: cargarGastos,
    creditos: cargarCreditos,
    'compras-generales': cargarComprasGenerales,
    transporte: cargarTransporte,
    'compra-ganado': cargarCompraGanado,
    'venta-ganado': cargarVentaGanado,
    usuarios: cargarUsuarios,
  };
  if (cargadores[id]) cargadores[id]();
}

async function iniciarApp() {
  if (!SESION) {
    try { SESION = await api('/auth/quien-soy'); } catch (e) { mostrarLogin(); return; }
  }
  $('#info-nombre').textContent = SESION.nombre;
  $('#info-rol').textContent = SESION.rol === 'ADMIN' ? 'Administradora' : 'Ayudante';
  construirNav();
  mostrarApp();
  irASeccion('libro');
}

// ---------- Helper genérico para módulos simples (tabla + formulario) ----------
function renderFilaBorrar(ruta, id, onBorrado) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.textContent = 'Borrar';
  btn.className = 'boton-secundario boton-peligro';
  btn.addEventListener('click', async () => {
    if (!confirm('¿Seguro que quieres borrar este registro?')) return;
    await api(`${ruta}/${id}`, { method: 'DELETE' });
    onBorrado();
  });
  td.appendChild(btn);
  return td;
}

// ---------- Gastos ----------
async function cargarGastos() {
  const lista = await api('/gastos');
  const tbody = $('#gastos-tabla');
  tbody.innerHTML = '';
  for (const g of lista) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatoFecha(g.fecha)}</td><td>${g.descripcion}</td><td>${formatoMoneda(g.monto)}</td><td>${g.registradoPor.nombre}</td>`;
    tr.appendChild(renderFilaBorrar('/gastos', g.id, cargarGastos));
    tbody.appendChild(tr);
  }
}
$('#form-gastos').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('/gastos', { method: 'POST', body: { fecha: f.get('fecha'), descripcion: f.get('descripcion'), monto: Number(f.get('monto')) } });
  e.target.reset();
  cargarGastos();
});

// ---------- Créditos ----------
async function cargarCreditos() {
  const lista = await api('/creditos');
  const cont = $('#creditos-lista');
  cont.innerHTML = '';
  for (const c of lista) {
    const div = document.createElement('div');
    div.style.cssText = 'border:1px solid #d8d4c8;border-radius:8px;padding:10px;margin-bottom:10px;';
    const pagosHtml = c.pagos.map((p) => `<li>${formatoFecha(p.fecha)} — ${formatoMoneda(p.monto)} (${p.registradoPor ? p.registradoPor.nombre : ''})</li>`).join('');
    div.innerHTML = `
      <strong>${c.acreedor}</strong> — factura ${c.numeroFactura} — ${formatoFecha(c.fecha)}<br>
      Monto original: ${formatoMoneda(c.montoOriginal)} · Saldo: <strong>${formatoMoneda(c.saldo)}</strong>
      ${c.saldado ? '<div class="nota-saldado">✅ Saldado — ya puedes hacer la relación</div>' : ''}
      ${c.nota ? `<div style="font-size:13px;color:#555;">Nota: ${c.nota}</div>` : ''}
      <ul style="font-size:13px;">${pagosHtml}</ul>
    `;
    if (!c.saldado) {
      const formAbono = document.createElement('form');
      formAbono.className = 'formulario';
      formAbono.innerHTML = `
        <label>Fecha abono <input type="date" name="fecha" required></label>
        <label>Monto <input type="number" step="0.01" name="monto" required></label>
        <div><button type="submit" class="boton-secundario">Abonar</button></div>
      `;
      formAbono.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const resp = await api(`/creditos/${c.id}/abonos`, { method: 'POST', body: { fecha: f.get('fecha'), monto: Number(f.get('monto')) } });
        if (resp.quedoSaldado) alert(`¡Factura ${c.numeroFactura} de ${c.acreedor} quedó saldada! Ya puedes hacer la relación.`);
        cargarCreditos();
      });
      div.appendChild(formAbono);
    }
    const btnBorrar = document.createElement('button');
    btnBorrar.textContent = 'Borrar crédito';
    btnBorrar.className = 'boton-secundario boton-peligro';
    btnBorrar.addEventListener('click', async () => {
      if (!confirm('¿Seguro? Esto borra el crédito y todos sus abonos.')) return;
      await api(`/creditos/${c.id}`, { method: 'DELETE' });
      cargarCreditos();
    });
    div.appendChild(btnBorrar);
    cont.appendChild(div);
  }
}
$('#form-creditos').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('/creditos', {
    method: 'POST',
    body: {
      fecha: f.get('fecha'), numeroFactura: f.get('numeroFactura'), acreedor: f.get('acreedor'),
      montoOriginal: Number(f.get('montoOriginal')), nota: f.get('nota') || null,
    },
  });
  e.target.reset();
  cargarCreditos();
});

// ---------- Compras generales ----------
const ETIQUETAS_CATEGORIA = { MEDICO_INSUMOS: 'Médico / Insumos', MANTENIMIENTO: 'Mantenimiento finca', NO_OPERATIVO: 'Gasto no operativo' };
async function cargarComprasGenerales() {
  const lista = await api('/compras-generales');
  const tbody = $('#compras-generales-tabla');
  tbody.innerHTML = '';
  for (const c of lista) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatoFecha(c.fecha)}</td><td>${ETIQUETAS_CATEGORIA[c.categoria] || c.categoria}</td><td>${c.descripcion}</td><td>${formatoMoneda(c.monto)}</td><td>${c.registradoPor.nombre}</td>`;
    tr.appendChild(renderFilaBorrar('/compras-generales', c.id, cargarComprasGenerales));
    tbody.appendChild(tr);
  }
}
$('#form-compras-generales').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('/compras-generales', { method: 'POST', body: { fecha: f.get('fecha'), categoria: f.get('categoria'), descripcion: f.get('descripcion'), monto: Number(f.get('monto')) } });
  e.target.reset();
  cargarComprasGenerales();
});

// ---------- Transporte ----------
async function cargarTransporte() {
  const lista = await api('/transporte');
  const tbody = $('#transporte-tabla');
  tbody.innerHTML = '';
  for (const t of lista) {
    const ruta = [t.origen, t.destino].filter(Boolean).join(' → ');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatoFecha(t.fecha)}</td><td>${ruta}</td><td>${t.queSeTransporto || ''}</td><td>${t.transportador || ''}</td><td>${formatoMoneda(t.costo)}</td><td>${t.registradoPor.nombre}</td>`;
    tr.appendChild(renderFilaBorrar('/transporte', t.id, cargarTransporte));
    tbody.appendChild(tr);
  }
}
$('#form-transporte').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('/transporte', {
    method: 'POST',
    body: {
      fecha: f.get('fecha'), origen: f.get('origen') || null, destino: f.get('destino') || null,
      queSeTransporto: f.get('queSeTransporto') || null, transportador: f.get('transportador') || null,
      costo: Number(f.get('costo')),
    },
  });
  e.target.reset();
  cargarTransporte();
});

// ---------- Compra / Venta de ganado (solo admin) ----------
async function cargarCompraGanado() {
  const lista = await api('/compra-ganado');
  const tbody = $('#compra-ganado-tabla');
  tbody.innerHTML = '';
  for (const c of lista) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatoFecha(c.fecha)}</td><td>${c.arete || ''}</td><td>${c.proveedor || ''}</td><td>${c.descripcion || ''}</td><td>${formatoMoneda(c.monto)}</td><td>${c.registradoPor.nombre}</td>`;
    tr.appendChild(renderFilaBorrar('/compra-ganado', c.id, cargarCompraGanado));
    tbody.appendChild(tr);
  }
}
$('#form-compra-ganado').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('/compra-ganado', { method: 'POST', body: { fecha: f.get('fecha'), arete: f.get('arete') || null, proveedor: f.get('proveedor') || null, descripcion: f.get('descripcion') || null, monto: Number(f.get('monto')) } });
  e.target.reset();
  cargarCompraGanado();
});

async function cargarVentaGanado() {
  const lista = await api('/venta-ganado');
  const tbody = $('#venta-ganado-tabla');
  tbody.innerHTML = '';
  for (const v of lista) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${formatoFecha(v.fecha)}</td><td>${v.arete || ''}</td><td>${v.comprador || ''}</td><td>${v.descripcion || ''}</td><td>${formatoMoneda(v.monto)}</td><td>${v.registradoPor.nombre}</td>`;
    tr.appendChild(renderFilaBorrar('/venta-ganado', v.id, cargarVentaGanado));
    tbody.appendChild(tr);
  }
}
$('#form-venta-ganado').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  await api('/venta-ganado', { method: 'POST', body: { fecha: f.get('fecha'), arete: f.get('arete') || null, comprador: f.get('comprador') || null, descripcion: f.get('descripcion') || null, monto: Number(f.get('monto')) } });
  e.target.reset();
  cargarVentaGanado();
});

// ---------- Usuarios (solo admin) ----------
async function cargarUsuarios() {
  const lista = await api('/usuarios');
  const tbody = $('#usuarios-tabla');
  tbody.innerHTML = '';
  for (const u of lista) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.nombre}</td><td>${u.usuario}</td><td>${u.rol === 'ADMIN' ? 'Admin' : 'Ayudante'}</td><td>${u.activo ? 'Sí' : 'No'}</td>`;
    tbody.appendChild(tr);
  }
}
$('#form-usuarios').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/usuarios', { method: 'POST', body: { nombre: f.get('nombre'), usuario: f.get('usuario'), clave: f.get('clave'), rol: f.get('rol') } });
    e.target.reset();
    cargarUsuarios();
  } catch (err) {
    alert('No se pudo crear: ' + err.message);
  }
});

// ---------- Libro contable ----------
function renderResumen(contId, resumen) {
  const cont = $(contId);
  cont.innerHTML = `
    <div class="resumen-caja ingreso"><div>Ingresos</div><div class="valor">${formatoMoneda(resumen.totalIngresos)}</div></div>
    <div class="resumen-caja egreso"><div>Egresos</div><div class="valor">${formatoMoneda(resumen.totalEgresos)}</div></div>
    <div class="resumen-caja"><div>Saldo neto</div><div class="valor">${formatoMoneda(resumen.saldoNeto)}</div></div>
  `;
  const porCat = Object.entries(resumen.totalesPorCategoria).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [cat, monto] of porCat) {
    const caja = document.createElement('div');
    caja.className = 'resumen-caja ' + (monto >= 0 ? 'ingreso' : 'egreso');
    caja.innerHTML = `<div>${cat}</div><div class="valor">${formatoMoneda(monto)}</div>`;
    cont.appendChild(caja);
  }
}

function renderTablaMovimientos(tbodyId, movimientos) {
  const tbody = $(tbodyId);
  tbody.innerHTML = '';
  for (const m of movimientos) {
    const tr = document.createElement('tr');
    tr.className = m.tipo === 'INGRESO' ? 'ingreso' : 'egreso';
    tr.innerHTML = `<td>${formatoFecha(m.fecha)}</td><td>${m.tipo}</td><td>${m.categoria}</td><td>${m.descripcion}</td><td class="monto">${formatoMoneda(m.monto)}</td><td>${formatoMoneda(m.saldoDespues)}</td><td>${m.registradoPor}</td>`;
    tbody.appendChild(tr);
  }
}

async function cargarLibro() {
  const desde = $('#libro-desde').value;
  const hasta = $('#libro-hasta').value;
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const data = await api('/libro?' + params.toString());
  renderResumen('#libro-resumen', data.resumen);
  renderTablaMovimientos('#libro-tabla', data.movimientos);
  $('#libro-nota-alcance').textContent = data.alcance === 'completo'
    ? ''
    : 'Nota: esta vista no incluye compra ni venta de ganado.';
}
$('#btn-filtrar-libro').addEventListener('click', cargarLibro);
$('#btn-limpiar-libro').addEventListener('click', () => { $('#libro-desde').value = ''; $('#libro-hasta').value = ''; cargarLibro(); });

// ---------- Desprendible ----------
async function generarDesprendible() {
  const anio = $('#desp-anio').value;
  const mes = $('#desp-mes').value;
  const params = new URLSearchParams({ anio });
  if (mes) params.set('mes', mes);
  const data = await api('/libro/desprendible?' + params.toString());
  const cont = $('#desp-contenido');
  cont.innerHTML = `<h3>Período: ${data.periodo}</h3><div class="resumen-grid" id="desp-resumen"></div>
    <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Saldo</th><th>Quién</th></tr></thead><tbody id="desp-tabla"></tbody></table>`;
  renderResumen('#desp-resumen', data.resumen);
  renderTablaMovimientos('#desp-tabla', data.movimientos);
}
$('#btn-generar-desprendible').addEventListener('click', generarDesprendible);
$('#btn-imprimir-desprendible').addEventListener('click', () => window.print());

// ---------- Arranque ----------
iniciarApp();

// Registrar el service worker para que la app se pueda instalar
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
}
