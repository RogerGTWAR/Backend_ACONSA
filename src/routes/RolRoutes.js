import express from "express";
import RolesController from "../controllers/RolesController.js";

const rolRouter = express.Router();

rolRouter.get("/", RolesController.getAll);
rolRouter.get("/:id", RolesController.getById);
rolRouter.post("/", RolesController.create);
rolRouter.patch("/:id", RolesController.update);
rolRouter.delete("/:id", RolesController.delete);

export default rolRouter;
