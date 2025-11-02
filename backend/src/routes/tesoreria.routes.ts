import { Router } from "express";
import { prisma } from "../prisma"; 

const router = Router();
const EGRESOS_FIJOS = 560000;

/* ===========================================
   🔹 1️⃣ Resumen general de Tesorería
   =========================================== */
router.get("/resumen", async (_req, res) => {
  try {
    const estadisticas = await prisma.estadisticaTesoreria.findMany();

    const ingresosTotales = estadisticas.reduce(
      (acc, e) => acc + (e.total ?? 0),
      0
    );

    const egresosTotales = EGRESOS_FIJOS;
    const gananciaNeta = ingresosTotales - egresosTotales;

    const turnos = await prisma.turno.findMany({
      select: { estado: true },
    });

    const completados = turnos.filter((t) => t.estado === "completado").length;
    const cancelaciones = turnos.filter((t) => t.estado === "cancelado").length;

    res.json({
      ingresosTotales,
      egresosTotales,
      gananciaNeta,
      completados,
      cancelaciones,
      totalTurnos: turnos.length,
    });
  } catch (error) {
    console.error("Error en /api/tesoreria/resumen:", error);
    res.status(500).json({
      message: "Error obteniendo resumen de tesorería",
      error: (error as any).message,
    });
  }
});

/* ===========================================
   🔹 2️⃣ Detalle: ingresos por día, empleado y servicio
   =========================================== */
router.get("/detalle", async (_req, res) => {
  try {
    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      include: {
        empleado: { select: { nombre: true } },
        turno: {
          include: {
            servicio: { select: { nombre: true, precio: true } },
          },
        },
      },
    });

    // === Por día ===
    const ingresosPorDia: Record<string, { dia: string; ingresos: number; egresos: number }> = {};
    estadisticas.forEach((e) => {
      const fecha = new Date(e.fecha);
      const dia = fecha.toLocaleDateString("es-AR", { weekday: "short" });
      if (!ingresosPorDia[dia]) ingresosPorDia[dia] = { dia, ingresos: 0, egresos: 0 };
      ingresosPorDia[dia].ingresos += e.total ?? 0;
    });

    // === Por empleado ===
    const ingresosPorEmpleado: Record<string, { nombre: string; total: number }> = {};
    estadisticas.forEach((e) => {
      const nombre = e.empleado?.nombre || "Sin asignar";
      if (!ingresosPorEmpleado[nombre]) ingresosPorEmpleado[nombre] = { nombre, total: 0 };
      ingresosPorEmpleado[nombre].total += e.total ?? 0;
    });

    // === Por servicio ===
    const ingresosPorServicio: Record<string, { nombre: string; total: number }> = {};
    estadisticas.forEach((e) => {
      const nombre = e.turno?.servicio?.nombre || "Sin servicio";
      if (!ingresosPorServicio[nombre]) ingresosPorServicio[nombre] = { nombre, total: 0 };
      ingresosPorServicio[nombre].total += e.ingresoServicio ?? 0;
    });

    res.json({
      ingresosPorDia: Object.values(ingresosPorDia),
      ingresosPorEmpleado: Object.values(ingresosPorEmpleado),
      ingresosPorServicio: Object.values(ingresosPorServicio),
    });
  } catch (error) {
    console.error("Error en /api/tesoreria/detalle:", error);
    res.status(500).json({
      message: "Error obteniendo detalle de tesorería",
      error: (error as any).message,
    });
  }
});

export default router;
