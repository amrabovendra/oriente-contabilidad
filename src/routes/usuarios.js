// Administración de usuarios - SOLO el admin (Ana) puede crear o desactivar
// usuarios. Así ella misma crea el usuario del ayudante y le dice la clave
// en persona; esa clave nunca pasa por este chat ni por ningún otro lado.
const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { hashearClave, ROLES } = require('../auth');

const router = express.Router();

const UsuarioSchema = z.object({
  nombre: z.string().min(1),
  usuario: z.string().min(3),
  clave: z.string().min(6),
  rol: z.enum([ROLES.ADMIN, ROLES.AYUDANTE]),
});

router.get('/', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, usuario: true, rol: true, activo: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(usuarios);
});

router.post('/', async (req, res) => {
  const parsed = UsuarioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const existe = await prisma.usuario.findUnique({ where: { usuario: parsed.data.usuario } });
  if (existe) return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
  const claveHash = await hashearClave(parsed.data.clave);
  const u = await prisma.usuario.create({
    data: {
      nombre: parsed.data.nombre,
      usuario: parsed.data.usuario,
      claveHash,
      rol: parsed.data.rol,
    },
  });
  res.status(201).json({ id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol });
});

router.patch('/:id/clave', async (req, res) => {
  const parsed = z.object({ clave: z.string().min(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const claveHash = await hashearClave(parsed.data.clave);
  await prisma.usuario.update({ where: { id: req.params.id }, data: { claveHash } });
  res.json({ ok: true });
});

router.patch('/:id/activo', async (req, res) => {
  const parsed = z.object({ activo: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  await prisma.usuario.update({ where: { id: req.params.id }, data: { activo: parsed.data.activo } });
  res.json({ ok: true });
});

module.exports = router;
