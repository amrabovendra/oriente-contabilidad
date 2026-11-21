const express = require('express');
const { z } = require('zod');
const prisma = require('../db');

const router = express.Router();

const CreditoSchema = z.object({
  fecha: z.string(),
  numeroFactura: z.string().min(1),
  acreedor: z.string().min(1),
  montoOriginal: z.number().positive(),
  nota: z.string().optional().nullable(),
});

const PagoSchema = z.object({
  fecha: z.string(),
  monto: z.number().positive(),
});

function saldoDe(credito) {
  const pagado = credito.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  return Number(credito.montoOriginal) - pagado;
}

router.get('/', async (req, res) => {
  const creditos = await prisma.credito.findMany({
    orderBy: { fecha: 'desc' },
    include: {
      pagos: { orderBy: { fecha: 'asc' } },
      registradoPor: { select: { nombre: true } },
    },
  });
  const conSaldo = creditos.map((c) => ({ ...c, saldo: saldoDe(c) }));
  res.json(conSaldo);
});

router.post('/', async (req, res) => {
  const parsed = CreditoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const c = await prisma.credito.create({
    data: {
      fecha: new Date(parsed.data.fecha),
      numeroFactura: parsed.data.numeroFactura,
      acreedor: parsed.data.acreedor,
      montoOriginal: parsed.data.montoOriginal,
      nota: parsed.data.nota || null,
      registradoPorId: req.session.usuarioId,
    },
  });
  res.status(201).json(c);
});

// Abonar (pago parcial) a un credito. Si con este abono el saldo llega a 0
// (o menos, por si acaso), se marca "saldado" solo - eso es lo que el
// frontend usa para avisar que ya se puede hacer la relacion.
router.post('/:id/abonos', async (req, res) => {
  const parsed = PagoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const credito = await prisma.credito.findUnique({
    where: { id: req.params.id },
    include: { pagos: true },
  });
  if (!credito) return res.status(404).json({ error: 'Crédito no encontrado.' });

  const pago = await prisma.pagoCredito.create({
    data: {
      creditoId: credito.id,
      fecha: new Date(parsed.data.fecha),
      monto: parsed.data.monto,
      registradoPorId: req.session.usuarioId,
    },
  });

  const pagadoTotal = [...credito.pagos, pago].reduce((acc, p) => acc + Number(p.monto), 0);
  const saldoNuevo = Number(credito.montoOriginal) - pagadoTotal;
  const quedoSaldado = saldoNuevo <= 0 && !credito.saldado;

  if (quedoSaldado) {
    await prisma.credito.update({
      where: { id: credito.id },
      data: { saldado: true, fechaSaldado: new Date() },
    });
  }

  res.status(201).json({ pago, saldoNuevo, quedoSaldado });
});

router.delete('/:id', async (req, res) => {
  await prisma.pagoCredito.deleteMany({ where: { creditoId: req.params.id } });
  await prisma.credito.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
