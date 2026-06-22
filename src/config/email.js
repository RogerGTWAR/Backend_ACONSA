import { verifyToken } from "../config/jwt.js";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    const tokenFromHeader =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const token = tokenFromHeader || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        ok: false,
        msg: "No autenticado",
      });
    }

    const decoded = verifyToken(token);

    req.user = decoded;

    next();
  } catch (err) {
    console.error("[AUTH MIDDLEWARE ERROR]:", err);

    return res.status(401).json({
      ok: false,
      msg: "Token inválido o expirado",
    });
  }
};