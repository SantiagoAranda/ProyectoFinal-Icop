import { Router } from "express";
import {
  getAllTurnos,
  createTurno,
  cancelTurno,
  updateTurnoEstado
} from "../controllers/turnoController";

const router = Router();

// 🔹 Obtener todos los turnos
router.get("/", getAllTurnos);

// 🔹 Crear turno
router.post("/", createTurno);

// 🔹 Cambiar estado (reservado → completado o cancelado)
router.patch("/:id/estado", updateTurnoEstado);

// 🔹 Atajo para cancelar
router.patch("/:id/cancelar", cancelTurno);

export default router;
