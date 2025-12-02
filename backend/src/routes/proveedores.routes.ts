import { Router } from "express";
import {
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
} from "../controllers/proveedoresController";

const router = Router();

router.get("/", listarProveedores);
router.get("/:id", obtenerProveedor);
router.post("/", crearProveedor);
router.put("/:id", actualizarProveedor);
router.delete("/:id", eliminarProveedor);

export default router;
