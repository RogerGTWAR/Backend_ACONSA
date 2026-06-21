import express from "express";
import MaquinariasController from "../controllers/MaquinariasController.js";

const maquinariaRouter = express.Router();

maquinariaRouter.get("/", MaquinariasController.getAll);
maquinariaRouter.get("/:id", MaquinariasController.getById);
maquinariaRouter.post("/", MaquinariasController.create);
maquinariaRouter.patch("/:id", MaquinariasController.update);
maquinariaRouter.delete("/:id", MaquinariasController.delete);

export default maquinariaRouter;
