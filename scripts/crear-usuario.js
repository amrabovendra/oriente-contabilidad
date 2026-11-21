// Crea (o actualiza la clave de) un usuario directamente en la base de datos.
// Se usa para crear el PRIMER usuario admin (y luego, si hace falta, el del
// ayudante) sin pasar por la pantalla de login todavía. La clave se escribe
// aquí mismo en la terminal, con el texto oculto - nunca se la cuento a nadie
// y no queda guardada en ningún archivo.
//
// USO:
//   node scripts/crear-usuario.js

require('dotenv').config();
const readline = require('readline');
const prisma = require('../src/db');
const { hashearClave } = require('../src/auth');

function preguntar(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(texto, (resp) => { rl.close(); resolve(resp.trim()); }));
}

// Pregunta ocultando lo que se escribe (para la clave).
function preguntarOculto(texto) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;
    process.stdout.write(texto);
    let clave = '';
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    const onData = (char) => {
      char = char.toString('utf8');
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(clave);
      } else if (char === '\u0003') {
        process.exit(1);
      } else if (char === '\u007f') {
        clave = clave.slice(0, -1);
      } else {
        clave += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('--- Crear usuario para Oriente-Contabilidad ---\n');
  const nombre = await preguntar('Nombre completo: ');
  const usuario = await preguntar('Usuario (para entrar a la app, sin espacios): ');
  const clave = await preguntarOculto('Clave (no se va a ver mientras escribes): ');
  const rol = (await preguntar('Rol (ADMIN o AYUDANTE): ')).toUpperCase();

  if (!['ADMIN', 'AYUDANTE'].includes(rol)) {
    console.error('El rol debe ser exactamente ADMIN o AYUDANTE.');
    process.exit(1);
  }
  if (clave.length < 6) {
    console.error('La clave debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  const claveHash = await hashearClave(clave);
  const existente = await prisma.usuario.findUnique({ where: { usuario } });

  if (existente) {
    await prisma.usuario.update({ where: { usuario }, data: { claveHash, nombre, rol, activo: true } });
    console.log(`\n✅ Se actualizó el usuario "${usuario}" (${nombre}, rol ${rol}).`);
  } else {
    await prisma.usuario.create({ data: { nombre, usuario, claveHash, rol } });
    console.log(`\n✅ Se creó el usuario "${usuario}" (${nombre}, rol ${rol}).`);
  }
}

main()
  .catch((e) => { console.error('Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
