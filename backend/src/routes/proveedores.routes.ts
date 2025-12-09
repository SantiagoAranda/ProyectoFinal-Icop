import { Router } from "express";
import {
  getProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from "../controllers/proveedoresController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Obtener todos los proveedores
router.get("/", authenticateToken, getProveedores);

// Obtener un proveedor por ID
router.get("/:id", authenticateToken, getProveedorById);

// Crear proveedor
router.post("/", authenticateToken, createProveedor);

// Actualizar proveedor
router.put("/:id", authenticateToken, updateProveedor);

// Eliminar proveedor
router.delete("/:id", authenticateToken, deleteProveedor);

export default router;
