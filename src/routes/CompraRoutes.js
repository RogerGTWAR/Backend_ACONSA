import express from "express";
import ComprasController from "../controllers/ComprasController.js";

const compraRouter = express.Router();

compraRouter.get("/", ComprasController.getAll);
compraRouter.get("/:id", ComprasController.getById);
compraRouter.post("/", ComprasController.create);
compraRouter.patch("/:id", ComprasController.update);
compraRouter.delete("/:id", ComprasController.delete);

export default compraRouter;
