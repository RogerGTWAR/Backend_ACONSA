import { Router } from "express";

import {
  register,
  login,
  me,
  logout,
  autoRegister,
  forgotPassword,
  resetPassword,
  getAllUsuarios,
  getUsuarioById,
  updateUsuario,
  deleteUsuario,
} from "../controllers/authController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);
router.post("/auto-register", authMiddleware, autoRegister);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/usuarios", authMiddleware, getAllUsuarios);
router.get("/usuarios/:id", authMiddleware, getUsuarioById);
router.put("/usuarios/:id", authMiddleware, updateUsuario);
router.delete("/usuarios/:id", authMiddleware, deleteUsuario);

export default router;
