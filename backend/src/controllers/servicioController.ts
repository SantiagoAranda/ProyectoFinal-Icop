import { Request, Response } from "express";
import { prisma } from "../prisma";

export const obtenerServicios = async (_req: Request, res: Response) => {
  try {
    const servicios = await prisma.servicio.findMany();
    res.json(servicios);
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    res.status(500).json({ message: "Error al obtener servicios" });
  }
};

export const crearServicio = async (req: Request, res: Response) => {
  const { nombre, descripcion, precio, duracion } = req.body;
  try {
    const servicio = await prisma.servicio.create({
      data: { nombre, descripcion, precio, duracion },
    });
    res.status(201).json(servicio);
  } catch (error) {
    console.error("Error al crear servicio:", error);
    res.status(500).json({ message: "Error al crear servicio" });
  }
};

export const actualizarServicio = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, duracion } = req.body;
  try {
    const servicio = await prisma.servicio.update({
      where: { id: Number(id) },
      data: { nombre, descripcion, precio, duracion },
    });
    res.json(servicio);
  } catch (error) {
    console.error("Error al actualizar servicio:", error);
    res.status(500).json({ message: "Error al actualizar servicio" });
  }
};

export const eliminarServicio = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.servicio.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Servicio eliminado" });
  } catch (error) {
    console.error("Error al eliminar servicio:", error);
    res.status(500).json({ message: "Error al eliminar servicio" });
  }
};
