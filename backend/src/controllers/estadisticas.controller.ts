import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** ================================
 *  Obtener TODAS las estadísticas
 *  ================================ */
export const obtenerEstadisticas = async (_req: Request, res: Response) => {
  try {
    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      include: {
        turno: {
          include: { servicio: true, empleado: true, cliente: true },
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

/** ==========================================
 *  Crear estadística manual (opcional / tests)
 *  ========================================== */
export const crearEstadistica = async (req: Request, res: Response) => {
  try {
    const { ingresoServicio, ingresoProductos, total, turnoId, empleadoId, especialidad } = req.body;

    if (total === undefined) {
      return res.status(400).json({ message: 'Falta "total".' });
    }

    if (turnoId) {
      const existente = await prisma.estadisticaTesoreria.findFirst({ where: { turnoId } });
      if (existente) return res.status(400).json({ message: 'Ya existe una estadística para este turno.' });
    }

    const nueva = await prisma.estadisticaTesoreria.create({
      data: {
        ingresoServicio: ingresoServicio ?? 0,
        ingresoProductos: ingresoProductos ?? 0,
        total,
        turnoId: turnoId ?? null,
        empleadoId: empleadoId ?? null,
        especialidad: especialidad ?? null,
      },
    });

    res.status(201).json(nueva);
  } catch (error) {
    console.error('Error al crear estadística:', error);
    res.status(500).json({ message: 'Error al crear estadística' });
  }
};

/** ================================
 *  Resumen REAL de tesorería
 *  ================================ */
export const obtenerResumenTesoreria = async (_req: Request, res: Response) => {
  try {
    const estadisticas = await prisma.estadisticaTesoreria.findMany();

    // total > 0 => ingreso (turnos, venta de productos)
    // total < 0 => egreso (compras de stock)
    const ingresosTotales = estadisticas
      .filter(e => e.total > 0)
      .reduce((acc, e) => acc + e.total, 0);

    const egresosTotales = estadisticas
      .filter(e => e.total < 0)
      .reduce((acc, e) => acc + Math.abs(e.total), 0);

    const gananciaNeta = ingresosTotales - egresosTotales;

    const [totalTurnos, completados, cancelaciones] = await Promise.all([
      prisma.turno.count(),
      prisma.turno.count({ where: { estado: 'completado' } }),
      prisma.turno.count({ where: { estado: 'cancelado' } }),
    ]);

    res.status(200).json({
      ingresosTotales,
      egresosTotales,
      gananciaNeta,
      completados,
      cancelaciones,
      totalTurnos,
    });
  } catch (error) {
    console.error('Error al obtener resumen de tesorería:', error);
    res.status(500).json({ message: 'Error al obtener el resumen de tesorería' });
  }
};

/** ======================================
 *  Detalle (ingresos/egresos para gráficas)
 *  ====================================== */
export const obtenerDetalleTesoreria = async (_req: Request, res: Response) => {
  try {
    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      include: {
        turno: { include: { empleado: true, servicio: true } },
      },
      orderBy: { id: 'asc' },
    });

    // 🔑 Usamos la fecha REAL del registro (si no tiene turno, viene de la propia estadística)
    const ingresosPorDiaMap: Record<string, { dia: string; ingresos: number; egresos: number }> = {};
    for (const e of estadisticas) {
      const fechaBase = e.turno?.fechaHora ?? e.fecha; // 👈 importante: si no hay turno, usar e.fecha
      const f = new Date(fechaBase);
      const dia = f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

      if (!ingresosPorDiaMap[dia]) ingresosPorDiaMap[dia] = { dia, ingresos: 0, egresos: 0 };
      if (e.total > 0) ingresosPorDiaMap[dia].ingresos += e.total;
      else ingresosPorDiaMap[dia].egresos += Math.abs(e.total);
    }
    const ingresosPorDia = Object.values(ingresosPorDiaMap);

    // Ingresos por empleado (solo ingresos)
    const ingresosPorEmpleadoMap: Record<string, number> = {};
    for (const e of estadisticas) {
      if (e.total > 0 && e.turno?.empleado?.nombre) {
        const nombre = e.turno.empleado.nombre;
        ingresosPorEmpleadoMap[nombre] = (ingresosPorEmpleadoMap[nombre] || 0) + e.total;
      }
    }
    const ingresosPorEmpleado = Object.entries(ingresosPorEmpleadoMap).map(([nombre, total]) => ({ nombre, total }));

    // Ingresos por especialidad (solo ingresos)
    const ingresosPorEspecialidadMap: Record<string, number> = {};
    for (const e of estadisticas) {
      if (e.total > 0 && e.especialidad) {
        ingresosPorEspecialidadMap[e.especialidad] =
          (ingresosPorEspecialidadMap[e.especialidad] || 0) + e.total;
      }
    }
    const ingresosPorEspecialidad = Object.entries(ingresosPorEspecialidadMap).map(([nombre, total]) => ({ nombre, total }));

    res.status(200).json({
      estadisticas,           // lista cruda (por si el front la necesita)
      ingresosPorDia,         // { dia, ingresos, egresos }
      ingresosPorEmpleado,    // { nombre, total }
      ingresosPorEspecialidad // { nombre, total }
    });
  } catch (error) {
    console.error('Error al obtener detalle de tesorería:', error);
    res.status(500).json({ message: 'Error al obtener el detalle de tesorería' });
  }
};
