import { verifyToken } from "../config/jwt.js";

export default function authenticate(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        ok: false,
        msg: "Usuario no autenticado",
      });
    }

    const decoded = verifyToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("[AUTHENTICATE ERROR]:", error);

    return res.status(401).json({
      ok: false,
      msg: "Token inválido o expirado",
    });
  }
}