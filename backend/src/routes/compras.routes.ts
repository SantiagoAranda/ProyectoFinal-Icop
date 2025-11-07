import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Crear una nueva compra (renovar stock)
router.post("/", async (req, res) => {
  try {
    const { proveedorId, productos } = req.body;
    // productos = [{ productoId, cantidad }]

    if (!proveedorId || !Array.isArray(productos)) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // Obtener precios de compra de los productos
    const productosDB = await prisma.producto.findMany({
      where: { id: { in: productos.map((p) => p.productoId) } },
      select: { id: true, costoCompra: true },
    });

    // Calcular totales
    const detalles = productos.map((p) => {
      const productoData = productosDB.find((pd) => pd.id === p.productoId);
      const subtotal = (productoData?.costoCompra ?? 0) * p.cantidad;
      return { ...p, subtotal };
    });

    const totalCompra = detalles.reduce((acc, d) => acc + d.subtotal, 0);

    // Crear la compra y los detalles
    const compra = await prisma.compra.create({
      data: {
        proveedorId,
        total: totalCompra,
        detalles: { create: detalles },
      },
      include: { detalles: true },
    });

    // Actualizar el stock de cada producto
    for (const d of detalles) {
      await prisma.producto.update({
        where: { id: d.productoId },
        data: { stock: { increment: d.cantidad } },
      });
    }

    // Registrar egreso en tesorería
    await prisma.estadisticaTesoreria.create({
      data: {
        ingresoServicio: 0,
        ingresoProductos: 0,
        total: -totalCompra, // 🔹 negativo = egreso
        fecha: new Date(),
        especialidad: "Compra de productos",
      },
    });

    res.status(201).json({ message: "Compra registrada con éxito", compra });
  } catch (error) {
    console.error("Error al registrar compra:", error);
    res.status(500).json({ error: "Error al registrar la compra" });
  }
});

// Obtener todas las compras con proveedor y detalles
router.get("/", async (req, res) => {
  try {
    const compras = await prisma.compra.findMany({
      include: {
        proveedor: true,
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { fecha: "desc" },
    });
    res.json(compras);
  } catch (error) {
    console.error("Error al obtener compras:", error);
    res.status(500).json({ error: "Error al obtener compras" });
  }
});

export default router;
