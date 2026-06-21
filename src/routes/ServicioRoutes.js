import express from "express";
import ServiciosController from "../controllers/ServiciosController.js";

const servicioRouter = express.Router();

servicioRouter.get("/", ServiciosController.getAll);
servicioRouter.get("/:id", ServiciosController.getById);
servicioRouter.post("/", ServiciosController.create);
servicioRouter.patch("/:id", ServiciosController.update);
servicioRouter.delete("/:id", ServiciosController.delete);

export default servicioRouter;
