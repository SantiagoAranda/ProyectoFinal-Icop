import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

/**
 * Endpoint: GET /api/empleados
 * Devuelve los empleados con su eficiencia laboral estimada.
 * 
 * Eficiencia = (horas ocupadas en turnos confirmados / horas laborales semanales) * 100
 */
router.get('/', async (_req, res) => {
  try {
    // Obtener empleados y sus turnos (solo los últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const empleados = await prisma.user.findMany({
      where: { role: 'EMPLEADO' },
      include: {
        turnosEmpleado: {
          where: {
            fechaHora: {
              gte: sevenDaysAgo, // turnos desde los últimos 7 días
            },
            estado: {
              in: ['reservado', 'completado'], // evitar cancelados o disponibles
            },
          },
          include: {
            servicio: true,
          },
        },
      },
    });

    // Horas laborales totales (10 horas × 5 días = 50h/semana)
    const horasLaboralesTotales = 10 * 5;

    // Calcular eficiencia de cada empleado
    const empleadosConEficiencia = empleados.map((emp) => {
      const horasOcupadas = emp.turnosEmpleado.reduce((sum, turno) => {
        return sum + (turno.servicio?.duracion ?? 0);
      }, 0);

      const eficienciaRaw = (horasOcupadas / horasLaboralesTotales) * 100;
      const eficiencia = Math.min(Math.round(eficienciaRaw), 100); // máx. 100%

      return {
        id: emp.id,
        nombre: emp.nombre,
        email: emp.email,
        especialidad: emp.especialidad,
        eficiencia,
      };
    });

    res.json(empleadosConEficiencia);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ message: 'Error al obtener empleados' });
  }
});

export default router;
