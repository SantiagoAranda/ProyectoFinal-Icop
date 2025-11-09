import { Router } from "express";
import { getEgresos, upsertEgreso, deleteEgreso } from "../controllers/egresos.controller";

const router = Router();

router.get("/", getEgresos);
router.post("/", upsertEgreso);
router.delete("/:id", deleteEgreso);

export default router;
