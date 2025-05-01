import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma'; 
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET || 'default_secret';

export const register = async (req: Request, res: Response) => {
  const { email, password, role, nombre, especialidad } = req.body;

  if (!email || !password || !role || !nombre) {
    return res.status(400).json({ message: 'Todos los campos obligatorios deben estar completos' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        nombre,
        especialidad, // opcional
      },
    });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor al iniciar sesión' });
  }
};
