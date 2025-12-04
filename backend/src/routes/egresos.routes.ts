import { Router } from "express";
import { getEgresos, upsertEgreso, deleteEgreso, getResumenEgresos } from "../controllers/egresos.controller";

const router = Router();

router.get("/resumen", getResumenEgresos);
router.get("/", getEgresos);
router.post("/", upsertEgreso);
router.delete("/:id", deleteEgreso);

export default router;
