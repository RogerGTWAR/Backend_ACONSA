import express from "express";
import ProyectosController from "../controllers/ProyectosController.js";

const proyectoRouter = express.Router();

proyectoRouter.get("/", ProyectosController.getAll);
proyectoRouter.get("/:id", ProyectosController.getById);
proyectoRouter.post("/", ProyectosController.create);
proyectoRouter.patch("/:id", ProyectosController.update);
proyectoRouter.delete("/:id", ProyectosController.delete);

export default proyectoRouter;
