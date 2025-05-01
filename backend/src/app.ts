import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes'; // Rutas de autenticación
import userRoutes from './routes/userRoutes'; // Rutas de usuarios
import turnoRoutes from './routes/turnoRoutes'; // Rutas de turnos
import servicioRoutes from './routes/servicioRoutes'; // Rutas de servicios

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes); // Rutas de autenticación
app.use('/api/users', userRoutes); // Rutas de usuarios
app.use('/api/turnos', turnoRoutes); // Rutas de turnos
app.use('/api/servicios', servicioRoutes); // Rutas de servicios

export default app;
