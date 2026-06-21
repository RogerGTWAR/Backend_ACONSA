import express from "express";
import DetallesVehiculosController from "../controllers/DetallesVehiculosController.js";

const detalleVehiculoRouter = express.Router();

detalleVehiculoRouter.get("/", DetallesVehiculosController.getAll);
detalleVehiculoRouter.get("/:id", DetallesVehiculosController.getById);
detalleVehiculoRouter.post("/", DetallesVehiculosController.create);
detalleVehiculoRouter.patch("/:id", DetallesVehiculosController.update);
detalleVehiculoRouter.delete("/:id", DetallesVehiculosController.delete);

export default detalleVehiculoRouter;
