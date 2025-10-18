import { Request, Response } from "express";
import { prisma } from "../prisma";

// 📦 Obtener todos los productos
export const obtenerProductos = async (_req: Request, res: Response) => {
  try {
    const productos = await prisma.producto.findMany({
      orderBy: { id: "asc" },
    });
    res.json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};

// 📦 Obtener productos con stock disponible
export const obtenerProductosDisponibles = async (_req: Request, res: Response) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { stock: { gt: 0 } },
      orderBy: { nombre: "asc" },
    });
    res.json(productos);
  } catch (error) {
    console.error("Error al obtener productos disponibles:", error);
    res.status(500).json({ message: "Error al obtener productos disponibles" });
  }
};

// 🧩 Crear producto nuevo
export const crearProducto = async (req: Request, res: Response) => {
  const { nombre, descripcion, precio, stock } = req.body;
  try {
    if (stock < 0) {
      return res.status(400).json({ message: "El stock no puede ser negativo" });
    }
    const producto = await prisma.producto.create({
      data: { nombre, descripcion, precio, stock },
    });
    res.status(201).json(producto);
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ message: "Error al crear producto" });
  }
};

// ✏️ Actualizar producto existente
export const actualizarProducto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock } = req.body;
  try {
    const producto = await prisma.producto.update({
      where: { id: Number(id) },
      data: { nombre, descripcion, precio, stock },
    });
    res.json(producto);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ message: "Error al actualizar producto" });
  }
};

// 🗑️ Eliminar producto
export const eliminarProducto = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.producto.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ message: "Error al eliminar producto" });
  }
};
