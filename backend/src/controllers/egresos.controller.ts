import { Request, Response } from "express";
import { prisma } from "../prisma";

/**
 * 🔹 Obtener todos los egresos fijos (del mes actual o histórico)
 */
export const getEgresos = async (_req: Request, res: Response) => {
  try {
    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const anioActual = ahora.getFullYear();

    const egresos = await prisma.egresoFijo.findMany({
      where: { mes: mesActual, anio: anioActual },
      orderBy: { categoria: "asc" },
    });

    res.status(200).json(egresos);
  } catch (error) {
    console.error("Error al obtener egresos fijos:", error);
    res.status(500).json({ message: "Error al obtener egresos fijos" });
  }
};

/**
 * 🔹 Crear o actualizar un egreso fijo
 * Si ya existe (por mes/año/categoría), lo actualiza.
 */
export const upsertEgreso = async (req: Request, res: Response) => {
  try {
    const { categoria, monto } = req.body;
    if (!categoria || monto == null) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const anioActual = ahora.getFullYear();

    const egreso = await prisma.egresoFijo.upsert({
      where: {
        categoria_mes_anio: {
          categoria,
          mes: mesActual,
          anio: anioActual,
        },
      },
      update: {
        monto: Number(monto),
        updatedAt: new Date(),
      },
      create: {
        categoria,
        monto: Number(monto),
        mes: mesActual,
        anio: anioActual,
        creadoPor: "admin",
      },
    });

    res.status(200).json(egreso);
  } catch (error) {
    console.error("Error al registrar egreso fijo:", error);
    res.status(500).json({ message: "Error al registrar egreso fijo" });
  }
};

/**
 * 🔹 Eliminar un egreso fijo
 */
export const deleteEgreso = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.egresoFijo.delete({ where: { id: Number(id) } });
    res.status(200).json({ message: "Egreso eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar egreso fijo:", error);
    res.status(500).json({ message: "Error al eliminar egreso fijo" });
  }
};
