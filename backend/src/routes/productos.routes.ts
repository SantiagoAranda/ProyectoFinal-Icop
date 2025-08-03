import express from 'express';
import { crearProducto, obtenerProductos } from '../controllers/productosController';

const router = express.Router();

router.get('/', obtenerProductos); // GET /api/productos
router.post('/', crearProducto); // POST /api/productos


export default router;
