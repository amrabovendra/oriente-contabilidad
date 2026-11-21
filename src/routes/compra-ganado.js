const express = require('express');
const { z } = require('zod');
const prisma = require('../db');

const router = express.Router();

const Schema = z.object({
  fecha: z.string(),
  arete: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  proveedor: z.string().optional().nullable(),
  monto: z.number().positive(),
});

router.get('/', async (req, res) => {
  const items = await prisma.compraGanado.findMany({
    orderBy: { fecha: 'desc' },
    include: { registradoPor: { select: { nombre: true } } },
  });
  res.json(items);
});

router.post('/', async (req, res) => {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const c = await prisma.compraGanado.create({
    data: {
      fecha: new Date(parsed.data.fecha),
      arete: parsed.data.arete || null,
      descripcion: parsed.data.descripcion || null,
      proveedor: parsed.data.proveedor || null,
      monto: parsed.data.monto,
      registradoPorId: req.session.usuarioId,
    },
  });
  res.status(201).json(c);
});

router.patch('/:id', async (req, res) => {
  const parsed = Schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const data = { ...parsed.data };
  if (data.fecha) data.fecha = new Date(data.fecha);
  const c = await prisma.compraGanado.update({ where: { id: req.params.id }, data });
  res.json(c);
});

router.delete('/:id', async (req, res) => {
  await prisma.compraGanado.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
