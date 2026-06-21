import prisma from "../database.js";

export default class HistorialAlertasController {
  static async getAll(req, res) {
    try {
      const { soloNoLeidas, limite } = req.query;

      const where = {
        fecha_eliminacion: null,
      };

      if (soloNoLeidas === "true") {
        where.leida = false;
      }

      const alertas = await prisma.historial_alertas.findMany({
        where,
        include: {
          usuarios: {
            select: {
              usuario_id: true,
              usuario: true,
              empleados: {
                select: {
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
        orderBy: {
          fecha_creacion: "desc",
        },
        take: limite ? Number(limite) : undefined,
      });

      const data = alertas.map((a) => ({
        ...a,
        usuarioNombre: a.usuarios?.empleados
          ? `${a.usuarios.empleados.nombres} ${a.usuarios.empleados.apellidos}`.trim()
          : a.usuarios?.usuario ?? "Sistema",
      }));

      res.json({ ok: true, data });
    } catch (error) {
      console.error("Error getAll alertas:", error);
      res.status(500).json({
        ok: false,
        msg: "Error al obtener las alertas",
      });
    }
  }

  static async getById(req, res) {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido",
        });
      }

      const alerta = await prisma.historial_alertas.findFirst({
        where: {
          alerta_id: id,
          fecha_eliminacion: null,
        },
        include: {
          usuarios: {
            select: {
              usuario_id: true,
              usuario: true,
              empleados: {
                select: {
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
      });

      if (!alerta) {
        return res.status(404).json({
          ok: false,
          msg: "Alerta no encontrada",
        });
      }

      res.json({ ok: true, data: alerta });
    } catch (error) {
      console.error("Error getById alertas:", error);
      res.status(500).json({
        ok: false,
        msg: "Error al obtener la alerta",
      });
    }
  }

  static async marcarLeida(req, res) {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido",
        });
      }

      const alerta = await prisma.historial_alertas.findFirst({
        where: {
          alerta_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!alerta) {
        return res.status(404).json({
          ok: false,
          msg: "Alerta no encontrada",
        });
      }

      const updated = await prisma.historial_alertas.update({
        where: {
          alerta_id: id,
        },
        data: {
          leida: true,
          fecha_actualizacion: new Date(),
        },
      });

      res.json({
        ok: true,
        msg: "Alerta marcada como leída",
        data: updated,
      });
    } catch (error) {
      console.error("Error marcarLeida:", error);
      res.status(500).json({
        ok: false,
        msg: "Error al marcar alerta",
      });
    }
  }

  static async marcarTodasLeidas(_req, res) {
    try {
      await prisma.historial_alertas.updateMany({
        where: {
          fecha_eliminacion: null,
          leida: false,
        },
        data: {
          leida: true,
          fecha_actualizacion: new Date(),
        },
      });

      res.json({
        ok: true,
        msg: "Todas las alertas fueron marcadas como leídas",
      });
    } catch (error) {
      console.error("Error marcarTodasLeidas:", error);
      res.status(500).json({
        ok: false,
        msg: "Error al actualizar alertas",
      });
    }
  }

  static async delete(req, res) {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido",
        });
      }

      const alerta = await prisma.historial_alertas.findFirst({
        where: {
          alerta_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!alerta) {
        return res.status(404).json({
          ok: false,
          msg: "Alerta no encontrada",
        });
      }

      await prisma.historial_alertas.update({
        where: {
          alerta_id: id,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      res.json({
        ok: true,
        msg: "Alerta eliminada correctamente",
      });
    } catch (error) {
      console.error("Error delete alerta:", error);
      res.status(500).json({
        ok: false,
        msg: "Error al eliminar alerta",
      });
    }
  }
}