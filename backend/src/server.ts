import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes'; // Asegurate de que esta ruta sea correcta

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Ruta base de prueba
app.get('/', (_req, res) => {
  res.send('Servidor funcionando 🚀');
});

// Rutas de autenticación
app.use('/', authRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
