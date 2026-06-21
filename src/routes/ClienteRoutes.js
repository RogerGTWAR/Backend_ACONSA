import express from "express";
import ClientesController from "../controllers/ClientesController.js";

const ClienteRouter = express.Router();

ClienteRouter.get("/", ClientesController.getAll);
ClienteRouter.get("/:id", ClientesController.getById);
ClienteRouter.post("/", ClientesController.create);
ClienteRouter.patch("/:id", ClientesController.update);
ClienteRouter.delete("/:id", ClientesController.delete);

export default ClienteRouter;
