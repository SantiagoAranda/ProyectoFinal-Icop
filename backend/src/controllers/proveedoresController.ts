import { Request, Response } from "express";
import { prisma } from "../prisma";

/* ============================================================
   🔹 Validación común de proveedor
============================================================ */
const validateProveedorData = (data: any) => {
  const errors: string[] = [];

  const nombre = (data.nombre ?? "").trim();
  const telefono = (data.telefono ?? "").trim();
  const email = (data.email ?? "").trim();
  const direccion = (data.direccion ?? "").trim();

  // Nombre
  if (!nombre) {
    errors.push("El nombre es obligatorio.");
  } else if (nombre.length < 6) {
    errors.push("El nombre debe tener al menos 6 caracteres.");
  }

  // Teléfono
  if (!telefono) {
    errors.push("El teléfono es obligatorio.");
  } else {
    if (/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(telefono)) {
      errors.push(
        "El teléfono no puede contener letras, solo números y los caracteres +, -, espacio."
      );
    }
    const soloDigitos = telefono.replace(/\D/g, "");
    if (soloDigitos.length < 12) {
      errors.push("El teléfono debe tener al menos 12 dígitos.");
    }
  }

  // Email
  if (!email) {
    errors.push("El email es obligatorio.");
  } else {
    const tieneArroba = email.includes("@");
    const terminaEnCom = email.toLowerCase().endsWith(".com");
    if (!tieneArroba || !terminaEnCom) {
      errors.push("El email debe ser válido y terminar en .com.");
    }
  }

  // Dirección
  if (!direccion) {
    errors.push("La dirección es obligatoria.");
  } else if (direccion.length < 3) {
    errors.push("La dirección debe tener al menos 3 caracteres.");
  }

  return errors;
};

/* ============================================================
   🔹 GET /api/proveedores → listar todos
============================================================ */
export const getProveedores = async (_req: Request, res: Response) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: { productos: true }, // 👈 nombre de la relación en tu schema
        },
      },
    });
    return res.json(proveedores);
  } catch (error) {
    console.error("Error getProveedores:", error);
    return res
      .status(500)
      .json({ message: "Error obteniendo la lista de proveedores." });
  }
};

/* ============================================================
   🔹 GET /api/proveedores/:id → obtener uno
============================================================ */
export const getProveedorById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const proveedor = await prisma.proveedor.findUnique({ where: { id } });

    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado." });
    }

    return res.json(proveedor);
  } catch (error) {
    console.error("Error getProveedorById:", error);
    return res
      .status(500)
      .json({ message: "Error obteniendo el proveedor." });
  }
};

/* ============================================================
   🔹 POST /api/proveedores → crear
============================================================ */
export const createProveedor = async (req: Request, res: Response) => {
  try {
    const errors = validateProveedorData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const { nombre, telefono, email, direccion, notas } = req.body;

    const proveedorExiste = await prisma.proveedor.findFirst({
      where: { email },
    });

    if (proveedorExiste) {
      return res
        .status(400)
        .json({ message: "Ya existe un proveedor con ese email." });
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        direccion: direccion.trim(),
        notas: notas?.trim() || null,
      },
    });

    return res.status(201).json(proveedor);
  } catch (error) {
    console.error("Error createProveedor:", error);
    return res
      .status(500)
      .json({ message: "Error creando el proveedor." });
  }
};

/* ============================================================
   🔹 PUT /api/proveedores/:id → actualizar
============================================================ */
export const updateProveedor = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const proveedor = await prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado." });
    }

    const errors = validateProveedorData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const { nombre, telefono, email, direccion, notas } = req.body;

    const proveedorActualizado = await prisma.proveedor.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        direccion: direccion.trim(),
        notas: notas?.trim() || null,
      },
    });

    return res.json(proveedorActualizado);
  } catch (error) {
    console.error("Error updateProveedor:", error);
    return res
      .status(500)
      .json({ message: "Error actualizando el proveedor." });
  }
};

/* ============================================================
   🔹 DELETE /api/proveedores/:id → eliminar
============================================================ */
export const deleteProveedor = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const proveedor = await prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado." });
    }

    // Si necesitás validar que no tenga compras asociadas, podés hacerlo acá
    // const compras = await prisma.compra.count({ where: { proveedorId: id } });
    // if (compras > 0) {
    //   return res.status(400).json({
    //     message: "No se puede eliminar un proveedor con compras asociadas.",
    //   });
    // }

    await prisma.proveedor.delete({ where: { id } });

    return res.json({ message: "Proveedor eliminado correctamente." });
  } catch (error) {
    console.error("Error deleteProveedor:", error);
    return res
      .status(500)
      .json({ message: "Error eliminando el proveedor." });
  }
};
