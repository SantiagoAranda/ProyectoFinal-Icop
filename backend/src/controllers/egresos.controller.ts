import { Request, Response } from "express";
import { prisma } from "../prisma";

const CATEGORIAS_PERMITIDAS = [
  "Servicios",
  "Sueldos",
  "Alquiler",
  "Administrativo",
  "Otros",
] as const;

type CategoriaPermitida = (typeof CATEGORIAS_PERMITIDAS)[number];

const parsePeriodo = (mesParam: any, anioParam: any) => {
  const hoy = new Date();
  const mes = mesParam ? Number(mesParam) : hoy.getMonth() + 1;
  const anio = anioParam ? Number(anioParam) : hoy.getFullYear();

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw { status: 400, message: "El mes debe estar entre 1 y 12." };
  }

  if (!Number.isInteger(anio) || anio < 2020 || anio > 3000) {
    throw { status: 400, message: "El año es inválido." };
  }

  return { mes, anio };
};

const montoValido = (valor: any) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0;
};

/**
 * Obtener egresos filtrados por mes/año
 */
export const getEgresos = async (req: Request, res: Response) => {
  try {
    const { mes, anio } = parsePeriodo(req.query.mes, req.query.anio);

    const egresos = await prisma.egresoFijo.findMany({
      where: { mes, anio },
      orderBy: [{ categoria: "asc" }, { subcategoria: "asc" }, { id: "asc" }],
    });

    res.status(200).json(egresos);
  } catch (error: any) {
    console.error("Error al obtener egresos fijos:", error);
    res
      .status(error?.status ?? 500)
      .json({ message: error?.message ?? "Error al obtener egresos fijos" });
  }
};

/**
 * Crear o actualizar egresos según categoría.
 */
export const upsertEgreso = async (req: Request, res: Response) => {
  try {
    const categoria = (req.body?.categoria ?? "").toString().trim() as CategoriaPermitida;
    if (!CATEGORIAS_PERMITIDAS.includes(categoria)) {
      return res.status(400).json({ message: "Categoría inválida." });
    }

    const { mes, anio } = parsePeriodo(req.body?.mes, req.body?.anio);

    if (categoria === "Servicios") {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!items.length) {
        return res
          .status(400)
          .json({ message: "Debe enviar al menos una subcategoría de Servicios." });
      }

      const lineasValidadas = items.map((item: any, index: number) => {
        const subcategoria = (item?.subcategoria ?? "").toString().trim();
        const nota = (item?.nota ?? "").toString().trim();
        if (!subcategoria) {
          throw {
            status: 400,
            message: `La subcategoría es obligatoria (línea ${index + 1}).`,
          };
        }
        if (!montoValido(item?.monto)) {
          throw {
            status: 400,
            message: `El monto debe ser mayor a 0 en "${subcategoria}".`,
          };
        }
        return {
          subcategoria,
          nota: nota || null,
          monto: Number(item.monto),
        };
      });

      const creados = await prisma.$transaction(async (tx) => {
        await tx.egresoFijo.deleteMany({ where: { categoria, mes, anio } });

        const nuevos: any[] = [];
        for (const linea of lineasValidadas) {
          const creado = await tx.egresoFijo.create({
            data: {
              categoria,
              mes,
              anio,
              subcategoria: linea.subcategoria,
              nota: linea.nota,
              monto: linea.monto,
            },
          });
          nuevos.push(creado);
        }
        return nuevos;
      });

      return res.status(200).json(creados);
    }

    const monto = Number(req.body?.monto);
    if (!montoValido(monto)) {
      return res.status(400).json({ message: "El monto debe ser mayor a 0." });
    }

    const nota = (req.body?.nota ?? "").toString().trim();

    if (categoria === "Otros") {
      if (!nota) {
        return res
          .status(400)
          .json({ message: "La nota es obligatoria para la categoría Otros." });
      }

      const creado = await prisma.egresoFijo.create({
        data: { categoria, mes, anio, monto, nota },
      });
      return res.status(201).json(creado);
    }

    // Sueldos / Alquiler / Administrativo
    const existente = await prisma.egresoFijo.findFirst({
      where: { categoria, mes, anio },
      orderBy: { id: "asc" },
    });

    if (existente) {
      const actualizado = await prisma.egresoFijo.update({
        where: { id: existente.id },
        data: { monto, nota: nota || null },
      });
      return res.status(200).json(actualizado);
    }

    const creado = await prisma.egresoFijo.create({
      data: { categoria, mes, anio, monto, nota: nota || null },
    });

    return res.status(201).json(creado);
  } catch (error: any) {
    console.error("Error al registrar egreso fijo:", error);
    res
      .status(error?.status ?? 500)
      .json({ message: error?.message ?? "Error al registrar egreso fijo" });
  }
};

/**
 * Eliminar un egreso fijo
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

/**
 * Resumen por categoría con detalle (subcategoría/nota)
 */
export const getResumenEgresos = async (req: Request, res: Response) => {
  try {
    const { mes, anio } = parsePeriodo(req.query.mes, req.query.anio);

    const egresos = await prisma.egresoFijo.findMany({
      where: { mes, anio },
    });

    const resumenMap = new Map<
      string,
      { total: number; detalle: Map<string, { subcategoria?: string | null; nota?: string | null; total: number }> }
    >();

    let totalPeriodo = 0;

    for (const egreso of egresos) {
      const cat = egreso.categoria;
      const monto = egreso.monto ?? 0;
      totalPeriodo += monto;

      if (!resumenMap.has(cat)) {
        resumenMap.set(cat, { total: 0, detalle: new Map() });
      }

      const info = resumenMap.get(cat)!;
      info.total += monto;

      if (cat === "Servicios") {
        const clave = (egreso.subcategoria ?? "Sin subcategoría").trim().toLowerCase();
        const existente = info.detalle.get(clave) ?? {
          subcategoria: egreso.subcategoria ?? "Sin subcategoría",
          total: 0,
        };
        existente.total += monto;
        info.detalle.set(clave, existente);
      } else if (cat === "Otros") {
        const clave = (egreso.nota ?? "Sin nota").trim().toLowerCase();
        const existente = info.detalle.get(clave) ?? {
          nota: egreso.nota ?? "Sin nota",
          total: 0,
        };
        existente.total += monto;
        info.detalle.set(clave, existente);
      }
    }

    const porCategoria = Array.from(resumenMap.entries()).map(([categoria, data]) => ({
      categoria,
      total: data.total,
      detalle:
        categoria === "Servicios" || categoria === "Otros"
          ? Array.from(data.detalle.values())
          : undefined,
    }));

    res.status(200).json({ totalPeriodo, porCategoria });
  } catch (error: any) {
    console.error("Error al obtener resumen de egresos:", error);
    res
      .status(error?.status ?? 500)
      .json({ message: error?.message ?? "Error al obtener resumen de egresos" });
  }
};
