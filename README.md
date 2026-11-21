# Oriente - Contabilidad

Libro contable de Finca Oriente: gastos, créditos, compras generales, transporte
y compra/venta de ganado. Proyecto totalmente aparte del "Sistema Ganadero
Finca Oriente" (otra base de datos, no comparte nada).

## Roles

- **ADMIN** (Ana): ve y registra todo, incluyendo compra y venta de ganado.
- **AYUDANTE**: ve y registra Gastos, Créditos, Compras generales y Transporte.
  No puede ver ni entrar a Compra de ganado ni Venta de ganado (el servidor
  bloquea esas rutas para este rol, no es solo que estén ocultas en pantalla).

## Primeros pasos (desarrollo local)

1. `npm install`
2. Copiar `.env.example` a `.env` y llenar `DATABASE_URL` (una base de datos
   Postgres, por ejemplo de Neon) y `SESSION_SECRET` (cualquier texto largo).
3. `npx prisma migrate dev --name inicial` (crea las tablas).
4. `node scripts/crear-usuario.js` (crea el primer usuario ADMIN - la clave se
   escribe en la terminal, oculta, y no queda guardada en ningún archivo).
5. `npm start` y abrir `http://localhost:3000`.

## Desplegar en Render (como ganado-app)

1. Subir este proyecto a un repositorio de GitHub.
2. Crear una base de datos Postgres (Neon o Render Postgres) y copiar su
   `DATABASE_URL`.
3. Crear un "Web Service" en Render apuntando a ese repositorio:
   - Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start command: `npm start`
   - Variables de entorno: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`
4. Una vez desplegado, correr `node scripts/crear-usuario.js` (puede hacerse
   localmente apuntando `DATABASE_URL` a la base de datos de producción) para
   crear el primer usuario ADMIN, y desde la app (pestaña "Usuarios") crear el
   usuario del ayudante.

## Instalar como app (PWA)

Entrar al link una vez desde el celular o la computadora y usar la opción
"Agregar a pantalla de inicio" / "Instalar app" del navegador. Queda con el
logo de Finca Oriente, sin barra de navegador, como cualquier otra app.
