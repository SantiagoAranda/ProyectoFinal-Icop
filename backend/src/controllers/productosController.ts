import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const crearProducto = async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, precio, stock, categoria } = req.body;

    // validaciones
    if (!nombre || !precio || !stock) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const nuevoProducto = await prisma.producto.create({
      data: {
        nombre,
        descripcion,
        precio,
        stock,
        categoria,
      },
    });

    console.log('📩 Producto creado:', nuevoProducto);
    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const obtenerProductos = async (req: Request, res: Response) => {
  try {
    const productos = await prisma.producto.findMany();
    res.status(200).json(productos);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).json({ message: 'Error del servidor al listar productos' });
  }
};
