import express from "express";
import DetallesComprasController from "../controllers/DetallesComprasController.js";

const detalleCompraRouter = express.Router();

detalleCompraRouter.get("/", DetallesComprasController.getAll);
detalleCompraRouter.get("/:id", DetallesComprasController.getById);
detalleCompraRouter.post("/", DetallesComprasController.create);
detalleCompraRouter.patch("/:id", DetallesComprasController.update);
detalleCompraRouter.delete("/:id", DetallesComprasController.delete);

export default detalleCompraRouter;
