import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

/* ===========================================
🔹 1️⃣ Resumen general de Tesorería (MENSUAL)
=========================================== */
router.get("/resumen", async (req, res) => {
  try {
    const hoy = new Date();

    // mes/anio pueden llegar por query (?mes=5&anio=2025)
    const mesSeleccionado = req.query.mes
      ? Number(req.query.mes)
      : hoy.getMonth() + 1;
    const anioSeleccionado = req.query.anio
      ? Number(req.query.anio)
      : hoy.getFullYear();

    // Rango de fechas del mes seleccionado
    const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
    const finMes = new Date(anioSeleccionado, mesSeleccionado, 1); // primer día del mes siguiente

    // Ingresos (estadísticas positivas) SOLO del mes seleccionado
    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      where: {
        fecha: {
          gte: inicioMes,
          lt: finMes,
        },
      },
    });

    const ingresosTotales = estadisticas.reduce(
      (acc, e) => acc + (e.total ?? 0),
      0
    );

    // Egresos fijos del mes (ya filtran por mes/anio)
    const egresosFijos = await prisma.egresoFijo.aggregate({
      _sum: { monto: true },
      where: { mes: mesSeleccionado, anio: anioSeleccionado },
    });

    // Egresos por compras SOLO del mes seleccionado
    const egresosCompras = await prisma.compra.aggregate({
      _sum: { total: true },
      where: {
        fecha: {
          gte: inicioMes,
          lt: finMes,
        },
      },
    });

    const totalEgresosFijos = egresosFijos._sum.monto ?? 0;
    const totalEgresosCompras = egresosCompras._sum.total ?? 0;

    const egresosTotales = totalEgresosFijos + totalEgresosCompras;

    const gananciaNeta = ingresosTotales - egresosTotales;

    // Turnos SOLO del mes seleccionado (para completados/cancelaciones)
    const turnos = await prisma.turno.findMany({
      where: {
        fechaHora: {
          gte: inicioMes,
          lt: finMes,
        },
      },
      select: { estado: true },
    });

    const completados = turnos.filter((t) => t.estado === "completado").length;
    const cancelaciones = turnos.filter(
      (t) => t.estado === "cancelado"
    ).length;

    res.json({
      ingresosTotales,
      egresosTotales,
      egresosFijos: totalEgresosFijos,
      egresosCompras: totalEgresosCompras,
      gananciaNeta,
      completados,
      cancelaciones,
      totalTurnos: turnos.length,
      mes: mesSeleccionado,
      anio: anioSeleccionado,
    });
  } catch (error) {
    console.error("Error en /api/tesoreria/resumen:", error);
    res.status(500).json({
      message: "Error obteniendo resumen de tesorería",
    });
  }
});

/* ============================================================
🔹 DETALLE MENSUAL (por día del mes seleccionado)
============================================================ */
router.get("/detalle", async (req, res) => {
  try {
    const hoy = new Date();

    // Obtener mes y año de los query params
    const mesSeleccionado = req.query.mes
      ? Number(req.query.mes)
      : hoy.getMonth() + 1;
    const anioSeleccionado = req.query.anio
      ? Number(req.query.anio)
      : hoy.getFullYear();

    // Rango completo del mes seleccionado
    const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
    const finMes = new Date(anioSeleccionado, mesSeleccionado, 1); // primer día del mes siguiente

    // === Ingresos / egresos desde estadisticaTesoreria del mes
    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      where: {
        fecha: { gte: inicioMes, lt: finMes }
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

    // Mapeo por día del mes (1-31)
    const ingresosPorDiaMap: Record<
      number,
      { dia: string; ingresos: number; egresos: number }
    > = {};

    // Ingresos / egresos desde estadísticas
    for (const e of estadisticas) {
      const fechaBase = new Date(e.turno?.fechaHora ?? e.fecha);
      const diaDelMes = fechaBase.getDate();

      if (!ingresosPorDiaMap[diaDelMes]) {
        ingresosPorDiaMap[diaDelMes] = {
          dia: `${diaDelMes}`,
          ingresos: 0,
          egresos: 0
        };
      }

      if ((e.total ?? 0) > 0) {
        ingresosPorDiaMap[diaDelMes].ingresos += e.total ?? 0;
      } else if ((e.total ?? 0) < 0) {
        ingresosPorDiaMap[diaDelMes].egresos += Math.abs(e.total ?? 0);
      }
    }

    // === Egresos categoría "Otros" del mes
    const egresosOtrosMes = await prisma.egresoFijo.findMany({
      where: {
        categoria: "Otros",
        mes: mesSeleccionado,
        anio: anioSeleccionado,
      },
      select: { monto: true, createdAt: true },
    });

    for (const e of egresosOtrosMes) {
      const fecha = new Date(e.createdAt);
      const diaDelMes = fecha.getDate();

      if (!ingresosPorDiaMap[diaDelMes]) {
        ingresosPorDiaMap[diaDelMes] = {
          dia: `${diaDelMes}`,
          ingresos: 0,
          egresos: 0
        };
      }

      ingresosPorDiaMap[diaDelMes].egresos += e.monto;
    }

    // === Resultado ordenado por día del mes
    const diasEnMes = new Date(anioSeleccionado, mesSeleccionado, 0).getDate();
    const ingresosPorDia = Array.from({ length: diasEnMes }, (_, i) => {
      const dia = i + 1;
      return {
        dia: `${dia}`,
        ingresos: ingresosPorDiaMap[dia]?.ingresos ?? 0,
        egresos: ingresosPorDiaMap[dia]?.egresos ?? 0,
      };
    });

    // === Ingresos por empleado (del mes)
    const ingresosPorEmpleadoMap: Record<
      string,
      { nombre: string; total: number }
    > = {};

    for (const e of estadisticas) {
      if ((e.total ?? 0) > 0 && e.turno?.empleado?.nombre) {
        const nombre = e.turno.empleado.nombre;
        ingresosPorEmpleadoMap[nombre] =
          ingresosPorEmpleadoMap[nombre] || { nombre, total: 0 };
        ingresosPorEmpleadoMap[nombre].total += e.total ?? 0;
      }
    }

    const ingresosPorEmpleado = Object.values(ingresosPorEmpleadoMap);

    // === Ingresos por especialidad (del mes)
    const ingresosPorEspecialidadMap: Record<
      string,
      { nombre: string; total: number }
    > = {};

    for (const e of estadisticas) {
      if ((e.total ?? 0) > 0 && e.especialidad) {
        const nombre = e.especialidad;
        ingresosPorEspecialidadMap[nombre] =
          ingresosPorEspecialidadMap[nombre] || { nombre, total: 0 };
        ingresosPorEspecialidadMap[nombre].total += e.total ?? 0;
      }
    }

    const ingresosPorEspecialidad = Object.values(
      ingresosPorEspecialidadMap
    );

    res.json({
      ingresosPorDia,
      ingresosPorEmpleado,
      ingresosPorEspecialidad,
    });
  } catch (error) {
    console.error("Error obteniendo detalle de tesorería:", error);
    res.status(500).json({
      message: "Error obteniendo detalle de tesorería",
    });
  }
});

/* ============================================================
🔹 CLIENTES FRECUENTES
============================================================ */
router.get("/clientes", async (_req, res) => {
  try {
    const grouped = await prisma.turno.groupBy({
      by: ["clienteId"],
      where: { estado: "completado", clienteId: { not: null } },
      _count: { clienteId: true },
      orderBy: { _count: { clienteId: "desc" } },
      take: 10,
    });

    const ids = grouped.map((g) => g.clienteId as number);
    if (ids.length === 0) return res.json([]);

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, email: true },
    });

    const byId = new Map(users.map((u) => [u.id, u]));
    const respuesta = grouped.map((g) => {
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

/* ============================================================
🔹 PRODUCTOS MÁS VENDIDOS
============================================================ */
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

/* ============================================================
🔹 BALANCE SEMANAL
============================================================ */
router.get("/balance", async (_req, res) => {
  try {
    const hoy = new Date();
    const hace7dias = new Date();
    hace7dias.setDate(hoy.getDate() - 7);

    const registros = await prisma.estadisticaTesoreria.findMany({
      where: { fecha: { gte: hace7dias, lte: hoy } },
      select: { total: true },
    });

    const balanceSemanal = registros.reduce(
      (sum, r) => sum + (r.total ?? 0),
      0
    );
    res.json({ balanceSemanal });
  } catch (error) {
    console.error("Error en /api/tesoreria/balance:", error);
    res.status(500).json({ message: "Error obteniendo balance semanal" });
  }
});

/* ============================================================
🔹 INGRESOS SEMANALES
============================================================ */
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
      fechaTurno.setHours(fechaTurno.getHours() - 3);
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

/* ============================================================
🔹 INGRESOS MENSUALES
============================================================ */
router.get("/ingresos-mensuales", async (_req, res) => {
  try {
    // Obtener todos los registros de estadísticas (ingresos y egresos por compras)
    const registros = await prisma.estadisticaTesoreria.findMany({
      orderBy: { fecha: "asc" },
    });

    // Obtener todos los egresos fijos mensuales
    const egresosFijos = await prisma.egresoFijo.findMany({
      select: { mes: true, anio: true, monto: true },
    });

    const agrupado: Record<string, any> = {};

    // Agrupar estadísticas (ingresos y egresos por compras)
    for (const r of registros) {
      const fecha = new Date(r.fecha);
      const mes = fecha
        .toLocaleString("es-AR", { month: "short" })
        .toUpperCase();
      const year = fecha.getFullYear();

      const key = `${mes}-${year}`;

      if (!agrupado[key]) {
        agrupado[key] = {
          mes: key,
          ingresos: 0,
          egresos: 0,
        };
      }

      if (r.total >= 0) agrupado[key].ingresos += r.total;
      else agrupado[key].egresos += Math.abs(r.total);
    }

    // Agregar egresos fijos mensuales al total de egresos
    for (const egreso of egresosFijos) {
      const fecha = new Date(egreso.anio, egreso.mes - 1, 1);
      const mes = fecha
        .toLocaleString("es-AR", { month: "short" })
        .toUpperCase();
      const year = egreso.anio;

      const key = `${mes}-${year}`;

      if (!agrupado[key]) {
        agrupado[key] = {
          mes: key,
          ingresos: 0,
          egresos: 0,
        };
      }

      agrupado[key].egresos += egreso.monto;
    }

    res.json(Object.values(agrupado));
  } catch (error) {
    console.error("Error en /api/tesoreria/ingresos-mensuales:", error);
    res.status(500).json({ message: "Error obteniendo ingresos mensuales" });
  }
});

export default router;