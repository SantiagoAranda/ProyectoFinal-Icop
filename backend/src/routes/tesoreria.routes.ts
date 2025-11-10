import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

/* ===========================================
🔹 1️⃣ Resumen general de Tesorería (actualizado)
=========================================== */
router.get("/resumen", async (_req, res) => {
  try {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1; // Enero = 0
    const anioActual = hoy.getFullYear();

    // === Ingresos (de estadísticas registradas)
    const estadisticas = await prisma.estadisticaTesoreria.findMany();
    const ingresosTotales = estadisticas.reduce(
      (acc, e) => acc + (e.total ?? 0),
      0
    );

    // === Egresos fijos (mensuales)
    const egresosFijos = await prisma.egresoFijo.aggregate({
      _sum: { monto: true },
      where: { mes: mesActual, anio: anioActual },
    });

    // === Egresos variables (compras)
    const egresosCompras = await prisma.compra.aggregate({
      _sum: { total: true },
    });

    const totalEgresosFijos = egresosFijos._sum.monto ?? 0;
    const totalEgresosCompras = egresosCompras._sum.total ?? 0;

    const egresosTotales = totalEgresosFijos + totalEgresosCompras;

    // === Ganancia neta
    const gananciaNeta = ingresosTotales - egresosTotales;

    // === Estadísticas de turnos
    const turnos = await prisma.turno.findMany({ select: { estado: true } });
    const completados = turnos.filter((t) => t.estado === "completado").length;
    const cancelaciones = turnos.filter(
      (t) => t.estado === "cancelado"
    ).length;

    // === Respuesta final
    res.json({
      ingresosTotales,
      egresosTotales,
      egresosFijos: totalEgresosFijos,
      egresosCompras: totalEgresosCompras,
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


router.get("/detalle", async (_req, res) => {
  try {
    // === 1️⃣ Obtener estadísticas de la semana actual (lunes a viernes)
    const hoy = new Date();

    // Calcular lunes de la semana actual
    const startOfWeek = (d: Date) => {
      const x = new Date(d);
      const day = (x.getDay() + 6) % 7; // convierte domingo=6 → lunes=0
      x.setHours(0, 0, 0, 0);
      x.setDate(x.getDate() - day);
      return x;
    };

    const lunes = startOfWeek(hoy);
    const viernes = new Date(lunes);
    viernes.setDate(lunes.getDate() + 4); // límite viernes

    // Consultar estadísticas solo del rango lunes-viernes
    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      where: {
        fecha: { gte: lunes, lte: viernes },
      },
      include: {
        turno: {
          include: {
            servicio: true,
            empleado: true,
            productos: { include: { producto: true } },
          },
        },
      },
    });

    // === 2️⃣ Preparar mapeo de días (solo lun-vie)
    const DAYS = ["lun", "mar", "mié", "jue", "vie"];
    const labelDay = (d: Date) =>
      d
        .toLocaleDateString("es-AR", { weekday: "short" })
        .replace(".", "")
        .toLowerCase();

    const ingresosPorDiaMap: Record<
      string,
      { dia: string; ingresos: number; egresos: number }
    > = {};

    for (const e of estadisticas) {
      const fechaBase = new Date(e.turno?.fechaHora ?? e.fecha);
      const key = labelDay(fechaBase); // ej. 'lun', 'mar'
      if (!DAYS.includes(key)) continue; // ignorar sáb-dom

      if (!ingresosPorDiaMap[key])
        ingresosPorDiaMap[key] = { dia: key, ingresos: 0, egresos: 0 };

      if (e.total > 0) ingresosPorDiaMap[key].ingresos += e.total;
      else ingresosPorDiaMap[key].egresos += Math.abs(e.total);
    }

    const ingresosPorDia = DAYS.map((d) => ({
      dia: d,
      ingresos: ingresosPorDiaMap[d]?.ingresos ?? 0,
      egresos: ingresosPorDiaMap[d]?.egresos ?? 0,
    }));

    // === 3️⃣ Ingresos por empleado
    const ingresosPorEmpleadoMap: Record<string, { nombre: string; total: number }> = {};
    for (const e of estadisticas) {
      if (e.total > 0 && e.turno?.empleado?.nombre) {
        const nombre = e.turno.empleado.nombre;
        ingresosPorEmpleadoMap[nombre] = ingresosPorEmpleadoMap[nombre] || { nombre, total: 0 };
        ingresosPorEmpleadoMap[nombre].total += e.total;
      }
    }
    const ingresosPorEmpleado = Object.values(ingresosPorEmpleadoMap);

    // === 4️⃣ Ingresos por especialidad
    const ingresosPorEspecialidadMap: Record<string, { nombre: string; total: number }> = {};
    for (const e of estadisticas) {
      if (e.total > 0 && e.especialidad) {
        const nombre = e.especialidad;
        ingresosPorEspecialidadMap[nombre] = ingresosPorEspecialidadMap[nombre] || { nombre, total: 0 };
        ingresosPorEspecialidadMap[nombre].total += e.total;
      }
    }
    const ingresosPorEspecialidad = Object.values(ingresosPorEspecialidadMap);

    // === 5️⃣ Respuesta final
    res.json({
      ingresosPorDia,
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
