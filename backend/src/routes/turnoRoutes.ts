import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

const router = Router();

// Obtener todos los turnos
router.get("/", async (_req: Request, res: Response) => {
  try {
    const turnos = await prisma.turno.findMany({
      include: {
        cliente: true,
        empleado: true,
        servicio: true,
        productos: {
          include: { producto: true }, // 
        },
      },
      orderBy: { fechaHora: "asc" },
    });

    res.status(200).json(turnos);
  } catch (error) {
    console.error("Error al obtener turnos:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
});

// Crear turno
router.post("/", async (req: Request, res: Response) => {
  try {
    const { fechaHora, empleadoId, servicioId, clienteId } = req.body;

    if (!fechaHora || !empleadoId || !servicioId || !clienteId) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    const fechaSeleccionada = new Date(fechaHora);
    fechaSeleccionada.setMinutes(0, 0, 0);

    const hora = fechaSeleccionada.getHours();
    if (hora < 8 || hora >= 19) {
      return res.status(400).json({ message: "Los turnos deben estar entre las 8:00 y las 19:00." });
    }

    const now = new Date();
    now.setSeconds(0, 0);
    if (fechaSeleccionada <= now) {
      return res.status(400).json({ message: "No se puede reservar en fechas pasadas." });
    }

    const conflicto = await prisma.turno.findFirst({
      where: { empleadoId: Number(empleadoId), fechaHora: fechaSeleccionada },
    });

    if (conflicto) {
      return res.status(400).json({ message: "El empleado ya tiene un turno en ese horario." });
    }

    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaHora: fechaSeleccionada,
        estado: "reservado",
        empleado: { connect: { id: Number(empleadoId) } },
        servicio: { connect: { id: Number(servicioId) } },
        cliente: { connect: { id: Number(clienteId) } },
      },
    });

    res.status(201).json({ message: "Turno creado exitosamente", turno: nuevoTurno });
  } catch (error) {
    console.error("Error al crear turno:", error);
    res.status(500).json({ message: "Error del servidor al crear turno." });
  }
});

// Actualizar estado del turno (completar/cancelar)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ message: "El campo 'estado' es obligatorio." });
    }

    const turno = await prisma.turno.update({
      where: { id: Number(id) },
      data: { estado },
    });

    res.status(200).json({ message: "Estado actualizado correctamente", turno });
  } catch (error) {
    console.error("Error al actualizar turno:", error);
    res.status(500).json({ message: "Error del servidor al actualizar turno." });
  }
});

export default router;
