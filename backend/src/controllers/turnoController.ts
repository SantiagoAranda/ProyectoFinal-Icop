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
  const { fechaHora, empleadoId, servicioId } = req.body;
  const clienteId = (req as any).user?.userId;

  if (!fechaHora || !empleadoId || !servicioId || !clienteId) {
    return res.status(400).json({ message: 'Faltan datos obligatorios.' });
  }

  try {
    const nuevoTurno = await prisma.turno.create({
      data: {
        fechaHora: new Date(fechaHora),
        estado: 'reservado',
        empleado: { connect: { id: empleadoId } },
        servicio: { connect: { id: servicioId } },
        cliente: { connect: { id: clienteId } },
      },
    });

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
