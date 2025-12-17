import { Request, Response } from "express";
import { prisma } from "../prisma";

/**
 * Helpers
 */
const computeStockDisponible = (stock: number, stockPendiente?: number | null) =>
  stock - (stockPendiente ?? 0);

const isValidId = (n: number) => Number.isFinite(n) && n > 0;

const normalizeString = (v: unknown) => String(v ?? "").trim();

/**
 * Obtener todos los productos con stockDisponible calculado
 */
export const obtenerProductos = async (_req: Request, res: Response) => {
  try {
    const productos = await prisma.producto.findMany({
      include: { proveedor: true },
      orderBy: { nombre: "asc" },
    });

    const productosConDisponible = productos.map((p) => ({
      ...p,
      stockDisponible: computeStockDisponible(p.stock, p.stockPendiente),
    }));

    return res.status(200).json(productosConDisponible);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return res.status(500).json({ message: "Error del servidor al obtener productos" });
  }
};

/**
 * Crear un nuevo producto
 */
export const crearProducto = async (req: Request, res: Response) => {
  try {
    const nombre = normalizeString(req.body?.nombre);
    const descripcion = normalizeString(req.body?.descripcion);
    const precioRaw = req.body?.precio;
    const stockRaw = req.body?.stock;

    if (!nombre || !descripcion || precioRaw === undefined || stockRaw === undefined) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const precioNum = Number(precioRaw);
    const stockNum = Number(stockRaw);

    if (!Number.isFinite(precioNum) || precioNum <= 0) {
      return res.status(400).json({ message: "El precio debe ser mayor a 0" });
    }

    if (!Number.isInteger(stockNum) || stockNum < 0) {
      return res.status(400).json({ message: "El stock debe ser un número entero no negativo" });
    }

    const nuevoProducto = await prisma.producto.create({
      data: {
        nombre,
        descripcion,
        precio: precioNum,
        stock: stockNum,
        stockPendiente: 0,
      },
      include: { proveedor: true },
    });

    return res.status(201).json({
      message: "Producto creado exitosamente",
      producto: {
        ...nuevoProducto,
        stockDisponible: computeStockDisponible(nuevoProducto.stock, nuevoProducto.stockPendiente),
      },
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    return res.status(500).json({ message: "Error del servidor al crear producto" });
  }
};

/**
 * Actualizar un producto existente
 */
export const actualizarProducto = async (req: Request, res: Response) => {
  try {
    const productoId = Number(req.params.id);
    if (!isValidId(productoId)) {
      return res.status(400).json({ message: "ID de producto inválido" });
    }

    const productoExistente = await prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!productoExistente) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const updateData: any = {};

    if (req.body?.nombre !== undefined) {
      const nombre = normalizeString(req.body.nombre);
      if (!nombre) return res.status(400).json({ message: "El nombre no puede estar vacío" });
      updateData.nombre = nombre;
    }

    if (req.body?.descripcion !== undefined) {
      const descripcion = normalizeString(req.body.descripcion);
      if (!descripcion) return res.status(400).json({ message: "La descripción no puede estar vacía" });
      updateData.descripcion = descripcion;
    }

    if (req.body?.precio !== undefined) {
      const precioNum = Number(req.body.precio);
      if (!Number.isFinite(precioNum) || precioNum <= 0) {
        return res.status(400).json({ message: "El precio debe ser mayor a 0" });
      }
      updateData.precio = precioNum;
    }

    if (req.body?.stock !== undefined) {
      const stockNum = Number(req.body.stock);
      if (!Number.isInteger(stockNum) || stockNum < 0) {
        return res.status(400).json({ message: "El stock debe ser un número entero no negativo" });
      }

      const stockPendiente = productoExistente.stockPendiente ?? 0;
      if (stockNum < stockPendiente) {
        return res.status(400).json({
          message: `El stock no puede ser menor que los productos reservados (${stockPendiente})`,
        });
      }

      updateData.stock = stockNum;
    }

    const productoActualizado = await prisma.producto.update({
      where: { id: productoId },
      data: updateData,
      include: { proveedor: true },
    });

    return res.status(200).json({
      message: "Producto actualizado exitosamente",
      producto: {
        ...productoActualizado,
        stockDisponible: computeStockDisponible(productoActualizado.stock, productoActualizado.stockPendiente),
      },
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return res.status(500).json({ message: "Error del servidor al actualizar producto" });
  }
};

/**
 * Eliminar un producto
 */
export const eliminarProducto = async (req: Request, res: Response) => {
  try {
    const productoId = Number(req.params.id);
    if (!isValidId(productoId)) {
      return res.status(400).json({ message: "ID de producto inválido" });
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true, stockPendiente: true },
    });

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    if ((producto.stockPendiente ?? 0) > 0) {
      return res.status(400).json({
        message: "No se puede eliminar un producto con stock reservado en turnos pendientes",
      });
    }

    await prisma.producto.delete({ where: { id: productoId } });

    return res.status(200).json({ message: "Producto eliminado exitosamente" });
  } catch (error: any) {
    console.error("Error al eliminar producto:", error);

    // Opcional: mejorar mensaje si falla por FK/relaciones
    // Prisma: P2003 => foreign key constraint failed
    if (error?.code === "P2003") {
      return res.status(409).json({
        message: "No se puede eliminar el producto porque tiene relaciones asociadas.",
      });
    }

    return res.status(500).json({ message: "Error del servidor al eliminar producto" });
  }
};

/**
 * Asignar o cambiar proveedor a un producto
 * Soporta:
 * - PUT /productos/:id/proveedor con proveedorId en body
 * - POST /productos/asignar-proveedor con productoId y proveedorId en body
 */
export const asignarProveedorAProducto = async (req: Request, res: Response) => {
  try {
    const idParam = req.params?.id;
    const bodyProductoId = req.body?.productoId;
    const bodyProveedorId = req.body?.proveedorId;
    const bodyCostoCompra = req.body?.costoCompra;

    const idProducto = idParam ? Number(idParam) : Number(bodyProductoId);
    const idProveedor = Number(bodyProveedorId);

    if (!isValidId(idProducto) || !isValidId(idProveedor)) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const [producto, proveedor] = await Promise.all([
      prisma.producto.findUnique({ where: { id: idProducto } }),
      prisma.proveedor.findUnique({ where: { id: idProveedor } }),
    ]);

    if (!producto) return res.status(404).json({ message: "Producto no encontrado" });
    if (!proveedor) return res.status(404).json({ message: "Proveedor no encontrado" });

    // Validar costoCompra: en tu front es obligatorio, pero acá lo dejamos opcional
    let costoCompraValido: number | undefined;
    if (bodyCostoCompra !== undefined && bodyCostoCompra !== null && bodyCostoCompra !== "") {
      const costoNum = Number(bodyCostoCompra);
      if (!Number.isFinite(costoNum) || costoNum <= 0) {
        return res.status(400).json({ message: "El costo de compra debe ser mayor a 0" });
      }
      costoCompraValido = costoNum;
    }

    const dataToUpdate: any = { proveedorId: idProveedor };
    if (costoCompraValido !== undefined) dataToUpdate.costoCompra = costoCompraValido;

    const productoActualizado = await prisma.producto.update({
      where: { id: idProducto },
      data: dataToUpdate,
      include: { proveedor: true },
    });

    return res.status(200).json({
      message: "Proveedor asignado exitosamente",
      producto: {
        ...productoActualizado,
        stockDisponible: computeStockDisponible(productoActualizado.stock, productoActualizado.stockPendiente),
      },
    });
  } catch (error) {
    console.error("Error al asignar proveedor:", error);
    return res.status(500).json({ message: "Error del servidor al asignar proveedor" });
  }
};

/**
 * Quitar proveedor de un producto
 */
export const quitarProveedorDeProducto = async (req: Request, res: Response) => {
  try {
    const productoId = Number(req.params.id);
    if (!isValidId(productoId)) {
      return res.status(400).json({ message: "ID de producto inválido" });
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const productoActualizado = await prisma.producto.update({
      where: { id: productoId },
      data: { proveedorId: null, costoCompra: null },
      include: { proveedor: true },
    });

    return res.status(200).json({
      message: "Proveedor removido exitosamente",
      producto: {
        ...productoActualizado,
        stockDisponible: computeStockDisponible(productoActualizado.stock, productoActualizado.stockPendiente),
      },
    });
  } catch (error) {
    console.error("Error al quitar proveedor:", error);
    return res.status(500).json({ message: "Error del servidor al quitar proveedor" });
  }
};
