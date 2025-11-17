console.log("💥 CARGANDO RUTA ventas-fisicas");

import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

/* ============================================================
   🟣 POST /api/ventas-fisicas → Registrar venta física completa
============================================================ */
router.post("/", authenticateToken, async (req, res) => {
  console.log("🔥 ENTRÓ A /api/ventas-fisicas POST");
  try {
    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ message: "No hay productos en la venta." });
    }

    let totalVenta = 0;

    // VALIDAR STOCK Y ARMAR LISTA DE PRODUCTOS VENDIDOS
    const productosConNombre = await Promise.all(
      productos.map(async (p: any) => {
        const prod = await prisma.producto.findUnique({
          where: { id: p.productoId },
        });

        if (!prod) {
          throw new Error(`Producto con ID ${p.productoId} no existe.`);
        }

        const disponible = prod.stock - (prod.stockPendiente ?? 0);
        if (p.cantidad > disponible) {
          throw new Error(
            `Stock insuficiente para ${prod.nombre}. Disponible: ${disponible}`
          );
        }

        totalVenta += prod.precio * p.cantidad;

        return {
          productoId: p.productoId,
          nombre: prod.nombre,
          cantidad: p.cantidad,
          precioUnitario: prod.precio,
        };
      })
    );

    console.log("💰 Total venta calculado:", totalVenta);

    // DESCONTAR STOCK
    for (const p of productos) {
      await prisma.producto.update({
        where: { id: p.productoId },
        data: { stock: { decrement: p.cantidad } },
      });
    }

    console.log("📦 Stock actualizado OK");

    // REGISTRAR EN TESORERÍA
    const registro = await prisma.estadisticaTesoreria.create({
      data: {
        ingresoServicio: 0,
        ingresoProductos: totalVenta,
        total: totalVenta,
        turnoId: null,
        empleadoId: null,
        especialidad: "VENTA FÍSICA",
        productosVendidos: productosConNombre, // JSON guardado
      },
    });

    console.log("🟢 REGISTRO CREADO:", registro);

    return res.status(200).json({
      message: "Venta física registrada.",
      totalVenta,
      registro,
    });

  } catch (error: any) {
    console.error("🔥 ERROR en venta física:", error);
    return res.status(500).json({ message: error.message });
  }
});

/* ============================================================
   🟣 GET /api/ventas-fisicas/historial → Obtener historial
============================================================ */
router.get("/historial", authenticateToken, async (_req, res) => {
  try {
    const ventas = await prisma.estadisticaTesoreria.findMany({
      where: {
        especialidad: {
          contains: "venta fisica",
          mode: "insensitive",
        },
      },
      orderBy: { fecha: "desc" },
    });

    return res.json(ventas);
  } catch (error) {
    console.error("🔥 ERROR obteniendo historial de ventas físicas:", error);
    return res.status(500).json({ message: "Error al obtener historial" });
  }
});

export default router;
