import { Router } from 'express';
import { getAllServicios, createServicio } from '../controllers/servicioController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Obtener todos los servicios
router.get('/', authenticateToken, getAllServicios);

// Crear un nuevo servicio
router.post('/', authenticateToken, createServicio);

export default router;
