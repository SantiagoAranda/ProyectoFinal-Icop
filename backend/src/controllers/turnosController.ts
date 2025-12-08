import { Request, Response } from "express";
import { prisma } from "../prisma";
import axios from "axios";

// ================================
// Obtener todos los turnos (con autocancelación)
// ================================
export const getAllTurnos = async (_req: Request, res: Response) => {
  try {
    // 1) Obtener turnos actuales
    let turnos = await prisma.turno.findMany({
      include: {
        cliente: true,
        empleado: true,
        servicio: true,
        productos: { include: { producto: true } },
      },
      orderBy: { fechaHora: "asc" },
    });

    // =====================================================
    // 🚀 Auto-cancelar turnos vencidos (>24h)
    // =====================================================
    const ahora = new Date();

    const turnosVencidos = turnos.filter((t) => {
      const fechaTurno = new Date(t.fechaHora);
      const horasPasadas =
        (ahora.getTime() - fechaTurno.getTime()) / (1000 * 60 * 60);

      return t.estado === "reservado" && horasPasadas > 24;
    });

    for (const t of turnosVencidos) {
      // cancelar turno automáticamente
      await prisma.turno.update({
        where: { id: t.id },
        data: { estado: "cancelado" },
      });

      // liberar stock pendiente
      for (const p of t.productos) {
        await prisma.producto.update({
          where: { id: p.productoId },
          data: {
            stockPendiente: { decrement: p.cantidad },
          },
        });
      }
    }

    // 2) Volver a obtener los turnos actualizados
    turnos = await prisma.turno.findMany({
      include: {
        cliente: true,
        empleado: true,
        servicio: true,
        productos: { include: { producto: true } },
      },
      orderBy: { fechaHora: "asc" },
    });

    // 3) Enviar al frontend
    res.status(200).json(turnos);
  } catch (error) {
    console.error("Error al obtener turnos:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// ================================
// Crear turno
// ================================
export const createTurno = async (req: Request, res: Response) => {
  console.log("📦 Body recibido en createTurno:", req.body);

  const { fechaHora, empleadoId, servicioId, productos } = req.body;
  const clienteId = (req as any).user?.userId ?? req.body.clienteId;

  if (!fechaHora || !empleadoId || !servicioId || !clienteId) {
    return res.status(400).json({ message: "Faltan datos obligatorios." });
  }

  try {
    // Usamos la fecha/hora exacta que viene del front (solo normalizamos segundos/milis)
    const fechaSeleccionada = new Date(fechaHora);
    fechaSeleccionada.setSeconds(0, 0);

    const hora = fechaSeleccionada.getHours();
    if (hora < 9 || hora >= 19) {
      return res.status(400).json({
        message: "Los turnos deben estar entre las 9:00 y las 19:00.",
      });
    }

    const now = new Date();
    // ⛔ No permitir reservar en el pasado (misma lógica que pediste para el cliente)
    if (fechaSeleccionada <= now) {
      return res.status(400).json({
        message: "No se puede reservar en fechas u horarios pasados.",
      });
    }

    // Duración del servicio
    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId },
    });

    if (!servicio) {
      return res.status(400).json({ message: "Servicio no encontrado." });
    }

    // Si por algún motivo duracion es null/undefined, asumimos 1 hora
    const duracionServicioHoras = servicio.duracion ?? 1;

    const fechaInicio = new Date(fechaSeleccionada);
    const fechaFin = new Date(
      fechaInicio.getTime() + duracionServicioHoras * 60 * 60 * 1000
    );

    // ==========================================
    // Validar solapamiento con otros turnos
    // ==========================================
    const turnosEmpleado = await prisma.turno.findMany({
      where: {
        empleadoId,
        // Estados que bloquean el horario de trabajo
        estado: { in: ["reservado", "pendiente", "confirmado"] },
      },
      include: { servicio: true },
    });

    const tieneConflicto = turnosEmpleado.some((t) => {
      const inicioExistente = new Date(t.fechaHora);
      const duracionExistenteHoras = t.servicio?.duracion ?? 1;
      const finExistente = new Date(
        inicioExistente.getTime() + duracionExistenteHoras * 60 * 60 * 1000
      );

      // Solapamiento: [inicio, fin) se cruza con [inicioExistente, finExistente)
      return fechaInicio < finExistente && fechaFin > inicioExistente;
    });

    if (tieneConflicto) {
      return res.status(400).json({
        message: "El empleado ya tiene un turno en ese horario.",
      });
    }

    // ================================
    // Validar stock de productos
    // ================================
    if (Array.isArray(productos)) {
      for (const p of productos) {
        const producto = await prisma.producto.findUnique({
          where: { id: p.productoId },
        });

        if (!producto) {
          return res.status(404).json({
            message: `Producto con ID ${p.productoId} no existe.`,
          });
        }

        const disponible = producto.stock - (producto.stockPendiente ?? 0);

        if (disponible < p.cantidad) {
          return res.status(400).json({
            message: `Stock insuficiente para ${producto.nombre}. Disponible: ${disponible}`,
          });
        }
      }
    }

    // ================================
    // Crear turno
    // ================================
    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaHora: fechaSeleccionada,
        estado: "reservado",
        empleado: { connect: { id: empleadoId } },
        servicio: { connect: { id: servicioId } },
        cliente: { connect: { id: clienteId } },
      },
    });

    // Asociar productos y stockPendiente
    if (productos?.length > 0) {
      await Promise.all(
        productos.map(async (p: any) => {
          await prisma.turnoProducto.create({
            data: {
              turnoId: nuevoTurno.id,
              productoId: p.productoId,
              cantidad: p.cantidad,
            },
          });

          await prisma.producto.update({
            where: { id: p.productoId },
            data: {
              stockPendiente: { increment: p.cantidad },
            },
          });
        })
      );
    }

    // Enviar correo a n8n (si hay email de cliente)
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
          servicio: turnoCliente.servicio?.nombre ?? "",
        });
      }
    } catch (error) {
      console.error("⚠️ Error al notificar a n8n:", error);
    }

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
    res.status(500).json({ message: "Error del servidor al crear turno." });
  }
};

// ================================
// CAMBIAR ESTADO DEL TURNO
// ================================
export const updateTurnoEstado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado: nuevoEstado } = req.body;

    if (!nuevoEstado) {
      return res
        .status(400)
        .json({ message: "El campo 'estado' es obligatorio." });
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

    if (!turno)
      return res.status(404).json({ message: "Turno no encontrado" });

    const estadoAnterior = turno.estado;

    // Validaciones base
    if (estadoAnterior === "cancelado" && nuevoEstado === "completado") {
      return res.status(400).json({
        message: "No se puede completar un turno que ya fue cancelado.",
      });
    }

    if (estadoAnterior === "completado" && nuevoEstado === "cancelado") {
      return res.status(400).json({
        message: "No se puede cancelar un turno que ya fue completado.",
      });
    }

    if (
      (estadoAnterior === "cancelado" || estadoAnterior === "completado") &&
      nuevoEstado === "reservado"
    ) {
      return res.status(400).json({
        message: "No se puede revertir un turno completado o cancelado.",
      });
    }

    // ====================================================
    // 🟣 Permitir completar solo dentro de las 24 horas
    // ====================================================
    if (estadoAnterior === "reservado" && nuevoEstado === "completado") {
      const fechaTurno = new Date(turno.fechaHora);
      const ahora = new Date();

      const horasPasadas =
        (ahora.getTime() - fechaTurno.getTime()) / (1000 * 60 * 60);

      if (horasPasadas > 24) {
        // auto-cancelación
        await prisma.turno.update({
          where: { id: turno.id },
          data: { estado: "cancelado" },
        });

        // liberar stock pendiente
        for (const p of turno.productos) {
          await prisma.producto.update({
            where: { id: p.productoId },
            data: {
              stockPendiente: { decrement: p.cantidad },
            },
          });
        }

        return res.status(400).json({
          message:
            "El turno venció hace más de 24 horas. Fue automáticamente cancelado.",
        });
      }
    }

    // ================================
    // Actualizar estado
    // ================================
    const turnoActualizado = await prisma.turno.update({
      where: { id: Number(id) },
      data: { estado: nuevoEstado },
    });

    // ================================
    // Stock
    // ================================
    for (const p of turno.productos) {
      // reservado → completado
      if (estadoAnterior === "reservado" && nuevoEstado === "completado") {
        await prisma.producto.update({
          where: { id: p.productoId },
          data: {
            stock: { decrement: p.cantidad },
            stockPendiente: { decrement: p.cantidad },
          },
        });
      }

      // reservado → cancelado
      if (estadoAnterior === "reservado" && nuevoEstado === "cancelado") {
        await prisma.producto.update({
          where: { id: p.productoId },
          data: {
            stockPendiente: { decrement: p.cantidad },
          },
        });
      }
    }

    // ================================
    // Guardar estadística al completar
    // ================================
    if (estadoAnterior !== "completado" && nuevoEstado === "completado") {
      const ingresoServicio = turno.servicio?.precio ?? 0;
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

    return res.status(200).json({
      message: "Estado actualizado correctamente",
      turno: turnoActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar turno:", error);
    res
      .status(500)
      .json({ message: "Error del servidor al actualizar turno." });
  }
};

// ================================
// Cancelar turno (atajo)
// ================================
export const cancelTurno = async (req: Request, res: Response) => {
  try {
    const turnoId = Number(req.params.id);
    const user = (req as any).user;

    if (!Number.isInteger(turnoId) || turnoId <= 0) {
      return res.status(400).json({ message: "ID de turno inválido" });
    }

    if (!user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    if (String(user.role).toLowerCase() !== "cliente") {
      return res
        .status(403)
        .json({ message: "Solo los clientes pueden cancelar turnos" });
    }

    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: {
        productos: true,
      },
    });

    if (!turno) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }

    if (turno.clienteId !== user.userId) {
      return res
        .status(403)
        .json({ message: "No tenés permiso para cancelar este turno" });
    }

    const estado = String(turno.estado || "").toLowerCase();
    const cancelables = ["pendiente", "confirmado", "reservado"];
    if (!cancelables.includes(estado)) {
      return res.status(400).json({
        message: "Solo se pueden cancelar turnos pendientes o confirmados",
      });
    }

    const turnoActualizado = await prisma.$transaction(async (tx) => {
      for (const p of turno.productos) {
        await tx.producto.update({
          where: { id: p.productoId },
          data: {
            stock: { increment: p.cantidad },
            stockPendiente: { decrement: p.cantidad },
          },
        });
      }

      return tx.turno.update({
        where: { id: turnoId },
        data: { estado: "cancelado" },
        include: {
          cliente: true,
          empleado: true,
          servicio: true,
          productos: { include: { producto: true } },
        },
      });
    });

    return res.status(200).json({
      message: "Turno cancelado correctamente",
      turno: turnoActualizado,
    });
  } catch (error) {
    console.error("Error al cancelar turno:", error);
    res.status(500).json({ message: "Error al cancelar turno" });
  }
};

// ================================
// Empleados disponibles para una fecha/hora
// ================================
export const getEmpleadosDisponibles = async (req: Request, res: Response) => {
  try {
    const { fechaHora } = req.query;

    if (!fechaHora || typeof fechaHora !== "string") {
      return res
        .status(400)
        .json({ message: "Debe enviar 'fechaHora' como query param." });
    }

    const fecha = new Date(fechaHora);
    fecha.setSeconds(0, 0);

    // 1) Traer todos los empleados activos
    const empleados = await prisma.user.findMany({
      where: { role: "EMPLEADO", activo: true },
      select: { id: true, nombre: true, especialidad: true },
    });

    if (empleados.length === 0) {
      return res.json([]);
    }

    const empleadosIds = empleados.map((e) => e.id);

    // 2) Buscar turnos que bloqueen ese horario
    const turnosEnHorario = await prisma.turno.findMany({
      where: {
        empleadoId: { in: empleadosIds },
        estado: { in: ["reservado", "pendiente", "confirmado"] },
      },
      include: { servicio: true },
    });

    // Para considerar solapamiento con duración real del servicio
    const empleadosOcupados = new Set<number>();

    for (const t of turnosEnHorario) {
      const inicioExistente = new Date(t.fechaHora);
      const duracionExistenteHoras = t.servicio?.duracion ?? 1;
      const finExistente = new Date(
        inicioExistente.getTime() + duracionExistenteHoras * 60 * 60 * 1000
      );

      // usamos una "cita" de 1 hora en base a fecha recibida
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(
        fechaInicio.getTime() + 60 * 60 * 1000
      );

      const seSolapa =
        fechaInicio < finExistente && fechaFin > inicioExistente;

      if (seSolapa) {
        empleadosOcupados.add(t.empleadoId);
      }
    }

    // 3) Filtrar empleados libres
    const disponibles = empleados.filter((e) => !empleadosOcupados.has(e.id));

    return res.json(disponibles);
  } catch (error) {
    console.error("Error getEmpleadosDisponibles:", error);
    res
      .status(500)
      .json({ message: "Error obteniendo empleados disponibles." });
  }
};
