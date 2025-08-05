import express from 'express';
import { crearServicio } from '../controllers/servicioController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authenticateToken, crearServicio); 

export default router;
