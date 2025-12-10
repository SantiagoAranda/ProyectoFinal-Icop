import express from "express";
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  asignarProveedorAProducto,
  quitarProveedorDeProducto,
} from "../controllers/productosController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

/* ============================================================
   Rutas de productos
============================================================ */

// Listar productos
router.get("/", authenticateToken, obtenerProductos);

// Crear producto
router.post("/", authenticateToken, crearProducto);

// Actualizar producto
router.put("/:id", authenticateToken, actualizarProducto);

// Asignar / cambiar proveedor (forma antigua: ID en params)
router.put("/:id/proveedor", authenticateToken, asignarProveedorAProducto);

// Quitar proveedor
router.put(
  "/:id/quitar-proveedor",
  authenticateToken,
  quitarProveedorDeProducto
);

// Asignar / cambiar proveedor (forma nueva: ID en body.productoId)
// → esta es la que usa el modal ProveedorProductosPanel
router.post(
  "/asignar-proveedor",
  authenticateToken,
  asignarProveedorAProducto
);

// Eliminar producto
router.delete("/:id", authenticateToken, eliminarProducto);

export default router;
