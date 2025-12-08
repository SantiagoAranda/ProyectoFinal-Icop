import { Router } from "express";
import {
  getAllTurnos,
  createTurno,
  cancelTurno,
  updateTurnoEstado,
  getEmpleadosDisponibles,
} from "../controllers/turnosController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Obtener todos los turnos
router.get("/", authenticateToken, getAllTurnos);

// Obtener empleados disponibles para una fecha/hora
router.get(
  "/empleados-disponibles",
  authenticateToken,
  getEmpleadosDisponibles
);

// Crear turno
router.post("/", authenticateToken, createTurno);

// Cambiar estado (reservado -> completado o cancelado)
router.patch("/:id/estado", authenticateToken, updateTurnoEstado);

// Cancelar turno (solo cliente autenticado)
router.patch("/:id/cancelar", authenticateToken, cancelTurno);

export default router;
