import { Request, Response } from 'express';
import { prisma } from '../prisma';

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
      orderBy: { fechaHora: 'asc' },
    });

    res.status(200).json(turnos);
  } catch (error) {
    console.error('Error al obtener turnos:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// ===============================
// Crear un nuevo turno
// ===============================
export const createTurno = async (req: Request, res: Response) => {
  console.log("📦 Body recibido en createTurno:", req.body);

  const { fechaHora, empleadoId, servicioId, productos } = req.body;
  const clienteId = (req as any).user?.userId ?? req.body.clienteId;

  if (!fechaHora || !empleadoId || !servicioId || !clienteId) {
    return res.status(400).json({ message: 'Faltan datos obligatorios.' });
  }

  try {
    const fechaSeleccionada = new Date(fechaHora);
    fechaSeleccionada.setMinutes(0, 0, 0);

    const hora = fechaSeleccionada.getHours();
    if (hora < 9 || hora >= 19) {
      return res.status(400).json({ message: 'Los turnos deben estar entre las 9:00 y las 19:00.' });
    }

    const now = new Date();
    if (fechaSeleccionada <= now) {
      return res.status(400).json({ message: 'No se puede reservar en fechas pasadas.' });
    }

    // Verificar conflicto de empleado
    const conflicto = await prisma.turno.findFirst({
      where: { empleadoId, fechaHora: fechaSeleccionada },
    });
    if (conflicto) {
      return res.status(400).json({ message: 'El empleado ya tiene un turno en ese horario.' });
    }

    // Validar stock pendiente
    if (Array.isArray(productos) && productos.length > 0) {
      for (const p of productos) {
        const producto = await prisma.producto.findUnique({ where: { id: p.productoId } });
        if (!producto) {
          return res.status(404).json({ message: `Producto con ID ${p.productoId} no existe.` });
        }

        const disponible = producto.stock - (producto.stockPendiente ?? 0);
        if (disponible < p.cantidad) {
          return res.status(400).json({
            message: `Stock insuficiente para ${producto.nombre}. Disponible: ${disponible}`,
          });
        }
      }
    }

    // Crear el turno
    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaHora: fechaSeleccionada,
        estado: 'reservado',
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
      message: 'Turno creado exitosamente',
      turno: turnoCompleto,
    });
  } catch (error) {
    console.error('Error al crear turno:', error);
    return res.status(500).json({ message: 'Error del servidor al crear turno.' });
  }
};

// ===============================
// Cambiar estado del turno
// ===============================
export const updateTurnoEstado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ message: "El campo 'estado' es obligatorio." });
    }

    // ✅ Traemos toda la info necesaria para registrar en tesorería
    const turno = await prisma.turno.findUnique({
      where: { id: Number(id) },
      include: {
        productos: { include: { producto: true } },
        servicio: true,
        empleado: true,
      },
    });

    if (!turno) return res.status(404).json({ message: 'Turno no encontrado' });

    // Actualizar estado
    const turnoActualizado = await prisma.turno.update({
      where: { id: Number(id) },
      data: { estado },
    });

    // ✅ Actualizar stock según el nuevo estado
    if (turno.productos.length > 0) {
      for (const p of turno.productos) {
        if (estado === 'completado') {
          await prisma.producto.update({
            where: { id: p.productoId },
            data: {
              stock: { decrement: p.cantidad },
              stockPendiente: { decrement: p.cantidad },
            },
          });
        } else if (estado === 'cancelado') {
          await prisma.producto.update({
            where: { id: p.productoId },
            data: { stockPendiente: { decrement: p.cantidad } },
          });
        }
      }
    }

    // ✅ Crear estadística solo si se completa
    if (estado === 'completado') {
  console.log('🧾 Intentando crear estadística para turno:', turno.id);

  const existente = await prisma.estadisticaTesoreria.findFirst({
    where: { turnoId: turno.id },
  });

  console.log('🔍 Existe registro previo?', existente ? 'Sí' : 'No');

  if (!existente && turno.servicio) {
    const ingresoServicio = turno.servicio.precio ?? 0;
    const ingresoProductos = turno.productos.reduce((sum, p) => {
      const precio = p.producto?.precio ?? 0;
      return sum + p.cantidad * precio;
    }, 0);
    const total = ingresoServicio + ingresoProductos;

    console.log('💰 Datos a registrar:', {
      ingresoServicio,
      ingresoProductos,
      total,
      empleado: turno.empleado?.nombre,
    });

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

    console.log(`✅ Estadística creada para turno ${turno.id}`);
  }
}

    res.status(200).json({ message: 'Estado actualizado correctamente', turno: turnoActualizado });
  } catch (error) {
    console.error('Error al actualizar turno:', error);
    res.status(500).json({ message: 'Error del servidor al actualizar turno.' });
  }
};

// ===============================
// Cancelar turno (atajo)
// ===============================
export const cancelTurno = async (req: Request, res: Response) => {
  try {
    req.body.estado = 'cancelado';
    return await updateTurnoEstado(req, res);
  } catch (error) {
    console.error('Error al cancelar turno:', error);
    res.status(500).json({ message: 'Error al cancelar turno' });
  }
};
