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
    const turnos = await prisma.turno.findMany({
      where: { estado: "completado" },
      include: {
        servicio: true,
        empleado: true,
        productos: { include: { producto: true } },
      },
    });

    // === Por día ===
    const ingresosPorDia: Record<string, { dia: string; ingresos: number; egresos: number }> = {};
    for (const t of turnos) {
      const fecha = new Date(t.fechaHora);
      const dia = fecha.toLocaleDateString("es-AR", { weekday: "short" });
      const ingresoServicio = t.servicio?.precio ?? 0;
      const ingresoProductos = t.productos.reduce(
        (s, p) => s + p.cantidad * (p.producto?.precio ?? 0),
        0
      );
      const total = ingresoServicio + ingresoProductos;
      if (!ingresosPorDia[dia]) ingresosPorDia[dia] = { dia, ingresos: 0, egresos: 0 };
      ingresosPorDia[dia].ingresos += total;
    }

    // === Por empleado ===
    const ingresosPorEmpleado: Record<string, { nombre: string; total: number }> = {};
    for (const t of turnos) {
      const nombre = t.empleado?.nombre ?? "Desconocido";
      const ingresoServicio = t.servicio?.precio ?? 0;
      const ingresoProductos = t.productos.reduce(
        (s, p) => s + p.cantidad * (p.producto?.precio ?? 0),
        0
      );
      const total = ingresoServicio + ingresoProductos;
      if (!ingresosPorEmpleado[nombre]) ingresosPorEmpleado[nombre] = { nombre, total: 0 };
      ingresosPorEmpleado[nombre].total += total;
    }

    // === Por especialidad ===
    const ingresosPorEspecialidad: Record<string, { nombre: string; total: number }> = {};
    for (const t of turnos) {
      const especialidad = t.servicio?.especialidad ?? "Sin especialidad";
      const ingresoServicio = t.servicio?.precio ?? 0;
      const ingresoProductos = t.productos.reduce(
        (s, p) => s + p.cantidad * (p.producto?.precio ?? 0),
        0
      );
      const total = ingresoServicio + ingresoProductos;
      if (!ingresosPorEspecialidad[especialidad]) {
        ingresosPorEspecialidad[especialidad] = { nombre: especialidad, total: 0 };
      }
      ingresosPorEspecialidad[especialidad].total += total;
    }

    // === Enviar respuesta ===
    res.json({
      ingresosPorDia: Object.values(ingresosPorDia),
      ingresosPorEmpleado: Object.values(ingresosPorEmpleado),
      ingresosPorEspecialidad: Object.values(ingresosPorEspecialidad),
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
