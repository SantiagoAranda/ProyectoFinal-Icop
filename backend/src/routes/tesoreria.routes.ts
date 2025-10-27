import { Router } from "express";
import prisma from "../lib/prisma"; // asegúrate de que esta ruta apunte correctamente a tu PrismaClient

// Crear el router de Express
const router = Router();

// Simulamos egresos fijos mensuales
const EGRESOS_FIJOS = 560000;

// Ruta principal de resumen de tesorería
router.get("/resumen", async (_req, res) => {
  try {
    const turnos = await prisma.turno.findMany({
      include: {
        servicio: true,
        productos: { include: { producto: true } },
      },
    });

    const completados = turnos.filter((t) => t.estado === "completado");
    const cancelados = turnos.filter((t) => t.estado === "cancelado");

    // Ingresos por servicios
    const ingresoServicios = completados.reduce(
      (acc, t) => acc + (t.servicio?.precio ?? 0),
      0
    );

    // Ingresos por productos
    const ingresoProductos = completados.reduce((acc, t) => {
      const subtotal = t.productos.reduce(
        (s, p) => s + p.cantidad * (p.producto?.precio ?? 0),
        0
      );
      return acc + subtotal;
    }, 0);

    const ingresosTotales = ingresoServicios + ingresoProductos;
    const egresosTotales = EGRESOS_FIJOS;
    const gananciaNeta = ingresosTotales - egresosTotales;

    res.json({
      ingresosTotales,
      egresosTotales,
      gananciaNeta,
      completados: completados.length,
      cancelaciones: cancelados.length,
      totalTurnos: turnos.length,
    });
  } catch (error) {
    console.error("Error en /api/tesoreria/resumen:", error);
    res
      .status(500)
      .json({ message: "Error obteniendo estadísticas de tesorería" });
  }
});

// Exportar el router
export default router;
