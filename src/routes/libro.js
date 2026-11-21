// Libro contable: junta TODOS los movimientos de los demás módulos en un solo
// listado ordenado por fecha, con el saldo que va quedando después de cada
// uno. Si quien pregunta es el AYUDANTE, se le quita todo lo de compra/venta
// de ganado (ni los movimientos ni su monto entran a su saldo) - su "saldo"
// es solo el de lo que él puede ver, no el saldo real de toda la finca.
const express = require('express');
const prisma = require('../db');

const router = express.Router();

const ETIQUETAS_COMPRA_GENERAL = {
  MEDICO_INSUMOS: 'Médico / Insumos',
  MANTENIMIENTO: 'Mantenimiento finca',
  NO_OPERATIVO: 'Gasto no operativo',
};

async function obtenerMovimientos({ desde, hasta, esAdmin }) {
  const rangoFecha = {};
  if (desde) rangoFecha.gte = desde;
  if (hasta) rangoFecha.lte = hasta;
  const whereFecha = (desde || hasta) ? { fecha: rangoFecha } : {};

  const [gastos, creditos, pagosCredito, comprasGenerales, transportes, comprasGanado, ventasGanado] =
    await Promise.all([
      prisma.gasto.findMany({ where: whereFecha, include: { registradoPor: { select: { nombre: true } } } }),
      prisma.credito.findMany({ where: whereFecha, include: { registradoPor: { select: { nombre: true } } } }),
      prisma.pagoCredito.findMany({ where: { fecha: whereFecha.fecha }, include: { registradoPor: { select: { nombre: true } }, credito: true } }),
      prisma.compraGeneral.findMany({ where: whereFecha, include: { registradoPor: { select: { nombre: true } } } }),
      prisma.transporte.findMany({ where: whereFecha, include: { registradoPor: { select: { nombre: true } } } }),
      esAdmin ? prisma.compraGanado.findMany({ where: whereFecha, include: { registradoPor: { select: { nombre: true } } } }) : [],
      esAdmin ? prisma.ventaGanado.findMany({ where: whereFecha, include: { registradoPor: { select: { nombre: true } } } }) : [],
    ]);

  const movimientos = [];

  for (const g of gastos) {
    movimientos.push({
      fecha: g.fecha, tipo: 'EGRESO', categoria: 'Gasto',
      descripcion: g.descripcion, monto: Number(g.monto),
      registradoPor: g.registradoPor.nombre, origen: 'gasto', origenId: g.id,
    });
  }
  for (const c of creditos) {
    movimientos.push({
      fecha: c.fecha, tipo: 'INGRESO', categoria: 'Crédito recibido',
      descripcion: `${c.acreedor} (factura ${c.numeroFactura})`, monto: Number(c.montoOriginal),
      registradoPor: c.registradoPor.nombre, origen: 'credito', origenId: c.id,
    });
  }
  for (const p of pagosCredito) {
    movimientos.push({
      fecha: p.fecha, tipo: 'EGRESO', categoria: 'Abono a crédito',
      descripcion: `${p.credito.acreedor} (factura ${p.credito.numeroFactura})`, monto: Number(p.monto),
      registradoPor: p.registradoPor.nombre, origen: 'pago_credito', origenId: p.id,
    });
  }
  for (const c of comprasGenerales) {
    movimientos.push({
      fecha: c.fecha, tipo: 'EGRESO', categoria: ETIQUETAS_COMPRA_GENERAL[c.categoria] || c.categoria,
      descripcion: c.descripcion, monto: Number(c.monto),
      registradoPor: c.registradoPor.nombre, origen: 'compra_general', origenId: c.id,
    });
  }
  for (const t of transportes) {
    const detalle = [t.origen, t.destino].filter(Boolean).join(' → ');
    movimientos.push({
      fecha: t.fecha, tipo: 'EGRESO', categoria: 'Transporte',
      descripcion: [t.queSeTransporto, detalle].filter(Boolean).join(' - ') || 'Transporte',
      monto: Number(t.costo),
      registradoPor: t.registradoPor.nombre, origen: 'transporte', origenId: t.id,
    });
  }
  for (const c of comprasGanado) {
    movimientos.push({
      fecha: c.fecha, tipo: 'EGRESO', categoria: 'Compra de ganado',
      descripcion: [c.arete, c.proveedor].filter(Boolean).join(' - ') || c.descripcion || 'Compra de ganado',
      monto: Number(c.monto),
      registradoPor: c.registradoPor.nombre, origen: 'compra_ganado', origenId: c.id,
    });
  }
  for (const v of ventasGanado) {
    movimientos.push({
      fecha: v.fecha, tipo: 'INGRESO', categoria: 'Venta de ganado',
      descripcion: [v.arete, v.comprador].filter(Boolean).join(' - ') || v.descripcion || 'Venta de ganado',
      monto: Number(v.monto),
      registradoPor: v.registradoPor.nombre, origen: 'venta_ganado', origenId: v.id,
    });
  }

  movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let saldo = 0;
  for (const m of movimientos) {
    saldo += m.tipo === 'INGRESO' ? m.monto : -m.monto;
    m.saldoDespues = Math.round(saldo * 100) / 100;
  }

  return movimientos;
}

function resumenDe(movimientos) {
  const totalesPorCategoria = {};
  let totalIngresos = 0;
  let totalEgresos = 0;
  for (const m of movimientos) {
    totalesPorCategoria[m.categoria] = (totalesPorCategoria[m.categoria] || 0) + (m.tipo === 'INGRESO' ? m.monto : -m.monto);
    if (m.tipo === 'INGRESO') totalIngresos += m.monto;
    else totalEgresos += m.monto;
  }
  return {
    totalIngresos: Math.round(totalIngresos * 100) / 100,
    totalEgresos: Math.round(totalEgresos * 100) / 100,
    saldoNeto: Math.round((totalIngresos - totalEgresos) * 100) / 100,
    totalesPorCategoria,
  };
}

// GET /libro?desde=&hasta=  -> movimientos + saldo corriente (para la vista
// del libro contable en pantalla, filtrable por fecha).
router.get('/', async (req, res) => {
  const esAdmin = req.session.rol === 'ADMIN';
  const { desde, hasta } = req.query;
  const movimientos = await obtenerMovimientos({
    desde: desde ? new Date(String(desde)) : undefined,
    hasta: hasta ? new Date(String(hasta)) : undefined,
    esAdmin,
  });
  res.json({
    movimientos,
    resumen: resumenDe(movimientos),
    alcance: esAdmin ? 'completo' : 'sin compra/venta de ganado',
  });
});

// GET /libro/desprendible?anio=2026&mes=11 (mes es opcional: sin mes, es el
// desprendible del año completo) -> resumen + detalle completo del período.
router.get('/desprendible', async (req, res) => {
  const esAdmin = req.session.rol === 'ADMIN';
  const anio = Number(req.query.anio);
  const mes = req.query.mes ? Number(req.query.mes) : null;
  if (!anio) return res.status(400).json({ error: 'Falta el año.' });

  const desde = mes ? new Date(Date.UTC(anio, mes - 1, 1)) : new Date(Date.UTC(anio, 0, 1));
  const hasta = mes ? new Date(Date.UTC(anio, mes, 1)) : new Date(Date.UTC(anio + 1, 0, 1));

  const movimientos = await obtenerMovimientos({ desde, hasta, esAdmin });
  res.json({
    periodo: mes ? `${String(mes).padStart(2, '0')}/${anio}` : `Año ${anio}`,
    movimientos,
    resumen: resumenDe(movimientos),
    alcance: esAdmin ? 'completo' : 'sin compra/venta de ganado',
  });
});

module.exports = router;
