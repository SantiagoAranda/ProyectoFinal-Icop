import { Router } from 'express';
import { getAllServicios, createServicio } from '../controllers/servicioController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Ruta para obtener todos los servicios
router.get('/', authenticateToken, getAllServicios);

// Ruta para crear un nuevo servicio
router.post('/', authenticateToken, createServicio);

export default router;
