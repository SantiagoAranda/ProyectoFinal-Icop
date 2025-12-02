import express from "express";
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  asignarProveedorAProducto,
  quitarProveedorDeProducto,
} from "../controllers/productosController";

const router = express.Router();

router.get("/", obtenerProductos);
router.post("/", crearProducto);
router.put("/:id", actualizarProducto);
router.put("/:id/proveedor", asignarProveedorAProducto);
router.put("/:id/quitar-proveedor", quitarProveedorDeProducto);
router.delete("/:id", eliminarProducto);

export default router;
