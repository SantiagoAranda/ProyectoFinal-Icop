import { Router } from 'express';
import {
  obtenerEstadisticas,
  crearEstadistica,
  obtenerResumenTesoreria,
} from '../controllers/estadisticas.controller';

const router = Router();

router.get('/', obtenerEstadisticas);
router.get('/resumen', obtenerResumenTesoreria);
router.post('/', crearEstadistica);

export default router;
