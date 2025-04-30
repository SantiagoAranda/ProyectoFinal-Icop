import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
      data: empleado,
    });
  }
}

main()
  .then(async () => {
    console.log('Se crearon los empleados exitosamente.');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
