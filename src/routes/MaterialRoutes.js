import express from "express";
import MaterialesController from "../controllers/MaterialesController.js";

const materialRouter = express.Router();

materialRouter.get("/", MaterialesController.getAll);
materialRouter.get("/:id", MaterialesController.getById);
materialRouter.post("/", MaterialesController.create);
materialRouter.patch("/:id", MaterialesController.update);
materialRouter.delete("/:id", MaterialesController.delete);

export default materialRouter;
