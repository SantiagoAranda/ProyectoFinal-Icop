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

router.get('/clientes', async (_req, res) => {
  try {
    console.log('=== Consultando clientes frecuentes ===');

    const grouped = await prisma.turno.groupBy({
      by: ['clienteId'],
      where: { estado: 'completado', clienteId: { not: null } },
      _count: { clienteId: true },
      orderBy: { _count: { clienteId: 'desc' } }, 
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
        email: u?.email ?? '',
        turnos: g._count.clienteId, 
      };
    });

    res.json(respuesta);
  } catch (e: any) {
    console.error('Error /api/tesoreria/clientes:', e);
    res.status(500).json({ message: 'Error obteniendo clientes frecuentes' });
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

    const top = detalles
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    res.json(top);
  } catch (error) {
    console.error("Error en /api/tesoreria/productos:", error);
    res.status(500).json({ message: "Error obteniendo productos más vendidos" });
  }
});



export default router;
