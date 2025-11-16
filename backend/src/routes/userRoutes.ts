import { Router } from 'express';
import { getAllUsers, getUserById } from '../controllers/userController';
import { adminCreateUser } from '../controllers/userAdminController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Obtener todos los usuarios (solo para admin o vistas internas)
router.get('/', authenticateToken, getAllUsers);

// Obtener usuario por ID
router.get('/:id', authenticateToken, getUserById);

// 🆕 Crear usuario (solo ADMIN)
router.post('/admin-create', authenticateToken, adminCreateUser);

export default router;
