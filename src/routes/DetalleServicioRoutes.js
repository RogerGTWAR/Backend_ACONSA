import express from "express";
import DetallesServiciosController from "../controllers/DetallesServiciosController.js";

const detalleServiciosRoutes = express.Router();

detalleServiciosRoutes.get("/", DetallesServiciosController.getAll);
detalleServiciosRoutes.get("/:id", DetallesServiciosController.getById);
detalleServiciosRoutes.post("/", DetallesServiciosController.create);
detalleServiciosRoutes.patch("/:id", DetallesServiciosController.update);
detalleServiciosRoutes.delete("/:id", DetallesServiciosController.delete);

export default detalleServiciosRoutes;
