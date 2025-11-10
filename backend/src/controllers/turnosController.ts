import { Request, Response } from "express";
import { prisma } from "../prisma";
import axios from "axios";

// ===============================
// Obtener todos los turnos
// ===============================
export const getAllTurnos = async (_req: Request, res: Response) => {
  try {
    const turnos = await prisma.turno.findMany({
      include: {
        cliente: true,
        empleado: true,
        servicio: true,
        productos: { include: { producto: true } },
      },
      orderBy: { fechaHora: "asc" },
    });

    res.status(200).json(turnos);
  } catch (error) {
    console.error("Error al obtener turnos:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// ===============================
// Crear un nuevo turno (reserva)
// ===============================
export const createTurno = async (req: Request, res: Response) => {
  console.log("📦 Body recibido en createTurno:", req.body);

  const { fechaHora, empleadoId, servicioId, productos } = req.body;
  const clienteId = (req as any).user?.userId ?? req.body.clienteId;

  if (!fechaHora || !empleadoId || !servicioId || !clienteId) {
    return res.status(400).json({ message: "Faltan datos obligatorios." });
  }

  try {
    const fechaSeleccionada = new Date(fechaHora);
    fechaSeleccionada.setMinutes(0, 0, 0);

    const hora = fechaSeleccionada.getHours();
    if (hora < 9 || hora >= 19) {
      return res
        .status(400)
        .json({ message: "Los turnos deben estar entre las 9:00 y las 19:00." });
    }

    const now = new Date();
    if (fechaSeleccionada <= now) {
      return res
        .status(400)
        .json({ message: "No se puede reservar en fechas pasadas." });
    }

    // ===============================
    // Validar solapamiento de horarios
    // ===============================
    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId },
    });

    if (!servicio) {
      return res.status(400).json({ message: "Servicio no encontrado." });
    }

    const fechaInicio = new Date(fechaSeleccionada);
    const fechaFin = new Date(
      fechaInicio.getTime() + servicio.duracion * 60 * 60 * 1000
    );

    const turnosEmpleado = await prisma.turno.findMany({
      where: {
        empleadoId,
        estado: { in: ["reservado", "completado"] },
      },
      include: { servicio: true },
    });

    const tieneConflicto = turnosEmpleado.some((t) => {
      const inicioExistente = new Date(t.fechaHora);
      const finExistente = new Date(
        inicioExistente.getTime() + t.servicio.duracion * 60 * 60 * 1000
      );
      return fechaInicio < finExistente && fechaFin > inicioExistente;
    });

    if (tieneConflicto) {
      return res
        .status(400)
        .json({ message: "El empleado ya tiene un turno en ese horario." });
    }

    // ===============================
    // Validar stock pendiente
    // ===============================
    if (Array.isArray(productos) && productos.length > 0) {
      for (const p of productos) {
        const producto = await prisma.producto.findUnique({
          where: { id: p.productoId },
        });
        if (!producto) {
          return res
            .status(404)
            .json({ message: `Producto con ID ${p.productoId} no existe.` });
        }

        const disponible = producto.stock - (producto.stockPendiente ?? 0);
        if (disponible < p.cantidad) {
          return res.status(400).json({
            message: `Stock insuficiente para ${producto.nombre}. Disponible: ${disponible}`,
          });
        }
      }
    }

    // ===============================
    // Crear el turno
    // ===============================
    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaHora: fechaSeleccionada,
        estado: "reservado",
        empleado: { connect: { id: empleadoId } },
        servicio: { connect: { id: servicioId } },
        cliente: { connect: { id: clienteId } },
      },
    });

    // Asociar productos y aumentar stockPendiente
    if (Array.isArray(productos) && productos.length > 0) {
      const operaciones = productos.map(async (p) => {
        await prisma.turnoProducto.create({
          data: {
            turnoId: nuevoTurno.id,
            productoId: p.productoId,
            cantidad: p.cantidad || 1,
          },
        });

        await prisma.producto.update({
          where: { id: p.productoId },
          data: { stockPendiente: { increment: p.cantidad || 1 } },
        });
      });

      await Promise.all(operaciones);
    }

    // ===============================
    // Enviar correo al cliente (reserva realizada)
    // ===============================
    try {
      const turnoCliente = await prisma.turno.findUnique({
        where: { id: nuevoTurno.id },
        include: { cliente: true, servicio: true },
      });

      if (turnoCliente?.cliente?.email) {
        await axios.post("http://localhost:5678/webhook/turno-confirmado", {
          nombreCliente: turnoCliente.cliente.nombre,
          email: turnoCliente.cliente.email,
          fecha: new Date(turnoCliente.fechaHora).toISOString().slice(0, 10),
          hora: new Date(turnoCliente.fechaHora).toISOString().slice(11, 16),
          servicio: turnoCliente.servicio?.nombre ?? "Servicio sin nombre",
        });

        console.log("📩 Notificación enviada a n8n: reserva confirmada.");
      }
    } catch (error) {
      console.error("⚠️ Error al notificar a n8n:", error);
    }

    // ===============================
    // Respuesta al cliente
    // ===============================
    const turnoCompleto = await prisma.turno.findUnique({
      where: { id: nuevoTurno.id },
      include: {
        cliente: true,
        empleado: true,
        servicio: true,
        productos: { include: { producto: true } },
      },
    });

    return res.status(201).json({
      message: "Turno creado exitosamente",
      turno: turnoCompleto,
    });
  } catch (error) {
    console.error("Error al crear turno:", error);
    return res
      .status(500)
      .json({ message: "Error del servidor al crear turno." });
  }
};

// ===============================
// Cambiar estado del turno (sin envío de correo)
// ===============================
export const updateTurnoEstado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ message: "El campo 'estado' es obligatorio." });
    }

    const turno = await prisma.turno.findUnique({
      where: { id: Number(id) },
      include: {
        productos: { include: { producto: true } },
        servicio: true,
        empleado: true,
        cliente: true,
      },
    });

    if (!turno) return res.status(404).json({ message: "Turno no encontrado" });

    // Actualizar estado
    const turnoActualizado = await prisma.turno.update({
      where: { id: Number(id) },
      data: { estado },
    });

    // ===============================
    // Actualizar stock según el nuevo estado
    // ===============================
    if (turno.productos.length > 0) {
      for (const p of turno.productos) {
        if (estado === "completado") {
          await prisma.producto.update({
            where: { id: p.productoId },
            data: {
              stock: { decrement: p.cantidad },
              stockPendiente: { decrement: p.cantidad },
            },
          });
        } else if (estado === "cancelado") {
          await prisma.producto.update({
            where: { id: p.productoId },
            data: { stockPendiente: { decrement: p.cantidad } },
          });
        }
      }
    }

    // ===============================
    // Crear estadística solo si se completa
    // ===============================
    if (estado === "completado") {
      const existente = await prisma.estadisticaTesoreria.findFirst({
        where: { turnoId: turno.id },
      });

      if (!existente && turno.servicio) {
        const ingresoServicio = turno.servicio.precio ?? 0;
        const ingresoProductos = turno.productos.reduce((sum, p) => {
          const precio = p.producto?.precio ?? 0;
          return sum + p.cantidad * precio;
        }, 0);
        const total = ingresoServicio + ingresoProductos;

        await prisma.estadisticaTesoreria.create({
          data: {
            ingresoServicio,
            ingresoProductos,
            total,
            turnoId: turno.id,
            empleadoId: turno.empleadoId ?? null,
            especialidad: turno.empleado?.especialidad ?? null,
          },
        });
      }
    }

    res
      .status(200)
      .json({ message: "Estado actualizado correctamente", turno: turnoActualizado });
  } catch (error) {
    console.error("Error al actualizar turno:", error);
    res.status(500).json({ message: "Error del servidor al actualizar turno." });
  }
};

// ===============================
// Cancelar turno (atajo)
// ===============================
export const cancelTurno = async (req: Request, res: Response) => {
  try {
    req.body.estado = "cancelado";
    return await updateTurnoEstado(req, res);
  } catch (error) {
    console.error("Error al cancelar turno:", error);
    res.status(500).json({ message: "Error al cancelar turno" });
  }
};
