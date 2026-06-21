import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class AvaluosController {
  static async getAll(_req, res) {
    try {
      const data = await prisma.avaluos.findMany({
        where: { fecha_eliminacion: null },
        include: {
          proyectos: true,
        },
        orderBy: { avaluo_id: "asc" },
      });

      const list = data.map((a) => ({
        ...a,
        tiempo_total_dias: Math.ceil(
          (new Date(a.fecha_fin) - new Date(a.fecha_inicio)) /
            (1000 * 60 * 60 * 24)
        ),
      }));

      res.json({ ok: true, data: list });
    } catch (error) {
      console.error("Error getAll:", error);
      res.status(500).json({ ok: false, msg: "Error al obtener avalúos." });
    }
  }

  static async getById(req, res) {
    try {
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ ok: false, msg: "ID inválido." });
      }

      const a = await prisma.avaluos.findFirst({
        where: { avaluo_id: id, fecha_eliminacion: null },
        include: { proyectos: true },
      });

      if (!a) {
        return res.status(404).json({ ok: false, msg: "No encontrado." });
      }

      const tiempo_total_dias = Math.ceil(
        (new Date(a.fecha_fin) - new Date(a.fecha_inicio)) /
          (1000 * 60 * 60 * 24)
      );

      res.json({ ok: true, data: { ...a, tiempo_total_dias } });
    } catch (error) {
      console.error("Error getById:", error);
      res.status(500).json({ ok: false, msg: "Error interno." });
    }
  }

  static async create(req, res) {
    try {
      const { proyecto_id, descripcion, fecha_inicio, fecha_fin } = req.body;
      const usuario_id = req.user?.usuario_id ?? null;

      if (!proyecto_id || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: proyecto_id, fecha_inicio, fecha_fin.",
        });
      }

      const proyecto = await prisma.proyectos.findFirst({
        where: {
          proyecto_id: Number(proyecto_id),
          fecha_eliminacion: null,
        },
      });

      if (!proyecto) {
        return res.status(404).json({
          ok: false,
          msg: "El proyecto no existe o fue eliminado.",
        });
      }

      const nuevo = await prisma.avaluos.create({
        data: {
          proyecto_id: Number(proyecto_id),
          descripcion: descripcion?.trim() || null,
          fecha_inicio: new Date(fecha_inicio),
          fecha_fin: new Date(fecha_fin),
          monto_ejecutado: 0,
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Avalúo creado",
        mensaje: `Se creó el avalúo ID ${nuevo.avaluo_id} para el proyecto "${proyecto.nombre_proyecto ?? proyecto.nombre ?? proyecto_id}".`,
        modulo: "Avalúos",
        referencia_id: nuevo.avaluo_id,
        prioridad: "Media",
      });

      const tiempo_total_dias = Math.ceil(
        (nuevo.fecha_fin - nuevo.fecha_inicio) / (1000 * 60 * 60 * 24)
      );

      res.status(201).json({
        ok: true,
        msg: "Avalúo creado.",
        data: { ...nuevo, tiempo_total_dias },
      });
    } catch (error) {
      console.error("Error create:", error);

      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al crear avalúo",
        mensaje: error.message || "Ocurrió un error al crear un avalúo.",
        modulo: "Avalúos",
        prioridad: "Alta",
      });

      res.status(500).json({ ok: false, msg: "Error al crear." });
    }
  }

  static async update(req, res) {
    try {
      const id = Number(req.params.id);
      const usuario_id = req.user?.usuario_id ?? null;

      if (isNaN(id)) {
        return res.status(400).json({ ok: false, msg: "ID inválido." });
      }

      const old = await prisma.avaluos.findFirst({
        where: { avaluo_id: id, fecha_eliminacion: null },
      });

      if (!old) {
        return res.status(404).json({ ok: false, msg: "No encontrado." });
      }

      const { proyecto_id, descripcion, fecha_inicio, fecha_fin } = req.body;

      const upd = await prisma.avaluos.update({
        where: { avaluo_id: id },
        data: {
          proyecto_id: proyecto_id ? Number(proyecto_id) : old.proyecto_id,
          descripcion: descripcion?.trim() ?? old.descripcion,
          fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : old.fecha_inicio,
          fecha_fin: fecha_fin ? new Date(fecha_fin) : old.fecha_fin,
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Avalúo actualizado",
        mensaje: `Se actualizó el avalúo ID ${upd.avaluo_id}.`,
        modulo: "Avalúos",
        referencia_id: upd.avaluo_id,
        prioridad: "Media",
      });

      const tiempo_total_dias = Math.ceil(
        (upd.fecha_fin - upd.fecha_inicio) / (1000 * 60 * 60 * 24)
      );

      res.json({
        ok: true,
        msg: "Avalúo actualizado.",
        data: { ...upd, tiempo_total_dias },
      });
    } catch (error) {
      console.error("Error update:", error);

      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al actualizar avalúo",
        mensaje: error.message || "Ocurrió un error al actualizar un avalúo.",
        modulo: "Avalúos",
        prioridad: "Alta",
      });

      res.status(500).json({ ok: false, msg: "Error al actualizar." });
    }
  }

  static async delete(req, res) {
    try {
      const id = Number(req.params.id);
      const usuario_id = req.user?.usuario_id ?? null;

      if (isNaN(id)) {
        return res.status(400).json({ ok: false, msg: "ID inválido." });
      }

      const existe = await prisma.avaluos.findFirst({
        where: { avaluo_id: id, fecha_eliminacion: null },
      });

      if (!existe) {
        return res.status(404).json({
          ok: false,
          msg: "Avalúo no encontrado.",
        });
      }

      await prisma.avaluos.update({
        where: { avaluo_id: id },
        data: { fecha_eliminacion: new Date() },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Avalúo eliminado",
        mensaje: `Se eliminó el avalúo ID ${id}.`,
        modulo: "Avalúos",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.json({ ok: true, msg: "Avalúo eliminado correctamente." });
    } catch (error) {
      console.error("Error delete:", error);

      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al eliminar avalúo",
        mensaje: error.message || "Ocurrió un error al eliminar un avalúo.",
        modulo: "Avalúos",
        prioridad: "Alta",
      });

      res.status(500).json({ ok: false, msg: "Error al eliminar." });
    }
  }
}