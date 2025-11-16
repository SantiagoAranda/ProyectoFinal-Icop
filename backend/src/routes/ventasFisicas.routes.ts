console.log("💥 CARGANDO RUTA ventas-fisicas");
import { Router } from "express";
import { prisma } from "../prisma";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/", authenticateToken, async (req, res) => {
    console.log("🔥 ENTRÓ A /api/ventas-fisicas POST");
    console.log("Body recibido:", req.body);
    try {
    console.log("➡️ Venta física recibida:", req.body);

    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      console.log("❌ No hay productos en la venta");
      return res.status(400).json({ message: "No hay productos en la venta." });
    }

    let totalVenta = 0;

    // Validar stock y calcular total
    for (const p of productos) {
      const prod = await prisma.producto.findUnique({
        where: { id: p.productoId },
      });

      if (!prod) {
        console.log("❌ Producto inválido", p.productoId);
        return res.status(404).json({ message: `Producto inválido.` });
      }

      const disponible = prod.stock - prod.stockPendiente;

      if (p.cantidad > disponible) {
        console.log("❌ Stock insuficiente", prod.nombre);
        return res
          .status(400)
          .json({ message: `Stock insuficiente para ${prod.nombre}.` });
      }

      totalVenta += prod.precio * p.cantidad;
    }

    console.log("💰 Total venta calculado:", totalVenta);

    // Actualizar stock
    for (const p of productos) {
      await prisma.producto.update({
        where: { id: p.productoId },
        data: { stock: { decrement: p.cantidad } },
      });
    }

    console.log("📦 Stock actualizado OK");

    // Registrar en tesorería
    const registro = await prisma.estadisticaTesoreria.create({
      data: {
        ingresoServicio: 0,
        ingresoProductos: totalVenta,
        total: totalVenta,
        turnoId: null,
        empleadoId: null,
        especialidad: "Venta física",
      },
    });

    console.log("🟢 REGISTRO CREADO:", registro);

    return res.status(200).json({
      message: "Venta física registrada.",
      totalVenta,
    });

  } catch (error) {
    console.error("🔥 ERROR en venta física:", error);
    return res.status(500).json({ message: "Error al procesar la venta." });
  }
});

export default router;
