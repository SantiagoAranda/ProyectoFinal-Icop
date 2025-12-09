import { Request, Response } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";

/* ============================================================
   🔹 Helpers: validación y normalización de rol
============================================================ */
const validateUserData = (
  data: any,
  options?: { requireRole?: boolean }
) => {
  const errors: string[] = [];
  const requireRole = options?.requireRole ?? true;

  if (!data.nombre || data.nombre.trim().length < 6) {
    errors.push("El nombre debe tener al menos 6 caracteres.");
  }

  if (!data.email) {
    errors.push("El email es obligatorio.");
  }

  if (requireRole && !data.role) {
    errors.push("El rol es obligatorio.");
  }

  return errors;
};

const ALLOWED_ROLES = ["ADMIN", "EMPLEADO", "TESORERO", "CLIENTE"] as const;
type RolEnum = (typeof ALLOWED_ROLES)[number];

const normalizeRole = (role: any): RolEnum => {
  const upper = String(role || "").trim().toUpperCase();
  if (ALLOWED_ROLES.includes(upper as RolEnum)) {
    return upper as RolEnum;
  }
  // Por defecto, si llega algo raro, lo tratamos como EMPLEADO
  return "EMPLEADO";
};

/* ============================================================
   🔹 Crear Usuario por ADMIN
============================================================ */
export const adminCreateUser = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, role, especialidad } = req.body;

    const validationErrors = validateUserData({ nombre, email, role });
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors.join(" ") });
    }

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "La contraseña debe tener al menos 6 caracteres." });
    }

    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      return res
        .status(400)
        .json({ message: "Ya existe un usuario con ese email." });
    }

    // 🔐 Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Normalizar rol a MAYÚSCULAS y validar
    const finalRole = normalizeRole(role);

    const user = await prisma.user.create({
      data: {
        nombre: nombre.trim(),
        email: email.trim(),
        password: passwordHash,
        role: finalRole,
        especialidad:
          finalRole === "EMPLEADO" ? (especialidad ?? null) : null,
      },
    });

    return res.json(user);
  } catch (error) {
    console.error("Error adminCreateUser:", error);
    return res.status(500).json({ message: "Error creando usuario." });
  }
};

/* ============================================================
   🔹 Editar Usuario por ADMIN
============================================================ */
export const adminEditUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { nombre, email, role, especialidad } = req.body;

    // Para editar usamos solo validación de nombre y email
    const validationErrors = validateUserData(
      { nombre, email, role },
      { requireRole: false }
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors.join(" ") });
    }

    const data: any = {
      nombre: nombre.trim(),
      email: email.trim(),
    };

    // Si en algún momento quisieras permitir cambiar el rol desde el front,
    // esto lo normaliza y actualiza correctamente.
    if (role) {
      const finalRole = normalizeRole(role);
      data.role = finalRole;
      data.especialidad =
        finalRole === "EMPLEADO" ? (especialidad ?? null) : null;
    } else if (typeof especialidad !== "undefined") {
      // Caso actual: solo se edita especialidad para EMPLEADOS
      data.especialidad = especialidad ?? null;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return res.json(user);
  } catch (error) {
    console.error("Error adminEditUser:", error);
    return res.status(500).json({ message: "Error editando usuario." });
  }
};

/* ============================================================
   🔹 Activar / Desactivar Usuario
============================================================ */
export const adminToggleActivo = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado." });

    const updated = await prisma.user.update({
      where: { id },
      data: { activo: !user.activo },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Error adminToggleActivo:", error);
    return res
      .status(500)
      .json({ message: "Error al cambiar estado del usuario." });
  }
};

/* ============================================================
   🔹 Eliminar Usuario (con restricciones)
============================================================ */
export const adminDeleteUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const currentUserId = (req as any).user?.id; // viene del JWT

    // 1️⃣ Evitar borrar tu propia cuenta
    if (id === currentUserId) {
      return res.status(400).json({
        message: "No podés eliminar la cuenta con la que estás logueado.",
      });
    }

    // 2️⃣ Verificar existencia
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // 3️⃣ Evitar borrar el último administrador
    if (userToDelete.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "No podés eliminar el último administrador del sistema.",
        });
      }
    }

    // 4️⃣ Evitar borrar usuarios con turnos asignados
    const turnosAsignados = await prisma.turno.count({
      where: { empleadoId: id },
    });

    if (turnosAsignados > 0) {
      return res.status(400).json({
        message: "No se puede eliminar un usuario que tiene turnos asignados.",
      });
    }

    // 5️⃣ Eliminar usuario
    await prisma.user.delete({ where: { id } });

    return res.json({ message: "Usuario eliminado correctamente." });
  } catch (error) {
    console.error("Error adminDeleteUser:", error);
    return res.status(500).json({ message: "Error eliminando usuario." });
  }
};
