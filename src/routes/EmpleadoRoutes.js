import express from "express";
import EmpleadosController from "../controllers/EmpleadosController.js";

const empleadoRouter = express.Router();

empleadoRouter.get("/", EmpleadosController.getAll);
empleadoRouter.get("/:id", EmpleadosController.getById);
empleadoRouter.post("/", EmpleadosController.create);
empleadoRouter.patch("/:id", EmpleadosController.update);
empleadoRouter.delete("/:id", EmpleadosController.delete);

export default empleadoRouter;
