const express = require('express');
const { z } = require('zod');
const prisma = require('../db');

const router = express.Router();

const GastoSchema = z.object({
  fecha: z.string(),
  descripcion: z.string().min(1),
  monto: z.number().positive(),
});

router.get('/', async (req, res) => {
  const gastos = await prisma.gasto.findMany({
    orderBy: { fecha: 'desc' },
    include: { registradoPor: { select: { nombre: true } } },
  });
  res.json(gastos);
});

router.post('/', async (req, res) => {
  const parsed = GastoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const g = await prisma.gasto.create({
    data: {
      fecha: new Date(parsed.data.fecha),
      descripcion: parsed.data.descripcion,
      monto: parsed.data.monto,
      registradoPorId: req.session.usuarioId,
    },
  });
  res.status(201).json(g);
});

router.patch('/:id', async (req, res) => {
  const parsed = GastoSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const data = { ...parsed.data };
  if (data.fecha) data.fecha = new Date(data.fecha);
  const g = await prisma.gasto.update({ where: { id: req.params.id }, data });
  res.json(g);
});

router.delete('/:id', async (req, res) => {
  await prisma.gasto.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
