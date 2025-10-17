import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const turnos = await prisma.turno.findMany({
      include: { cliente: true, empleado: true, servicio: true },
      orderBy: { fechaHora: "asc" },
    });
    res.status(200).json(turnos);
  } catch (error) {
    console.error("Error al obtener turnos:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    console.log("=== POST /api/turnos received ===");
    console.log("headers.authorization:", req.header("Authorization"));
    console.log("raw body:", req.body);
    console.log("req.user (from middleware):", (req as any).user);

    const { fechaHora, empleadoId: rawEmpleadoId, servicioId: rawServicioId, clienteId: clienteIdFromBody } = req.body;

    // clienteId puede venir del token (req.user) o del body (fallback para pruebas)
    const clienteFromToken = (req as any).user?.userId ?? (req as any).user?.id;
    const clienteIdParsed = clienteFromToken ?? (clienteIdFromBody !== undefined ? Number(clienteIdFromBody) : undefined);

    const empleadoIdParsed = rawEmpleadoId !== undefined ? Number(rawEmpleadoId) : undefined;
    const servicioIdParsed = rawServicioId !== undefined ? Number(rawServicioId) : undefined;

    const missing: string[] = [];
    if (!fechaHora) missing.push("fechaHora");
    if (empleadoIdParsed === undefined || Number.isNaN(empleadoIdParsed)) missing.push("empleadoId");
    if (servicioIdParsed === undefined || Number.isNaN(servicioIdParsed)) missing.push("servicioId");
    if (clienteIdParsed === undefined || Number.isNaN(clienteIdParsed)) missing.push("clienteId");

    if (missing.length > 0) {
      console.log("Validation failed, missing:", missing);
      return res.status(400).json({
        message: `Faltan datos obligatorios: ${missing.join(", ")}`,
        missing,
        received: {
          fechaHora,
          empleadoIdRaw: rawEmpleadoId,
          empleadoIdParsed,
          servicioIdRaw: rawServicioId,
          servicioIdParsed,
          clienteIdFromBody,
          clienteFromToken,
          clienteIdParsed,
        },
      });
    }

    // continuar con tus validaciones/creación usual
    const fechaSeleccionada = new Date(fechaHora);
    fechaSeleccionada.setMinutes(0, 0, 0);

    // rango horario y pasado (si quieres, mantén tus validaciones actuales)
    const hora = fechaSeleccionada.getHours();
    if (hora < 9 || hora >= 19) {
      return res.status(400).json({ message: "Los turnos deben estar entre las 9:00 y las 19:00." });
    }

    const now = new Date();
    now.setSeconds(0, 0);
    if (fechaSeleccionada.getTime() <= now.getTime()) {
      return res.status(400).json({ message: "No se puede reservar en fechas pasadas." });
    }

    const conflicto = await prisma.turno.findFirst({
      where: { empleadoId: empleadoIdParsed, fechaHora: fechaSeleccionada },
    });

    if (conflicto) {
      return res.status(400).json({ message: "El empleado ya tiene un turno en ese horario." });
    }

    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaHora: fechaSeleccionada,
        estado: "reservado",
        empleado: { connect: { id: empleadoIdParsed } },
        servicio: { connect: { id: servicioIdParsed } },
        cliente: { connect: { id: Number(clienteIdParsed) } },
      },
    });

    console.log("Turno creado:", nuevoTurno.id);
    return res.status(201).json({ message: "Turno creado exitosamente", turno: nuevoTurno });
  } catch (error) {
    console.error("Error al crear turno:", error);
    return res.status(500).json({ message: "Error del servidor al crear turno." });
  }
});

export default router;
