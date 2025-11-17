import { Request, Response } from "express";
import { prisma } from "../prisma";

/* =====================================
   REGISTRAR VENTA FÍSICA (VERSIÓN COMPLETA)
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

    // VALIDAR Y OBTENER NOMBRE DE CADA PRODUCTO
    const productosConNombre = await Promise.all(
      productos.map(async (vp: any) => {
        const prod = await prisma.producto.findUnique({
          where: { id: vp.productoId },
        });

        if (!prod) {
          throw new Error(`Producto con ID ${vp.productoId} no existe.`);
        }

        const disponible = prod.stock - (prod.stockPendiente ?? 0);

        if (vp.cantidad > disponible) {
          throw new Error(
            `Stock insuficiente para ${prod.nombre}. Disponible: ${disponible}`
          );
        }

        totalVenta += prod.precio * vp.cantidad;

        return {
          productoId: vp.productoId,
          nombre: prod.nombre,
          cantidad: vp.cantidad,
          precioUnitario: prod.precio,
        };
      })
    );

    // DESCONTAR STOCK REAL
    for (const vp of productos) {
      await prisma.producto.update({
        where: { id: vp.productoId },
        data: {
          stock: { decrement: vp.cantidad },
        },
      });
    }

    // GUARDAR EN ESTADISTICA TESORERÍA
    const registro = await prisma.estadisticaTesoreria.create({
      data: {
        ingresoServicio: 0,
        ingresoProductos: totalVenta,
        total: totalVenta,
        turnoId: null,
        empleadoId: null,
        especialidad: "VENTA FÍSICA",
        productosVendidos: productosConNombre, // 🔥 LISTA COMPLETA DE PRODUCTOS
      },
    });

    return res.status(201).json({
      message: "Venta física registrada correctamente",
      totalVenta,
      registro,
    });

  } catch (error: any) {
    console.error("Error registrando venta física:", error);
    return res.status(500).json({
      message: error.message || "Error del servidor al registrar venta",
    });
  }
};
