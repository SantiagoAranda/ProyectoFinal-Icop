import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===============================
// Obtener todas las estadísticas
// ===============================
export const obtenerEstadisticas = async (_req: Request, res: Response) => {
  try {
    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      include: {
        turno: {
          include: {
            servicio: true,
            empleado: true,
            cliente: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    res.status(200).json(estadisticas);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener las estadísticas' });
  }
};

// ===============================
// Crear nueva estadística (manual o prueba)
// ===============================
export const crearEstadistica = async (req: Request, res: Response) => {
  try {
    const { ingreso, egreso, total, turnoId, empleadoId } = req.body;

    // Validación básica
    if (!ingreso || !egreso || !total || !turnoId) {
      return res.status(400).json({ message: 'Faltan datos obligatorios.' });
    }

    // Evitar duplicados (único por turno)
    const existente = await prisma.estadisticaTesoreria.findFirst({
      where: { turnoId },
    });
    if (existente) {
      return res.status(400).json({ message: 'Ya existe una estadística para este turno.' });
    }

    const nueva = await prisma.estadisticaTesoreria.create({
      data: {
        ingreso,
        egreso,
        total,
        turnoId,
        empleadoId: empleadoId ?? null, // opcional si no se envía
      },
    });

    res.status(201).json(nueva);
  } catch (error) {
    console.error('Error al crear estadística:', error);
    res.status(500).json({ message: 'Error al crear estadística' });
  }
};

// ===============================
// Resumen global de tesorería
// ===============================
export const obtenerResumenTesoreria = async (_req: Request, res: Response) => {
  try {
    // Totales globales
    const [ingresosTotales, egresosTotales, cantidadTurnos, completados, cancelaciones] =
      await Promise.all([
        prisma.estadisticaTesoreria.aggregate({ _sum: { ingreso: true } }),
        prisma.estadisticaTesoreria.aggregate({ _sum: { egreso: true } }),
        prisma.turno.count(),
        prisma.turno.count({ where: { estado: 'completado' } }),
        prisma.turno.count({ where: { estado: 'cancelado' } }),
      ]);

    const resumen = {
      ingresosTotales: ingresosTotales._sum.ingreso ?? 0,
      egresosTotales: egresosTotales._sum.egreso ?? 0,
      gananciaNeta:
        (ingresosTotales._sum.ingreso ?? 0) - (egresosTotales._sum.egreso ?? 0),
      completados,
      cancelaciones,
      totalTurnos: cantidadTurnos,
    };

    res.status(200).json(resumen);
  } catch (error) {
    console.error('Error al obtener resumen de tesorería:', error);
    res.status(500).json({ message: 'Error al obtener el resumen de tesorería' });
  }
};
