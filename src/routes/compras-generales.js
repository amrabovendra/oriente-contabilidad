const express = require('express');
const { z } = require('zod');
const prisma = require('../db');

const router = express.Router();

const CATEGORIAS = ['MEDICO_INSUMOS', 'MANTENIMIENTO', 'NO_OPERATIVO'];

const CompraSchema = z.object({
  fecha: z.string(),
  categoria: z.enum(CATEGORIAS),
  descripcion: z.string().min(1),
  monto: z.number().positive(),
});

router.get('/', async (req, res) => {
  const compras = await prisma.compraGeneral.findMany({
    orderBy: { fecha: 'desc' },
    include: { registradoPor: { select: { nombre: true } } },
  });
  res.json(compras);
});

router.post('/', async (req, res) => {
  const parsed = CompraSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const c = await prisma.compraGeneral.create({
    data: {
      fecha: new Date(parsed.data.fecha),
      categoria: parsed.data.categoria,
      descripcion: parsed.data.descripcion,
      monto: parsed.data.monto,
      registradoPorId: req.session.usuarioId,
    },
  });
  res.status(201).json(c);
});

router.patch('/:id', async (req, res) => {
  const parsed = CompraSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const data = { ...parsed.data };
  if (data.fecha) data.fecha = new Date(data.fecha);
  const c = await prisma.compraGeneral.update({ where: { id: req.params.id }, data });
  res.json(c);
});

router.delete('/:id', async (req, res) => {
  await prisma.compraGeneral.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
