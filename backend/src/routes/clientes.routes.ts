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
    // 1) Turnos completados con cliente
    const turnos = await prisma.turno.findMany({
      where: {
        estado: "completado",
        clienteId: { not: null },
      },
      orderBy: { fechaHora: "desc" },
      include: {
        cliente: true,
      },
    });

    if (turnos.length === 0) {
      return res.json([]);
    }

    // 2) Estadísticas para esos turnos (solo ingresos)
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

    // 3) Armar resumen por cliente
    type ClienteResumen = {
      id: number;
      nombre: string;
      email: string | null;
      fechaAlta: string; // ISO; el front la formatea
      turnosCompletados: number;
      totalGastado: number;
    };

    const clientesMap = new Map<number, ClienteResumen>();

    for (const t of turnos) {
      const cli = t.cliente;
      if (!cli) continue;

      const existente = clientesMap.get(cli.id);
      const fechaTurno = t.fechaHora;

      if (!existente) {
        clientesMap.set(cli.id, {
          id: cli.id,
          nombre: cli.nombre ?? "Sin nombre",
          email: cli.email ?? null,
          // usamos la fecha de creación del usuario si existe,
          // sino tomamos la fecha del turno más antiguo
          fechaAlta: (cli as any).createdAt
            ? (cli as any).createdAt.toISOString()
            : fechaTurno.toISOString(),
          turnosCompletados: 1,
          totalGastado: montoPorTurno.get(t.id) ?? 0,
        });
      } else {
        existente.turnosCompletados += 1;
        existente.totalGastado += montoPorTurno.get(t.id) ?? 0;

        // aseguramos que fechaAlta sea la más antigua conocida
        const fechaActual = new Date(existente.fechaAlta);
        if (fechaTurno < fechaActual) {
          existente.fechaAlta = fechaTurno.toISOString();
        }
      }
    }

    const resumen = Array.from(clientesMap.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );

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
