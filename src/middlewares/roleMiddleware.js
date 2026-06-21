import { pool } from "../config/db.js";

export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const empleadoId = req.user.empleado_id;

      const result = await pool.query(
        "SELECT rol_id FROM empleados WHERE empleado_id = $1",
        [empleadoId]
      );

      if (result.rowCount === 0)
        return res.status(404).json({
          ok: false,
          msg: "Empleado no encontrado",
        });

      const rolId = result.rows[0].rol_id;

      if (!allowedRoles.includes(rolId))
        return res.status(403).json({
          ok: false,
          msg: "Acceso denegado",
        });

      next();

    } catch (error) {
      console.error("[ROLE MIDDLEWARE ERROR]:", error);
      res.status(500).json({ ok: false, msg: "Error interno" });
    }
  };
};
