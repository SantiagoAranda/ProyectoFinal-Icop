import { Router } from 'express';
import { getAllTurnos, createTurno, cancelTurno } from '../controllers/turnoController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Ruta para obtener todos los turnos
router.get('/', authenticateToken, getAllTurnos);

// Ruta para crear un nuevo turno
router.post('/', authenticateToken, createTurno);

// Ruta para cancelar un turno
router.delete('/:id', authenticateToken, cancelTurno);

export default router;
