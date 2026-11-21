// Venta de leche: SOLO el rubro total (semanal o mensual), no el detalle por
// día ni por animal - eso se sigue llevando aparte en el "Sistema Ganadero
// Finca Oriente". Esto es nada más para que el ingreso de leche entre al
// libro contable y al saldo general de la finca. Solo lo ve el ADMIN.
const express = require('express');
const { z } = require('zod');
const prisma = require('../db');

const router = express.Router();

const Schema = z.object({
  fecha: z.string(),
  periodo: z.enum(['SEMANAL', 'MENSUAL']),
  monto: z.number().positive(),
  nota: z.string().optional().nullable(),
});

router.get('/', async (req, res) => {
  const items = await prisma.ventaLeche.findMany({
    orderBy: { fecha: 'desc' },
    include: { registradoPor: { select: { nombre: true } } },
  });
  res.json(items);
});

router.post('/', async (req, res) => {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const v = await prisma.ventaLeche.create({
    data: {
      fecha: new Date(parsed.data.fecha),
      periodo: parsed.data.periodo,
      monto: parsed.data.monto,
      nota: parsed.data.nota || null,
      registradoPorId: req.session.usuarioId,
    },
  });
  res.status(201).json(v);
});

router.patch('/:id', async (req, res) => {
  const parsed = Schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const data = { ...parsed.data };
  if (data.fecha) data.fecha = new Date(data.fecha);
  const v = await prisma.ventaLeche.update({ where: { id: req.params.id }, data });
  res.json(v);
});

router.delete('/:id', async (req, res) => {
  await prisma.ventaLeche.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
