import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/compras/proveedor/:id
 * Lista productos de un proveedor (incluye costoCompra para mostrar precios de compra)
 */
router.get("/proveedor/:id", async (req, res) => {
  const proveedorId = Number(req.params.id);
  if (Number.isNaN(proveedorId)) return res.status(400).json({ error: "Proveedor inválido" });

  try {
    const productos = await prisma.producto.findMany({
      where: { proveedorId },
      select: { id: true, nombre: true, stock: true, costoCompra: true },
      orderBy: { nombre: "asc" },
    });
    res.json(productos);
  } catch (error) {
    console.error("Error /proveedor/:id", error);
    res.status(500).json({ error: "Error al obtener productos del proveedor" });
  }
});

/**
 * POST /api/compras
 * Body:
 * {
 *   proveedorId: number,
 *   productos: [{ productoId: number, cantidad: number }]
 * }
 * Efectos:
 * - incrementa stock
 * - crea compra y detalle_compra
 * - registra egreso en EstadisticaTesoreria (total negativo)
 * TODO: asegura todo con transacción
 */
router.post("/", async (req, res) => {
  const { proveedorId, productos } = req.body;

  if (!proveedorId || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: "Datos de compra inválidos" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Traigo todos los productos involucrados
      const ids = productos.map((p: any) => Number(p.productoId));
      const dbProductos = await tx.producto.findMany({
        where: { id: { in: ids } },
        select: { id: true, stock: true, costoCompra: true },
      });

      // Normalizo cantidades y calculo totales
      let total = 0;
      const detallesData: { productoId: number; cantidad: number; subtotal: number }[] = [];

      for (const item of productos) {
        const pid = Number(item.productoId);
        const cant = Math.max(1, Number(item.cantidad) || 0);
        const prod = dbProductos.find((x) => x.id === pid);
        if (!prod) throw new Error(`Producto ${pid} no existe`);

        // si no hay costoCompra, usa 60% del precio de venta como fallback (ideal: tenerlo cargado)
        const costo = prod.costoCompra ?? 0;
        if (!costo || costo <= 0) throw new Error(`Producto ${pid} sin costoCompra definido`);

        const subtotal = costo * cant;
        total += subtotal;

        detallesData.push({ productoId: pid, cantidad: cant, subtotal });

        // actualizo stock
        await tx.producto.update({
          where: { id: pid },
          data: { stock: { increment: cant } },
        });
      }

      // creo compra + detalles
      const compra = await tx.compra.create({
        data: {
          proveedorId: Number(proveedorId),
          total,
          detalles: { create: detallesData },
        },
        include: {
          detalles: { include: { producto: true } },
          proveedor: true,
        },
      });

      // asiento en tesorería (egreso)
      await tx.estadisticaTesoreria.create({
        data: {
          ingresoServicio: 0,
          ingresoProductos: 0,
          total: -total,               // egreso => negativo
          fecha: new Date(),
          turnoId: null,
          empleadoId: null,
          especialidad: "Compra de stock",
        },
      });

      return compra;
    });

    res.status(201).json({ message: "Compra registrada correctamente", compra: result });
  } catch (error: any) {
    console.error("Error al registrar compra:", error);
    const msg = typeof error?.message === "string" ? error.message : "Error al registrar compra";
    res.status(500).json({ error: msg });
  }
});

export default router;
