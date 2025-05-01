import { Router } from 'express';
import { getAllUsers, getUserById } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware'; // Asegúrate de proteger las rutas privadas

const router = Router();

// Ruta para obtener todos los usuarios
router.get('/', authenticateToken, getAllUsers);

// Ruta para obtener un usuario por ID
router.get('/:id', authenticateToken, getUserById);

export default router;
