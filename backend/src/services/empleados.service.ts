import { prisma } from '../prisma';

export const obtenerEmpleados = async () => {
  return await prisma.user.findMany({
    where: {
      role: 'EMPLEADO',
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      especialidad: true,
    },
  });
};
