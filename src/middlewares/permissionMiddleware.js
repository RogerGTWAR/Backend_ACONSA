import { pool } from "../config/db.js";

export const requirePermission = (id_menu) => {
  return async (req, res, next) => {
    try {
      const usuarioId = req.user.usuario_id;

      const query = `
        SELECT 1 
        FROM permisos 
        WHERE usuario_id = $1 
        AND id_menu = $2 
        AND estado = true 
        AND fecha_eliminacion IS NULL
      `;

      const result = await pool.query(query, [usuarioId, id_menu]);

      if (result.rowCount === 0)
        return res.status(403).json({
          ok: false,
          msg: "No tienes permisos para este módulo",
        });

      next();

    } catch (err) {
      console.error("[PERMISSION ERROR]:", err);
      res.status(500).json({ ok: false, msg: "Error interno" });
    }
  };
};
