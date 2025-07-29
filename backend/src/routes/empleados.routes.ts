import { Router } from 'express';
import { getEmpleados } from '../controllers/empleados.controller';

const router = Router();

router.get('/', getEmpleados);

export default router;