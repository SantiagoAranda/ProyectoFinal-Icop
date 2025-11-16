import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const empleados = await prisma.user.findMany({
      where: { role: 'EMPLEADO' },
      select: {
        id: true,
        nombre: true,
        email: true,
        especialidad: true,
        activo: true,                      // ← ← ← AÑADIDO
        turnosEmpleado: {
          select: {
            servicio: {
              select: {
                duracion: true
              }
            }
          }
        }
      }
    });

    const horasLaboralesTotales = 10 * 5;

    const empleadosConOcupacion = empleados.map((emp) => {
      const horasOcupadas = emp.turnosEmpleado.reduce(
        (sum, turno) => sum + (turno.servicio?.duracion ?? 0),
        0
      );

      const ocupacion = Math.min(
        Math.round((horasOcupadas / horasLaboralesTotales) * 100),
        100
      );

      return {
        ...emp,
        eficiencia: ocupacion, // para mantener compatibilidad con frontend
      };
    });

    res.json(empleadosConOcupacion);

  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ message: 'Error al obtener empleados' });
  }
});

export default router;
