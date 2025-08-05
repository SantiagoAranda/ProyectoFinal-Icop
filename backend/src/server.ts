import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import turnoRoutes from './routes/turnoRoutes';
import servicioRoutes from './routes/servicio.Routes'; 
import empleadoRoutes from './routes/empleados.routes';
import productoRoutes from './routes/productos.routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Servidor funcionando 🚀');
});


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/productos', productoRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
