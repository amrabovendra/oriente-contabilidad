require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const { router: authRouter, requireLogin, requireAdmin } = require('./auth');
const gastosRouter = require('./routes/gastos');
const creditosRouter = require('./routes/creditos');
const comprasGeneralesRouter = require('./routes/compras-generales');
const transporteRouter = require('./routes/transporte');
const compraGanadoRouter = require('./routes/compra-ganado');
const ventaGanadoRouter = require('./routes/venta-ganado');
const libroRouter = require('./routes/libro');
const usuariosRouter = require('./routes/usuarios');

const app = express();
app.use(express.json());

app.set('trust proxy', 1); // Render está detrás de un proxy - necesario para cookies seguras

app.use(
  session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'sesiones',
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 días
    },
  })
);

// Rutas de login/logout (sin requerir sesión previa, obviamente)
app.use('/auth', authRouter);

// A partir de aquí, todo exige sesión iniciada
app.use('/gastos', requireLogin, gastosRouter);
app.use('/creditos', requireLogin, creditosRouter);
app.use('/compras-generales', requireLogin, comprasGeneralesRouter);
app.use('/transporte', requireLogin, transporteRouter);
app.use('/libro', requireLogin, libroRouter);

// Estas dos SOLO para el rol ADMIN
app.use('/compra-ganado', requireLogin, requireAdmin, compraGanadoRouter);
app.use('/venta-ganado', requireLogin, requireAdmin, ventaGanadoRouter);

// Gestión de usuarios: solo admin
app.use('/usuarios', requireLogin, requireAdmin, usuariosRouter);

// Frontend (PWA) servido como archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Oriente-Contabilidad escuchando en el puerto ${PORT}`);
});
