import { Request, Response } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";

/* ===========================================================
   Helpers: validación y normalización de rol
=========================================================== */
const ALLOWED_ROLES = ["ADMIN", "EMPLEADO", "TESORERO", "CLIENTE"] as const;
type RolEnum = (typeof ALLOWED_ROLES)[number];

const normalizeRole = (role: unknown): RolEnum => {
  const upper = String(role ?? "").trim().toUpperCase();
  return (ALLOWED_ROLES as readonly string[]).includes(upper) ? (upper as RolEnum) : "EMPLEADO";
};

const validateUserData = (
  data: { nombre?: unknown; email?: unknown; role?: unknown },
  options?: { requireRole?: boolean }
) => {
  const errors: string[] = [];
  const requireRole = options?.requireRole ?? true;

  const nombre = String(data.nombre ?? "").trim();
  const email = String(data.email ?? "").trim();
  const role = data.role;

  if (!nombre || nombre.length < 6) {
    errors.push("El nombre debe tener al menos 6 caracteres.");
  }

  if (!email) {
    errors.push("El email es obligatorio.");
  } else {
    // Validación básica (sin forzar .com)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) errors.push("El email no es válido.");
  }

  if (requireRole) {
    const normalized = normalizeRole(role);
    // Si te llega algo inválido, normalizeRole lo transforma a EMPLEADO,
    // así que solo validamos que haya "algo" si requireRole=true
    if (!String(role ?? "").trim()) errors.push("El rol es obligatorio.");
    // Opcional: si querés rechazar roles inválidos (en vez de default EMPLEADO):
    // if (!ALLOWED_ROLES.includes(String(role ?? "").trim().toUpperCase() as RolEnum)) {
    //   errors.push("El rol no es válido.");
    // }
    void normalized;
  }

  return errors;
};

/* ===========================================================
   Crear Usuario por ADMIN
=========================================================== */
export const adminCreateUser = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, role, especialidad } = req.body as {
      nombre?: string;
      email?: string;
      password?: string;
      role?: string;
      especialidad?: string | null;
    };

    const validationErrors = validateUserData({ nombre, email, role });
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors.join(" ") });
    }

    const pass = String(password ?? "");
    if (pass.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres.",
      });
    }

    const emailTrim = String(email ?? "").trim().toLowerCase();
    const nombreTrim = String(nombre ?? "").trim();

    const exists = await prisma.user.findUnique({
      where: { email: emailTrim },
    });

    if (exists) {
      return res.status(400).json({ message: "Ya existe un usuario con ese email." });
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(pass, 10);

    const finalRole = normalizeRole(role);

    const user = await prisma.user.create({
      data: {
        nombre: nombreTrim,
        email: emailTrim,
        password: passwordHash,
        role: finalRole,
        especialidad: finalRole === "EMPLEADO" ? (especialidad?.trim() ? especialidad.trim() : null) : null,
      },
      // Evitar devolver el hash en respuesta
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        especialidad: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(user);
  } catch (error) {
    console.error("Error adminCreateUser:", error);
    return res.status(500).json({ message: "Error creando usuario." });
  }
};

/* ===========================================================
   Editar Usuario por ADMIN
=========================================================== */
export const adminEditUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const { nombre, email, role, especialidad } = req.body as {
      nombre?: string;
      email?: string;
      role?: string;
      especialidad?: string | null;
    };

    // Para editar usamos solo validación de nombre y email
    const validationErrors = validateUserData({ nombre, email }, { requireRole: false });
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors.join(" ") });
    }

    const nombreTrim = String(nombre ?? "").trim();
    const emailTrim = String(email ?? "").trim().toLowerCase();

    // Si cambia email, chequear duplicados
    const current = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
    if (!current) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (emailTrim !== current.email) {
      const exists = await prisma.user.findUnique({ where: { email: emailTrim } });
      if (exists) {
        return res.status(400).json({ message: "Ya existe un usuario con ese email." });
      }
    }

    const data: any = {
      nombre: nombreTrim,
      email: emailTrim,
    };

    // Si permitís cambiar rol desde el front:
    if (typeof role !== "undefined" && String(role).trim() !== "") {
      const finalRole = normalizeRole(role);
      data.role = finalRole;
      data.especialidad = finalRole === "EMPLEADO" ? (especialidad?.trim() ? especialidad.trim() : null) : null;
    } else if (typeof especialidad !== "undefined") {
      // Caso actual: solo se edita especialidad para EMPLEADOS
      // Importante: evitar setear especialidad a usuarios que NO sean EMPLEADO
      if (current.role === "EMPLEADO") {
        data.especialidad = especialidad?.trim() ? especialidad.trim() : null;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        especialidad: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(user);
  } catch (error) {
    console.error("Error adminEditUser:", error);
    return res.status(500).json({ message: "Error editando usuario." });
  }
};

/* ===========================================================
   Activar / Desactivar Usuario
=========================================================== */
export const adminToggleActivo = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { activo: true } });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado." });

    const updated = await prisma.user.update({
      where: { id },
      data: { activo: !user.activo },
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        especialidad: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Error adminToggleActivo:", error);
    return res.status(500).json({ message: "Error al cambiar estado del usuario." });
  }
};

/* ===========================================================
   Eliminar Usuario (con restricciones)
=========================================================== */
export const adminDeleteUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const currentUserId = Number((req as any).user?.id); // viene del JWT

    // Evitar borrar tu propia cuenta
    if (Number.isFinite(currentUserId) && id === currentUserId) {
      return res.status(400).json({
        message: "No podés eliminar la cuenta con la que estás logueado.",
      });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!userToDelete) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Evitar borrar el último administrador
    if (userToDelete.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "No podés eliminar el último administrador del sistema.",
        });
      }
    }

    await prisma.user.delete({ where: { id } });

    return res.json({ message: "Usuario eliminado correctamente." });
  } catch (error) {
    console.error("Error adminDeleteUser:", error);
    return res.status(500).json({ message: "Error eliminando usuario." });
  }
};
