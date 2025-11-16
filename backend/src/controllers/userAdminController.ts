import { Request, Response } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";

export const adminCreateUser = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, role, especialidad } = req.body;

    // Validar rol admin
    const loggedUser = (req as any).user;
    if (!loggedUser || loggedUser.role !== "ADMIN") {
      return res.status(403).json({ message: "No autorizado" });
    }

    if (!nombre || !email || !password || !role) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    // Verificar si ya existe email
    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) {
      return res.status(400).json({ message: "Ese email ya está registrado" });
    }

    const hash = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.user.create({
      data: {
        nombre,
        email,
        password: hash,
        role,
        especialidad: role === "EMPLEADO" ? especialidad ?? null : null,
      },
    });

    res.status(201).json({
      message: "Usuario creado exitosamente",
      usuario: nuevoUsuario,
    });

  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
