import express from "express";
import AvaluosController from "../controllers/AvaluosController.js";

const avaluoRouter = express.Router();

avaluoRouter.get("/", AvaluosController.getAll);
avaluoRouter.get("/:id", AvaluosController.getById);
avaluoRouter.post("/", AvaluosController.create);
avaluoRouter.patch("/:id", AvaluosController.update);
avaluoRouter.delete("/:id", AvaluosController.delete);

export default avaluoRouter;
