import express from "express";
import CategoriasProveedorController from "../controllers/CategoriasProveedorController.js";

const CategoriasProveedorRouter = express.Router();

CategoriasProveedorRouter.get('/', CategoriasProveedorController.getAll);
CategoriasProveedorRouter.get('/:id', CategoriasProveedorController.getById);
CategoriasProveedorRouter.post('/', CategoriasProveedorController.create);
CategoriasProveedorRouter.patch('/:id', CategoriasProveedorController.update);
CategoriasProveedorRouter.delete('/:id', CategoriasProveedorController.delete);

export default CategoriasProveedorRouter;
