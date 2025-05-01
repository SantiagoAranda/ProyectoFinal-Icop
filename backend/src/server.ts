import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'secret'; // Clave secreta para JWT

app.use(cors());
app.use(express.json());

// Middleware de autenticación
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]; // Obtener el token de los encabezados

  if (!token) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const decoded: any = jwt.verify(token, SECRET_KEY); // Verificar y decodificar el token
    req.user = decoded; // Guardar el usuario decodificado en la solicitud
    next(); // Continuar al siguiente middleware o ruta
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

// Ruta de prueba
app.get('/', (req: Request, res: Response) => {
  res.send('Servidor funcionando 🚀');
});

// Endpoint de registro
app.post('/register', async (req: Request, res: Response) => {
  const { email, password, role, nombre } = req.body;

  // Validación de campos
  if (!email || !password || !role || !nombre) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    // Verificar si el usuario ya existe
    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role, // Asignar el rol
        nombre, // Asegúrate de incluir el campo `nombre`
      },
    });

    res.status(201).json({ message: 'Usuario registrado con éxito', user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Endpoint de login
app.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validación de los campos requeridos
  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
  }

  try {
    // Buscar el usuario
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    // Comparar contraseñas
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Email o contraseña incorrectos' });
    }

    // Generar un JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Ruta protegida: Solo administradores pueden acceder
app.get('/admin', authenticate, (req: Request, res: Response) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso solo para administradores' });
  }

  res.status(200).json({ message: 'Bienvenido administrador' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
