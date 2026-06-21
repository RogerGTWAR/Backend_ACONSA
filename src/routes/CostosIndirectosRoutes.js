import express from "express";
import CostosIndirectosServiciosController from "../controllers/CostosIndirectosServiciosController.js";

const costosindirectosRoutes = express.Router();

costosindirectosRoutes.get("/", CostosIndirectosServiciosController.getAll);
costosindirectosRoutes.get("/:id", CostosIndirectosServiciosController.getById);
costosindirectosRoutes.post("/", CostosIndirectosServiciosController.create);
costosindirectosRoutes.patch("/:id", CostosIndirectosServiciosController.update);
costosindirectosRoutes.delete("/:id", CostosIndirectosServiciosController.delete);

export default costosindirectosRoutes;
