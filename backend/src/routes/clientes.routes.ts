import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

/* ============================================================
   🔹 RESUMEN DE CLIENTES: /api/clientes/resumen
   Devuelve: id, nombre, email, fechaAlta, turnosCompletados, totalGastado
============================================================ */
router.get("/resumen", authenticateToken, async (_req, res) => {
  try {
    // 1) Obtener TODOS los clientes registrados
    const clientes = await prisma.user.findMany({
      where: {
        role: "CLIENTE",
      },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
      },
    });

    if (clientes.length === 0) {
      return res.json([]);
    }

    const clienteIds = clientes.map((c) => c.id);

    // 2) Obtener turnos completados de estos clientes
    const turnos = await prisma.turno.findMany({
      where: {
        estado: "completado",
        clienteId: { in: clienteIds },
      },
      select: {
        id: true,
        clienteId: true,
      },
    });

    // 3) Estadísticas para esos turnos (solo si hay turnos)
    const idsTurnos = turnos.map((t) => t.id);

    const estadisticas = idsTurnos.length > 0
      ? await prisma.estadisticaTesoreria.findMany({
        where: {
          turnoId: { in: idsTurnos },
          total: { gt: 0 },
        },
        select: {
          turnoId: true,
          total: true,
        },
      })
      : [];

    const montoPorTurno = new Map<number, number>();
    for (const e of estadisticas) {
      if (!e.turnoId) continue;
      const actual = montoPorTurno.get(e.turnoId) ?? 0;
      montoPorTurno.set(e.turnoId, actual + (e.total ?? 0));
    }

    // 4) Contar turnos y calcular total gastado por cliente
    const turnosPorCliente = new Map<number, number>();
    const gastoPorCliente = new Map<number, number>();

    for (const t of turnos) {
      if (!t.clienteId) continue;

      turnosPorCliente.set(
        t.clienteId,
        (turnosPorCliente.get(t.clienteId) ?? 0) + 1
      );

      gastoPorCliente.set(
        t.clienteId,
        (gastoPorCliente.get(t.clienteId) ?? 0) + (montoPorTurno.get(t.id) ?? 0)
      );
    }

    // 5) Armar resumen con TODOS los clientes
    type ClienteResumen = {
      id: number;
      nombre: string;
      email: string | null;
      fechaAlta: string;
      turnosCompletados: number;
      totalGastado: number;
    };

    const resumen: ClienteResumen[] = clientes.map((cli) => ({
      id: cli.id,
      nombre: cli.nombre ?? "Sin nombre",
      email: cli.email ?? null,
      fechaAlta: cli.createdAt?.toISOString() ?? new Date().toISOString(),
      turnosCompletados: turnosPorCliente.get(cli.id) ?? 0,
      totalGastado: gastoPorCliente.get(cli.id) ?? 0,
    }));

    return res.json(resumen);
  } catch (error: any) {
    console.error("🔥 Error en /api/clientes/resumen:", error);
    return res.status(500).json({
      message: "Error al obtener el resumen de clientes",
      error: error?.message,
    });
  }
});

/* ============================================================
   🔹 DETALLE DE UN CLIENTE: /api/clientes/:id/detalle
   Devuelve historial de turnos COMPLETADOS con totalPagado
============================================================ */
router.get("/:id/detalle", authenticateToken, async (req, res) => {
  try {
    const clienteId = Number(req.params.id);
    if (!clienteId || Number.isNaN(clienteId)) {
      return res.status(400).json({ message: "ID de cliente inválido" });
    }

    // 1) Turnos completados del cliente
    const turnos = await prisma.turno.findMany({
      where: {
        clienteId,
        estado: "completado",
      },
      orderBy: { fechaHora: "desc" },
      include: {
        servicio: { select: { nombre: true } },
        empleado: { select: { nombre: true } },
      },
    });

    if (turnos.length === 0) {
      return res.json([]);
    }

    // 2) Estadísticas (ingresos) asociadas a esos turnos
    const idsTurnos = turnos.map((t) => t.id);

    const estadisticas = await prisma.estadisticaTesoreria.findMany({
      where: {
        turnoId: { in: idsTurnos },
        total: { gt: 0 },
      },
      select: {
        turnoId: true,
        total: true,
      },
    });

    const montoPorTurno = new Map<number, number>();
    for (const e of estadisticas) {
      if (!e.turnoId) continue;
      const actual = montoPorTurno.get(e.turnoId) ?? 0;
      montoPorTurno.set(e.turnoId, actual + (e.total ?? 0));
    }

    // 3) Respuesta para el front
    const historial = turnos.map((t) => ({
      id: t.id,
      fecha: t.fechaHora,
      estado: t.estado,
      servicioNombre: t.servicio?.nombre ?? null,
      empleadoNombre: t.empleado?.nombre ?? null,
      totalPagado: montoPorTurno.get(t.id) ?? 0,
    }));

    return res.json(historial);
  } catch (error: any) {
    console.error("🔥 Error en /api/clientes/:id/detalle:", error);
    return res.status(500).json({
      message: "Error al obtener el historial de turnos del cliente",
      error: error?.message,
    });
  }
});

export default router;