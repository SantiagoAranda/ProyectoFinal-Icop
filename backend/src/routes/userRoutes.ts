import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";

import {
  getAllUsers,
  getUserById
} from "../controllers/userController";

import {
  adminCreateUser,
  adminEditUser,
  adminToggleActivo,
  adminDeleteUser
} from "../controllers/userAdminController";

const router = Router();

/* ============================================
   RUTAS DE CONSULTA (requieren autenticación)
============================================ */

// Obtener todos los usuarios
router.get("/", authenticateToken, getAllUsers);

// Obtener usuario por ID
router.get("/:id", authenticateToken, getUserById);

/* ============================================
   RUTAS ADMIN (solo rol ADMIN)
============================================ */

// Crear usuario nuevo
router.post("/admin-create", authenticateToken, adminCreateUser);

// Editar usuario existente
router.put("/admin-edit/:id", authenticateToken, adminEditUser);

// Activar / desactivar usuario
router.patch("/admin-toggle/:id", authenticateToken, adminToggleActivo);

// Eliminar usuario (solo si no tiene turnos)
router.delete("/admin-delete/:id", authenticateToken, adminDeleteUser);

export default router;
