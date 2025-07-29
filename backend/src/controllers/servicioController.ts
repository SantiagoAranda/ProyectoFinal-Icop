import { Request, Response } from 'express';

export const getAllServicios = (_req: Request, res: Response) => {
  res.status(200).json({ message: 'getAllServicios funcionando' });
};

export const createServicio = (req: Request, res: Response) => {
  const data = req.body;
  res.status(201).json({ message: 'createServicio funcionando', data });
};