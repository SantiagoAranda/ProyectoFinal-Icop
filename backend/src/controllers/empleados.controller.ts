import { Request, Response } from 'express';
import { obtenerEmpleados } from '../services/empleados.service';

export const getEmpleados = async (req: Request, res: Response) => {
  try {
    const empleados = await obtenerEmpleados();
    res.status(200).json(empleados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};