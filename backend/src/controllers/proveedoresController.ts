import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const listarProveedores = async (_req: Request, res: Response) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    });
    res.json(proveedores);
  } catch (error) {
    console.error("Error al listar proveedores:", error);
    res.status(500).json({ message: "Error al obtener proveedores" });
  }
};

export const obtenerProveedor = async (req: Request, res: Response) => {
  const proveedorId = parseId(req.params.id);
  if (!proveedorId) {
    return res.status(400).json({ message: "ID de proveedor inválido" });
  }

  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: proveedorId },
      include: {
        productos: {
          select: {
            id: true,
            nombre: true,
            precio: true,
            costoCompra: true,
            proveedorId: true,
          },
          orderBy: { nombre: "asc" },
        },
        _count: { select: { productos: true } },
      },
    });

    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    res.json(proveedor);
  } catch (error) {
    console.error("Error al obtener proveedor:", error);
    res.status(500).json({ message: "Error al obtener proveedor" });
  }
};

export const crearProveedor = async (req: Request, res: Response) => {
  const { nombre, telefono, email, direccion, notas } = req.body;

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  try {
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: String(nombre).trim(),
        telefono: telefono ? String(telefono).trim() : undefined,
        email: email ? String(email).trim() : undefined,
        direccion: direccion ? String(direccion).trim() : undefined,
        notas: notas ? String(notas).trim() : undefined,
      },
    });

    res.status(201).json(proveedor);
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    res.status(500).json({ message: "Error al crear proveedor" });
  }
};

export const actualizarProveedor = async (req: Request, res: Response) => {
  const proveedorId = parseId(req.params.id);
  if (!proveedorId) {
    return res.status(400).json({ message: "ID de proveedor inválido" });
  }

  const { nombre, telefono, email, direccion, notas } = req.body;

  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  try {
    const proveedor = await prisma.proveedor.update({
      where: { id: proveedorId },
      data: {
        nombre: String(nombre).trim(),
        telefono: telefono ? String(telefono).trim() : null,
        email: email ? String(email).trim() : null,
        direccion: direccion ? String(direccion).trim() : null,
        notas: notas ? String(notas).trim() : null,
      },
    });

    res.json(proveedor);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    console.error("Error al actualizar proveedor:", error);
    res.status(500).json({ message: "Error al actualizar proveedor" });
  }
};

export const eliminarProveedor = async (req: Request, res: Response) => {
  const proveedorId = parseId(req.params.id);
  if (!proveedorId) {
    return res.status(400).json({ message: "ID de proveedor inválido" });
  }

  try {
    await prisma.proveedor.delete({ where: { id: proveedorId } });
    res.json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Proveedor no encontrado" });
      }
      if (error.code === "P2003") {
        return res.status(400).json({
          message:
            "No se puede eliminar el proveedor porque tiene productos, compras o pagos asociados.",
        });
      }
    }

    console.error("Error al eliminar proveedor:", error);
    res.status(500).json({ message: "Error al eliminar proveedor" });
  }
};
