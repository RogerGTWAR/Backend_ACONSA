import express from "express";
import DetallesMaquinariasController from "../controllers/DetallesMaquinariasController.js";

const detalleMaquinariaRouter = express.Router();

detalleMaquinariaRouter.get("/", DetallesMaquinariasController.getAll);
detalleMaquinariaRouter.get("/:id", DetallesMaquinariasController.getById);
detalleMaquinariaRouter.post("/", DetallesMaquinariasController.create);
detalleMaquinariaRouter.patch("/:id", DetallesMaquinariasController.update);
detalleMaquinariaRouter.delete("/:id", DetallesMaquinariasController.delete);

export default detalleMaquinariaRouter;
