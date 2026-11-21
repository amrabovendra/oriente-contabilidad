const express = require('express');
const { z } = require('zod');
const prisma = require('../db');

const router = express.Router();

const TransporteSchema = z.object({
  fecha: z.string(),
  origen: z.string().optional().nullable(),
  destino: z.string().optional().nullable(),
  queSeTransporto: z.string().optional().nullable(),
  transportador: z.string().optional().nullable(),
  costo: z.number().positive(),
});

router.get('/', async (req, res) => {
  const items = await prisma.transporte.findMany({
    orderBy: { fecha: 'desc' },
    include: { registradoPor: { select: { nombre: true } } },
  });
  res.json(items);
});

router.post('/', async (req, res) => {
  const parsed = TransporteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const t = await prisma.transporte.create({
    data: {
      fecha: new Date(parsed.data.fecha),
      origen: parsed.data.origen || null,
      destino: parsed.data.destino || null,
      queSeTransporto: parsed.data.queSeTransporto || null,
      transportador: parsed.data.transportador || null,
      costo: parsed.data.costo,
      registradoPorId: req.session.usuarioId,
    },
  });
  res.status(201).json(t);
});

router.patch('/:id', async (req, res) => {
  const parsed = TransporteSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const data = { ...parsed.data };
  if (data.fecha) data.fecha = new Date(data.fecha);
  const t = await prisma.transporte.update({ where: { id: req.params.id }, data });
  res.json(t);
});

router.delete('/:id', async (req, res) => {
  await prisma.transporte.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
