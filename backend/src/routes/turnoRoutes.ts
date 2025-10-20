import { Router } from "express";
import { getAllTurnos, createTurno, cancelTurno } from "../controllers/turnoController";

const router = Router();

// 🔹 Obtener todos los turnos (con productos, cliente, servicio y empleado)
router.get("/", getAllTurnos);

// 🔹 Crear turno (usa el controlador que maneja productos, stock y validaciones)
router.post("/", createTurno);

// 🔹 Actualizar estado del turno (completar/cancelar)
router.patch("/:id", cancelTurno);

export default router;
