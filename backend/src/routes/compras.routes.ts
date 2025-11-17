import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/* ============================================================
   GET /api/compras
   → Historial paginado de compras
   Query params:
   - page (número de página, default: 1)
   - pageSize (default: 10)
   ============================================================ */
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;

    if (page <= 0 || pageSize <= 0) {
      return res
        .status(400)
        .json({ error: "page y pageSize deben ser mayores a 0." });
    }

    const skip = (page - 1) * pageSize;

    // Obtener total de compras
    const totalItems = await prisma.compra.count();
    const totalPages = Math.ceil(totalItems / pageSize);

    // Obtener compras paginadas
    const compras = await prisma.compra.findMany({
      skip,
      take: pageSize,
      orderBy: { fecha: "desc" },
      include: {
        proveedor: true,
        detalles: {
          include: { producto: true },
        },
      },
    });

    return res.json({
      data: compras,
      totalItems,
      totalPages,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error GET /api/compras:", error);
    res.status(500).json({ error: "Error al obtener historial de compras." });
  }
});

/* ============================================================
   GET /api/compras/proveedor/:id
   → Lista productos del proveedor para comprar
   ============================================================ */
router.get("/proveedor/:id", async (req, res) => {
  const proveedorId = Number(req.params.id);
  if (Number.isNaN(proveedorId))
    return res.status(400).json({ error: "Proveedor inválido" });

  try {
    const productos = await prisma.producto.findMany({
      where: { proveedorId },
      select: { id: true, nombre: true, stock: true, costoCompra: true },
      orderBy: { nombre: "asc" },
    });
    res.json(productos);
  } catch (error) {
    console.error("Error GET proveedor productos:", error);
    res
      .status(500)
      .json({ error: "Error al obtener productos del proveedor." });
  }
});

/* ============================================================
   POST /api/compras
   → Registrar compra + detalle + entrada de stock + egreso
   ============================================================ */
router.post("/", async (req, res) => {
  const { proveedorId, productos } = req.body;

  if (!proveedorId || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: "Datos de compra inválidos" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ids = productos.map((p: any) => Number(p.productoId));

      const dbProductos = await tx.producto.findMany({
        where: { id: { in: ids } },
        select: { id: true, stock: true, costoCompra: true },
      });

      if (dbProductos.length !== ids.length) {
        throw new Error("Uno o más productos no existen.");
      }

      let total = 0;
      const detallesData: {
        productoId: number;
        cantidad: number;
        subtotal: number;
      }[] = [];

      for (const item of productos) {
        const pid = Number(item.productoId);
        const cantidad = Math.max(1, Number(item.cantidad) || 0);

        const prod = dbProductos.find((p) => p.id === pid);
        if (!prod)
          throw new Error(`Producto ${pid} no existe en la base de datos.`);

        const costo = prod.costoCompra;
        if (!costo || costo <= 0) {
          throw new Error(
            `Producto ${pid} no tiene costoCompra definido.`
          );
        }

        const subtotal = costo * cantidad;
        total += subtotal;

        detallesData.push({ productoId: pid, cantidad, subtotal });

        // actualizar stock
        await tx.producto.update({
          where: { id: pid },
          data: { stock: { increment: cantidad } },
        });
      }

      // crear compra y detalles
      const compra = await tx.compra.create({
        data: {
          proveedorId: Number(proveedorId),
          total,
          detalles: { create: detallesData },
        },
        include: {
          proveedor: true,
          detalles: { include: { producto: true } },
        },
      });

      // crear registro de egreso en tesorería
      await tx.estadisticaTesoreria.create({
        data: {
          ingresoServicio: 0,
          ingresoProductos: 0,
          total: -total, // egreso
          especialidad: "Compra de stock",
        },
      });

      return compra;
    });

    return res.status(201).json({
      message: "Compra registrada correctamente",
      compra: result,
    });
  } catch (error: any) {
    console.error("Error POST /api/compras:", error);
    res.status(500).json({
      error: error?.message || "Error al registrar compra.",
    });
  }
});

export default router;
