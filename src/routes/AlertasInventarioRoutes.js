import express from "express";
import AlertasInventarioController from "../controllers/AlertasInventarioController.js";

const alertasInventarioRouter = express.Router();

alertasInventarioRouter.get(
  "/",
  AlertasInventarioController.getAll
);

alertasInventarioRouter.get(
  "/pendientes",
  AlertasInventarioController.getPendientes
);

alertasInventarioRouter.get(
  "/:id",
  AlertasInventarioController.getById
);

alertasInventarioRouter.get(
  "/material/:material_id",
  AlertasInventarioController.getByMaterial
);

alertasInventarioRouter.patch(
  "/:id/atender",
  AlertasInventarioController.atender
);

alertasInventarioRouter.patch(
  "/:id/cancelar",
  AlertasInventarioController.cancelar
);

alertasInventarioRouter.delete(
  "/:id",
  AlertasInventarioController.delete
);

export default alertasInventarioRouter;