// src/controllers/turnoController.ts
import { Request, Response } from 'express';

export const getAllTurnos = (_req: Request, res: Response) => {
  res.status(200).json({ message: 'getAllTurnos funcionando' });
};

export const createTurno = (_req: Request, res: Response) => {
  res.status(201).json({ message: 'createTurno funcionando' });
};

export const cancelTurno = (req: Request, res: Response) => {
  const { id } = req.params;
  res.status(200).json({ message: `cancelTurno funcionando para id ${id}` });
};
