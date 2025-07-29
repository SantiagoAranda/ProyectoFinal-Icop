import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Contraseñas encriptadas
  const contraseñaEmpleados = await bcrypt.hash('123456', 10);
  const contraseñaAdmin = await bcrypt.hash('admin', 10);
  const contraseñaTesorero = await bcrypt.hash('tesorero', 10);

  // Empleados
  const empleados = [
    { email: 'empleado1@hotmail.com', password: '123456', nombre: 'Valentina Ríos', especialidad: 'Peluquero', role: 'EMPLEADO' },
    { email: 'empleado2@hotmail.com', password: '123456', nombre: 'Camila Ortega', especialidad: 'Peluquero', role: 'EMPLEADO' },
    { email: 'empleado3@hotmail.com', password: '123456', nombre: 'Lucía Navarro', especialidad: 'Peluquero', role: 'EMPLEADO' },
    { email: 'empleado4@hotmail.com', password: '123456', nombre: 'Ana Martínez', especialidad: 'Uñas', role: 'EMPLEADO' },
    { email: 'empleado5@hotmail.com', password: '123456', nombre: 'Isabella Cortés', especialidad: 'Uñas', role: 'EMPLEADO' },
    { email: 'empleado6@hotmail.com', password: '123456', nombre: 'Laura Gómez', especialidad: 'Masajista', role: 'EMPLEADO' },
    { email: 'empleado7@hotmail.com', password: '123456', nombre: 'Sofía Mendoza', especialidad: 'Depiladora', role: 'EMPLEADO' },
    { email: 'empleado8@hotmail.com', password: '123456', nombre: 'Sofía López', especialidad: 'Masajista', role: 'EMPLEADO' },
    { email: 'empleado9@hotmail.com', password: '123456', nombre: 'Paula Aguirre', especialidad: 'Uñas', role: 'EMPLEADO' },
    { email: 'empleado10@hotmail.com', password: '123456', nombre: 'Valentina Ruiz', especialidad: 'Peluquero', role: 'EMPLEADO' },
  ];

  for (const empleado of empleados) {
    await prisma.user.create({
      data: {
        ...empleado,
        password: contraseñaEmpleados,
      },
    });
  }

  // Admin
  await prisma.user.create({
    data: {
      email: 'admin@admin.com',
      password: contraseñaAdmin,
      role: 'ADMIN',
      nombre: 'Administrador',
    },
  });

  // Tesorero
  await prisma.user.create({
    data: {
      email: 'tesorero@tesorero.com',
      password: contraseñaTesorero,
      role: 'TESORERO',
      nombre: 'Tesorero Oficial',
    },
  });
}

main()
  .then(async () => {
    console.log('Usuarios creados correctamente ✅');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error al crear usuarios ❌', e);
    await prisma.$disconnect();
    process.exit(1);
  });


  