const bcrypt = require('bcryptjs');
const prisma = require('./db');

const ROLES = { ADMIN: 'ADMIN', AYUDANTE: 'AYUDANTE' };

async function hashearClave(clave) {
  return bcrypt.hash(clave, 10);
}

async function verificarClave(clave, hash) {
  return bcrypt.compare(clave, hash);
}

// Middleware: exige que haya una sesion iniciada. Si no, responde 401.
function requireLogin(req, res, next) {
  if (!req.session || !req.session.usuarioId) {
    return res.status(401).json({ error: 'No has iniciado sesión.' });
  }
  next();
}

// Middleware: exige que el usuario en sesion tenga rol ADMIN. Se usa en las
// rutas de compra/venta de ganado para que el ayudante nunca pueda entrar,
// ni siquiera escribiendo la direccion a mano.
function requireAdmin(req, res, next) {
  if (!req.session || req.session.rol !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'No tienes permiso para ver esto.' });
  }
  next();
}

// Rutas de login/logout/quien-soy. Se montan en /auth
const express = require('express');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { usuario, clave } = req.body || {};
  if (!usuario || !clave) {
    return res.status(400).json({ error: 'Falta usuario o clave.' });
  }
  const persona = await prisma.usuario.findUnique({ where: { usuario: String(usuario) } });
  if (!persona || !persona.activo) {
    return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
  }
  const ok = await verificarClave(String(clave), persona.claveHash);
  if (!ok) {
    return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
  }
  req.session.usuarioId = persona.id;
  req.session.nombre = persona.nombre;
  req.session.rol = persona.rol;
  res.json({ nombre: persona.nombre, rol: persona.rol });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/quien-soy', (req, res) => {
  if (!req.session || !req.session.usuarioId) {
    return res.status(401).json({ error: 'No has iniciado sesión.' });
  }
  res.json({ nombre: req.session.nombre, rol: req.session.rol });
});

module.exports = { router, requireLogin, requireAdmin, hashearClave, verificarClave, ROLES };
