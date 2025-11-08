import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

/* ===========================================
 🔹 1️⃣ Resumen real de Tesorería
 =========================================== */
router.get("/resumen", async (_req, res) => {
  try {
    const estadisticas = await prisma.estadisticaTesoreria.findMany();

    // total > 0 => ingreso (turnos)
    // total < 0 => egreso (compras, gastos)
    const ingresosTotales = estadisticas
      .filter(e => e.total > 0)
      .reduce((acc, e) => acc + e.total, 0);

    const egresosTotales = estadisticas
      .filter(e => e.total < 0)
      .reduce((acc, e) => acc + Math.abs(e.total), 0);

    const gananciaNeta = ingresosTotales - egresosTotales;

    const turnos = await prisma.turno.findMany({ select: { estado: true } });
    const completados = turnos.filter(t => t.estado === "completado").length;
    const cancelaciones = turnos.filter(t => t.estado === "cancelado").length;

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
 🔹 2️⃣ Detalle: ingresos y egresos por día, empleado y especialidad
 =========================================== */
router.get("/detalle", async (_req, res) => {
  try {
    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      include: {
        turno: {
          include: { servicio: true, empleado: true, productos: { include: { producto: true } } },
        },
      },
    });

    // Utilidades
    const DAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
    const startOfWeek = (d: Date) => {
      const x = new Date(d);
      const day = (x.getDay() + 6) % 7; // Lunes=0
      x.setHours(0, 0, 0, 0);
      x.setDate(x.getDate() - day);
      return x;
    };
    const labelDay = (d: Date) =>
      d.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "").toLowerCase();

    // 1) Construimos el rango de esta semana (lun..dom)
    const hoy = new Date();
    const monday = startOfWeek(hoy);
    const weekDates: Date[] = Array.from({ length: 5 }, (_, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return dt;
    });

    // 2) Sumamos ingresos/egresos por día (usando turno.fechaHora si existe, sino estadística.fecha)
    const ingresosPorDiaMap: Record<string, { dia: string; ingresos: number; egresos: number }> = {};
    for (const e of estadisticas) {
      const baseDate = new Date(e.turno?.fechaHora ?? e.fecha);
      const key = labelDay(baseDate); // 'lun', 'mar', etc.

      if (!ingresosPorDiaMap[key]) ingresosPorDiaMap[key] = { dia: key, ingresos: 0, egresos: 0 };
      if (e.total > 0) ingresosPorDiaMap[key].ingresos += e.total;
      else ingresosPorDiaMap[key].egresos += Math.abs(e.total);
    }

    // 3) Rellenamos con 0 para todos los días de la semana (en orden lun..dom)
    const ingresosPorDia = weekDates.map((d) => {
      const key = labelDay(d);
      const agg = ingresosPorDiaMap[key];
      return {
        dia: key,
        ingresos: agg?.ingresos ?? 0,
        egresos: agg?.egresos ?? 0,
      };
    });

    // 4) Ingresos por empleado (solo ingresos)
    const ingresosPorEmpleadoMap: Record<string, { nombre: string; total: number }> = {};
    for (const e of estadisticas) {
      if (e.total > 0 && e.turno?.empleado?.nombre) {
        const nombre = e.turno.empleado.nombre;
        ingresosPorEmpleadoMap[nombre] = ingresosPorEmpleadoMap[nombre] || { nombre, total: 0 };
        ingresosPorEmpleadoMap[nombre].total += e.total;
      }
    }
    const ingresosPorEmpleado = Object.values(ingresosPorEmpleadoMap);

    // 5) Ingresos por especialidad (solo ingresos)
    const ingresosPorEspecialidadMap: Record<string, { nombre: string; total: number }> = {};
    for (const e of estadisticas) {
      if (e.total > 0 && e.especialidad) {
        const nombre = e.especialidad;
        ingresosPorEspecialidadMap[nombre] = ingresosPorEspecialidadMap[nombre] || { nombre, total: 0 };
        ingresosPorEspecialidadMap[nombre].total += e.total;
      }
    }
    const ingresosPorEspecialidad = Object.values(ingresosPorEspecialidadMap);

    res.json({
      ingresosPorDia,                 // ahora siempre trae lun..dom (o la semana actual) con 0 si no hubo movimiento
      ingresosPorEmpleado,
      ingresosPorEspecialidad,
    });
  } catch (error) {
    console.error("Error en /api/tesoreria/detalle:", error);
    res.status(500).json({
      message: "Error obteniendo detalle de tesorería",
      error: (error as any).message,
    });
  }
});

/* ===========================================
 🔹 3️⃣ Clientes frecuentes
 =========================================== */
router.get("/clientes", async (_req, res) => {
  try {
    const grouped = await prisma.turno.groupBy({
      by: ["clienteId"],
      where: { estado: "completado", clienteId: { not: null } },
      _count: { clienteId: true },
      orderBy: { _count: { clienteId: "desc" } },
      take: 10,
    });

    const ids = grouped.map(g => g.clienteId as number);
    if (ids.length === 0) return res.json([]);

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, email: true },
    });

    const byId = new Map(users.map(u => [u.id, u]));
    const respuesta = grouped.map(g => {
      const u = byId.get(g.clienteId as number);
      return {
        nombre: u?.nombre ?? `Cliente #${g.clienteId}`,
        email: u?.email ?? "",
        turnos: g._count.clienteId,
      };
    });

    res.json(respuesta);
  } catch (e: any) {
    console.error("Error /api/tesoreria/clientes:", e);
    res.status(500).json({ message: "Error obteniendo clientes frecuentes" });
  }
});

/* ===========================================
 🔹 4️⃣ Productos más vendidos
 =========================================== */
router.get("/productos", async (_req, res) => {
  try {
    const productos = await prisma.turnoProducto.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true },
    });

    const detalles = await Promise.all(
      productos.map(async (p) => {
        const producto = await prisma.producto.findUnique({
          where: { id: p.productoId },
          select: { nombre: true },
        });
        return {
          nombre: producto?.nombre ?? `#${p.productoId}`,
          cantidad: p._sum.cantidad ?? 0,
        };
      })
    );

    const top = detalles.sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
    res.json(top);
  } catch (error) {
    console.error("Error en /api/tesoreria/productos:", error);
    res.status(500).json({ message: "Error obteniendo productos más vendidos" });
  }
});

/* ===========================================
 🔹 5️⃣ Balance semanal (real)
 =========================================== */
router.get("/balance", async (_req, res) => {
  try {
    const hoy = new Date();
    const hace7dias = new Date();
    hace7dias.setDate(hoy.getDate() - 7);

    const registros = await prisma.estadisticaTesoreria.findMany({
      where: { fecha: { gte: hace7dias, lte: hoy } },
      select: { total: true },
    });

    const balanceSemanal = registros.reduce((sum, r) => sum + (r.total ?? 0), 0);
    res.json({ balanceSemanal });
  } catch (error) {
    console.error("Error en /api/tesoreria/balance:", error);
    res.status(500).json({ message: "Error obteniendo balance semanal" });
  }
});

/* ===========================================
 🔹 6️⃣ Ingresos semanales reales
 =========================================== */
router.get("/ingresos-semanales", async (_req, res) => {
  try {
    const hoy = new Date();
    const hace7dias = new Date();
    hace7dias.setDate(hoy.getDate() - 7);

    const registros = await prisma.estadisticaTesoreria.findMany({
      where: { fecha: { gte: hace7dias, lte: hoy } },
      include: { turno: { select: { fechaHora: true } } },
      orderBy: { fecha: "asc" },
    });

    const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const agrupado: Record<string, number> = {};

    registros.forEach((r) => {
      const fechaTurno = new Date(r.turno?.fechaHora ?? r.fecha);
      fechaTurno.setHours(fechaTurno.getHours() - 3); // ajustar UTC-3
      const key = fechaTurno.toISOString().split("T")[0];
      agrupado[key] = (agrupado[key] || 0) + (r.total ?? 0);
    });

    const dataAgrupada = Object.entries(agrupado).map(([fecha, ingresos]) => {
      const f = new Date(fecha);
      const dia = diasSemana[(f.getDay() + 6) % 7];
      return { dia, ingresos };
    });

    const diasFijos = ["Lun", "Mar", "Mié", "Jue", "Vie"];
    const dataFinal = diasFijos.map((dia) => {
      const existente = dataAgrupada.find((d) => d.dia === dia);
      return { dia, ingresos: existente ? existente.ingresos : 0 };
    });

    res.json(dataFinal);
  } catch (error) {
    console.error("Error en /api/tesoreria/ingresos-semanales:", error);
    res.status(500).json({ message: "Error obteniendo ingresos semanales" });
  }
});

export default router;
