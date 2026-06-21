import express from "express";
import DetallesAvaluosController from "../controllers/DetallesAvaluosController.js";

const detalleAvaluoRouter = express.Router();

detalleAvaluoRouter.get("/", DetallesAvaluosController.getAll);
detalleAvaluoRouter.get("/:id", DetallesAvaluosController.getById);
detalleAvaluoRouter.post("/", DetallesAvaluosController.create);
detalleAvaluoRouter.patch("/:id", DetallesAvaluosController.update);
detalleAvaluoRouter.delete("/:id", DetallesAvaluosController.delete);

export default detalleAvaluoRouter;
