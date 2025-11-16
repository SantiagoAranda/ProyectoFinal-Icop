import { Request, Response } from "express";
import { prisma } from "../prisma";

/* =====================================
   REGISTRAR VENTA FÍSICA
===================================== */
export const registrarVentaFisica = async (req: Request, res: Response) => {
  try {
    const logged = (req as any).user;

    // Solo ADMIN puede registrar ventas
    if (!logged || logged.role !== "ADMIN") {
      return res.status(403).json({ message: "No autorizado" });
    }

    const { productos } = req.body;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ message: "Debe enviar productos." });
    }

    let totalVenta = 0;

    // Validar stock antes de descontar
    for (const vp of productos) {
      const prod = await prisma.producto.findUnique({
        where: { id: vp.productoId },
      });

      if (!prod) {
        return res.status(404).json({
          message: `Producto con ID ${vp.productoId} no existe.`,
        });
      }

      const disponible = prod.stock - prod.stockPendiente;

      if (vp.cantidad > disponible) {
        return res.status(400).json({
          message: `Stock insuficiente para ${prod.nombre}. Disponible: ${disponible}`,
        });
      }

      totalVenta += prod.precio * vp.cantidad;
    }

    // Descontar stock real
    for (const vp of productos) {
      await prisma.producto.update({
        where: { id: vp.productoId },
        data: {
          stock: { decrement: vp.cantidad },
        },
      });
    }

    // =============================
    //  Registrar ingreso Tesorería
    // =============================
    await prisma.estadisticaTesoreria.create({
      data: {
        ingresoServicio: 0,
        ingresoProductos: totalVenta,
        total: totalVenta,
        turnoId: null,
        empleadoId: null,
        especialidad: "VENTA FÍSICA",
      },
    });

    return res.status(201).json({
      message: "Venta física registrada correctamente",
      totalVenta,
    });

  } catch (error) {
    console.error("Error registrando venta física:", error);
    return res.status(500).json({
      message: "Error del servidor al registrar venta",
    });
  }
};
