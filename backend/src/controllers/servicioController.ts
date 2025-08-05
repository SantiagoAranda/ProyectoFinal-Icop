import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const crearServicio = async (req: Request, res: Response) => {
  const { nombre, descripcion, precio, duracion } = req.body;

  if (!nombre || !descripcion || !precio || !duracion) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    const nuevoServicio = await prisma.servicio.create({
      data: {
        nombre,
        descripcion,
        precio,
        duracion
      }
    });

    res.status(201).json({
      message: 'Servicio creado exitosamente',
      servicio: nuevoServicio
    });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ message: 'Error del servidor al crear servicio' });
  }
};
