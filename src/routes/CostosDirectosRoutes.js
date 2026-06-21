import express from "express";
import CostosDirectosServiciosController from "../controllers/CostosDirectosServiciosController.js";

const costosDirectosRoutes = express.Router();

costosDirectosRoutes.get("/", CostosDirectosServiciosController.getAll);
costosDirectosRoutes.get("/:id", CostosDirectosServiciosController.getById);
costosDirectosRoutes.post("/", CostosDirectosServiciosController.create);
costosDirectosRoutes.patch("/:id", CostosDirectosServiciosController.update);
costosDirectosRoutes.delete("/:id", CostosDirectosServiciosController.delete);

export default costosDirectosRoutes;
