import { Request, Response } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";

/* ============================
   HELPER: verificar rol admin
============================ */
const isAdmin = (user: any) => {
  return user && ["ADMIN", "admin"].includes(user.role);
};

/* ============================
   CREAR USUARIO (ADMIN)
============================ */
export const adminCreateUser = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, role, especialidad } = req.body;
    const logged = (req as any).user;

    if (!isAdmin(logged)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    if (!nombre || !email || !password || !role) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) return res.status(400).json({ message: "Email ya registrado" });

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nombre,
        email,
        password: hash,
        role,
        especialidad: role === "EMPLEADO" ? especialidad ?? null : null,
      },
    });

    return res.status(201).json({ message: "Usuario creado", usuario: user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};

/* ============================
   EDITAR USUARIO (ADMIN)
============================ */
export const adminEditUser = async (req: Request, res: Response) => {
  try {
    const logged = (req as any).user;
    if (!isAdmin(logged)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const { id } = req.params;
    const { nombre, email, role, especialidad } = req.body;

    const usuario = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        nombre,
        email,
        role,
        especialidad: role === "EMPLEADO" ? especialidad ?? null : null,
      },
    });

    return res.status(200).json({ message: "Usuario actualizado", usuario });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error actualizando usuario" });
  }
};

/* ============================
   BLOQUEAR / DESBLOQUEAR USUARIO
============================ */
export const adminToggleActivo = async (req: Request, res: Response) => {
  try {
    const logged = (req as any).user;
    if (!isAdmin(logged)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const { id } = req.params;

    const usuario = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!usuario) return res.status(404).json({ message: "Usuario no existe" });

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { activo: !usuario.activo },
    });

    return res.status(200).json({
      message: updated.activo ? "Usuario activado" : "Usuario desactivado",
      usuario: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cambiar estado" });
  }
};

/* ============================
   ELIMINAR USUARIO (ADMIN)
============================ */
export const adminDeleteUser = async (req: Request, res: Response) => {
  try {
    const logged = (req as any).user;
    if (!isAdmin(logged)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const { id } = req.params;

    // ❗ Evitar borrar usuarios con turnos asignados
    const turnos = await prisma.turno.findFirst({
      where: { empleadoId: Number(id) },
    });

    if (turnos) {
      return res.status(400).json({
        message: "No se puede eliminar un usuario con turnos asociados",
      });
    }

    await prisma.user.delete({ where: { id: Number(id) } });

    return res.status(200).json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al eliminar usuario" });
  }
};
