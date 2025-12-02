import { Router } from "express";
import {
  getAllTurnos,
  createTurno,
  cancelTurno,
  updateTurnoEstado,
} from "../controllers/turnosController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Obtener todos los turnos
router.get("/", getAllTurnos);

// Crear turno
router.post("/", createTurno);

// Cambiar estado (reservado -> completado o cancelado)
router.patch("/:id/estado", updateTurnoEstado);

// Cancelar turno (solo cliente autenticado)
router.patch("/:id/cancelar", authenticateToken, cancelTurno);

export default router;
