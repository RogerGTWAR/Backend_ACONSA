import express from "express";
import MovimientosInventarioController from "../controllers/MovimientosInventarioController.js";

const movimientosInventarioRouter = express.Router();

movimientosInventarioRouter.get(
  "/",
  MovimientosInventarioController.getAll
);

movimientosInventarioRouter.get(
  "/:id",
  MovimientosInventarioController.getById
);

movimientosInventarioRouter.get(
  "/material/:material_id",
  MovimientosInventarioController.getByMaterial
);

movimientosInventarioRouter.post(
  "/entrada",
  MovimientosInventarioController.registrarEntrada
);

movimientosInventarioRouter.post(
  "/salida",
  MovimientosInventarioController.registrarSalida
);

movimientosInventarioRouter.post(
  "/ajuste",
  MovimientosInventarioController.registrarAjuste
);

movimientosInventarioRouter.delete(
  "/:id",
  MovimientosInventarioController.delete
);

export default movimientosInventarioRouter;