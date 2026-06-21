import express from "express";
import ProveedoresController from "../controllers/ProveedoresController.js";

const proveedorRouter = express.Router();

proveedorRouter.get("/", ProveedoresController.getAll);
proveedorRouter.get("/:id", ProveedoresController.getById);
proveedorRouter.post("/", ProveedoresController.create);
proveedorRouter.patch("/:id", ProveedoresController.update);
proveedorRouter.delete("/:id", ProveedoresController.delete);

export default proveedorRouter;
