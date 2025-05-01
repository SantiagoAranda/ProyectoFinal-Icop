import { Router } from 'express';
import { login, register } from '../controllers/authController';

const router = Router();

// Ruta para login
router.post('/login', login);

// Ruta para register
router.post('/register', register);

export default router;
