import { Request, Response } from 'express';
import { prisma } from '../prisma';

// Obtener todos los turnos (admin o para estadísticas)
export const getAllTurnos = async (_req: Request, res: Response) => {
  try {
    const turnos = await prisma.turno.findMany({
      include: {
        cliente: true,
        empleado: true,
        servicio: true,
        productos: {
          include: { producto: true },
        },
      },
    });
    res.status(200).json(turnos);
  } catch (error) {
    console.error('Error al obtener turnos:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Crear un nuevo turno (cliente logueado)
export const createTurno = async (req: Request, res: Response) => {
  const { fechaHora, empleadoId, servicioId, productos } = req.body;
  const clienteId = (req as any).user?.userId;

  if (!fechaHora || !empleadoId || !servicioId || !clienteId) {
    return res.status(400).json({ message: 'Faltan datos obligatorios.' });
  }

  try {
    // Validar horario
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

    // Si hay productos, validar stock disponible
    if (Array.isArray(productos) && productos.length > 0) {
      for (const p of productos) {
        const producto = await prisma.producto.findUnique({ where: { id: p.productoId } });
        if (!producto) {
          return res.status(404).json({ message: `Producto con ID ${p.productoId} no existe.` });
        }
        if (producto.stock < p.cantidad) {
          return res.status(400).json({
            message: `Stock insuficiente para ${producto.nombre}. Stock actual: ${producto.stock}`,
          });
        }
      }
    }

    // Crear el turno principal
    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaHora: fechaSeleccionada,
        estado: 'reservado',
        empleado: { connect: { id: empleadoId } },
        servicio: { connect: { id: servicioId } },
        cliente: { connect: { id: clienteId } },
      },
    });

    // Insertar productos y actualizar stock
    if (Array.isArray(productos) && productos.length > 0) {
      const operaciones = productos.map(async (p) => {
        await prisma.turnoProducto.create({
          data: {
            turnoId: nuevoTurno.id,
            productoId: p.productoId,
            cantidad: p.cantidad || 1,
          },
        });

        // Actualizar stock
        await prisma.producto.update({
          where: { id: p.productoId },
          data: { stock: { decrement: p.cantidad || 1 } },
        });
      });

      await Promise.all(operaciones);
    }

    return res.status(201).json({
      message: 'Turno creado exitosamente',
      turno: nuevoTurno,
    });
  } catch (error) {
    console.error('Error al crear turno:', error);
    return res.status(500).json({ message: 'Error del servidor al crear turno.' });
  }
};

// Cancelar un turno (por ID)
export const cancelTurno = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.turno.update({
      where: { id: Number(id) },
      data: { estado: 'cancelado' },
    });

    res.status(200).json({ message: 'Turno cancelado exitosamente' });
  } catch (error) {
    console.error('Error al cancelar turno:', error);
    res.status(500).json({ message: 'Error del servidor al cancelar turno' });
  }
};
