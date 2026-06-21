import express from "express";
import HistorialAlertasController from "../controllers/HistorialAlertasController.js";

const router = express.Router();

router.get("/", HistorialAlertasController.getAll);
router.get("/:id", HistorialAlertasController.getById);
router.patch("/:id/leida", HistorialAlertasController.marcarLeida);
router.patch("/marcar-todas/leidas", HistorialAlertasController.marcarTodasLeidas);
router.delete("/:id", HistorialAlertasController.delete);

export default router;