import express from "express";
import CategoriasController from "../controllers/CategoriasController.js";

const categoriaRouter = express.Router();

categoriaRouter.get("/", CategoriasController.getAll);
categoriaRouter.get("/:id", CategoriasController.getById);
categoriaRouter.post("/", CategoriasController.create);
categoriaRouter.patch("/:id", CategoriasController.update);
categoriaRouter.delete("/:id", CategoriasController.delete);

export default categoriaRouter;
