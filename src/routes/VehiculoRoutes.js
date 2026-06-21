import express from "express";
import VehiculosController from "../controllers/VehiculosController.js";

const vehiculoRouter = express.Router();

vehiculoRouter.get("/", VehiculosController.getAll);
vehiculoRouter.get("/:id", VehiculosController.getById);
vehiculoRouter.post("/", VehiculosController.create);
vehiculoRouter.patch("/:id", VehiculosController.update);
vehiculoRouter.delete("/:id", VehiculosController.delete);

export default vehiculoRouter;
