import { Router } from "express";
import PermisosController from "../controllers/PermisosController.js";

const router = Router();

router.get("/empleado/:usuario", PermisosController.buscarEmpleado);
router.get("/menus", PermisosController.getMenuAll);
router.get("/asignados/:usuarioId", PermisosController.getPermisosAsignados);
router.get("/no-asignados/:usuarioId", PermisosController.getMenuSinAsignar);
router.post("/asignar", PermisosController.asignar);
router.post("/remover", PermisosController.remover);

export default router;
