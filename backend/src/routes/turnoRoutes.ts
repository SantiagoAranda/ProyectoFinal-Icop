import { Router } from 'express';
import {
  getAllTurnos,
  createTurno,
  cancelTurno,
} from '../controllers/turnoController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Obtener todos los turnos (requiere login)
router.get('/', authenticateToken, getAllTurnos);

// Crear nuevo turno (requiere login)
router.post('/', authenticateToken, createTurno);

// Cancelar turno por ID (requiere login)
router.delete('/:id', authenticateToken, cancelTurno);

export default router;
