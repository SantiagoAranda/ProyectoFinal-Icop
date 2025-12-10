import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export const obtenerProductos = async (_req: Request, res: Response) => {
  try {
    const productos = await prisma.producto.findMany({
      orderBy: { id: "asc" },
      include: { proveedor: true },
    });

    // Agregar stockDisponible = stock - stockPendiente
    const productosConDisponibilidad = productos.map((p) => ({
      ...p,
      stockDisponible: p.stock - p.stockPendiente,
    }));

    res.json(productosConDisponibilidad);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};

export const obtenerProductosDisponibles = async (
  _req: Request,
  res: Response
) => {
  try {
    const productos = await prisma.producto.findMany({
      orderBy: { nombre: "asc" },
    });

    // Agregar stockDisponible = stock - stockPendiente
    const productosConDisponibilidad = productos.map((p) => ({
      ...p,
      stockDisponible: p.stock - p.stockPendiente,
    }));

    // Filtrar solo los que tengan stock real disponible
    const disponibles = productosConDisponibilidad.filter(
      (p) => p.stockDisponible > 0
    );

    res.json(disponibles);
  } catch (error) {
    console.error("Error al obtener productos disponibles:", error);
    res
      .status(500)
      .json({ message: "Error al obtener productos disponibles" });
  }
};

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

/* ============================================================
   🔹 Asignar / reasignar proveedor a producto
   - Soporta:
     ▸ PUT  /productos/:id/proveedor  (id en params)
     ▸ POST /productos/asignar-proveedor (id en body.productoId)
============================================================ */
export const asignarProveedorAProducto = async (req: Request, res: Response) => {
  // productoId puede venir por params (PUT) o por body (POST)
  const paramId = Number(req.params.id);
  const bodyId = Number(req.body?.productoId);

  let productoId: number;

  if (Number.isInteger(paramId) && paramId > 0) {
    productoId = paramId;
  } else if (Number.isInteger(bodyId) && bodyId > 0) {
    productoId = bodyId;
  } else {
    return res.status(400).json({ message: "ID de producto inválido" });
  }

  const proveedorId = Number(req.body?.proveedorId);
  const costoCompra = Number(req.body?.costoCompra);

  if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
    return res.status(400).json({ message: "ID de proveedor inválido" });
  }

  if (!Number.isFinite(costoCompra) || costoCompra <= 0) {
    return res
      .status(400)
      .json({ message: "El costo de compra debe ser mayor a 0" });
  }

  try {
    const [producto, proveedor] = await Promise.all([
      prisma.producto.findUnique({ where: { id: productoId } }),
      prisma.proveedor.findUnique({ where: { id: proveedorId } }),
    ]);

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    /* ============================================================
       🔒 Regla opción C:
       - Si el producto YA tiene proveedor distinto:
         → solo ADMIN puede cambiarlo
       - Si no tiene proveedor, o es el mismo:
         → se permite actualizar
    ============================================================ */
    const user = (req as any).user; // viene de authenticateToken si está aplicado

    if (producto.proveedorId && producto.proveedorId !== proveedorId) {
      if (!user || user.role !== "ADMIN") {
        return res.status(403).json({
          message:
            "Solo un administrador puede cambiar el proveedor de un producto que ya tiene uno asignado.",
        });
      }
    }

    const actualizado = await prisma.producto.update({
      where: { id: productoId },
      data: { proveedorId, costoCompra },
      include: { proveedor: true },
    });

    res.json(actualizado);
  } catch (error) {
    console.error("Error al asignar proveedor:", error);
    res
      .status(500)
      .json({ message: "Error al asignar proveedor al producto" });
  }
};

export const quitarProveedorDeProducto = async (
  req: Request,
  res: Response
) => {
  const productoId = Number(req.params.id);

  if (!Number.isInteger(productoId) || productoId <= 0) {
    return res.status(400).json({ message: "ID de producto inválido" });
  }

  try {
    const actualizado = await prisma.producto.update({
      where: { id: productoId },
      data: { proveedorId: null, costoCompra: null },
      include: { proveedor: true },
    });

    res.json(actualizado);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    console.error("Error al quitar proveedor:", error);
    res
      .status(500)
      .json({ message: "Error al quitar proveedor del producto" });
  }
};
