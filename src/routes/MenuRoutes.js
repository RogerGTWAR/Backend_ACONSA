import express from "express";
import MenuController from "../controllers/menuController.js";

const menuRouter = express.Router();

menuRouter.get("/usuario/:usuario_id", MenuController.getMenuByUser);
menuRouter.get("/tree/all/data", MenuController.getTree);
menuRouter.get("/", MenuController.getAll);
menuRouter.get("/:id", MenuController.getById);
menuRouter.post("/", MenuController.create);
menuRouter.patch("/:id", MenuController.update);
menuRouter.delete("/:id", MenuController.delete);

export default menuRouter;
