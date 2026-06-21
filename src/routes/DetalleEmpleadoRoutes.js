import express from "express";
import DetallesEmpleadosController from "../controllers/DetallesEmpleadosController.js";

const detalleEmpleadoRouter = express.Router();

detalleEmpleadoRouter.get("/", DetallesEmpleadosController.getAll);
detalleEmpleadoRouter.get("/:id", DetallesEmpleadosController.getById);
detalleEmpleadoRouter.post("/", DetallesEmpleadosController.create);
detalleEmpleadoRouter.patch("/:id", DetallesEmpleadosController.update);
detalleEmpleadoRouter.delete("/:id", DetallesEmpleadosController.delete);

export default detalleEmpleadoRouter;
