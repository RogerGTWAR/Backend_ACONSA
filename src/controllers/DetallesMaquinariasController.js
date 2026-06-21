//Falta-En Revision
import prisma from "../database.js";

const ESTADOS_PERMITIDOS = ["Activa", "Finalizada", "Cancelada"];

export default class DetallesMaquinariasController {
  static async getAll(_req, res) {
    try {
      const detalles = await prisma.detalles_maquinarias.findMany({
        where: { fecha_eliminacion: null },
        include: {
          proyectos: { select: { proyecto_id: true, nombre: true } },
          maquinarias: { select: { maquinaria_id: true, nombre_maquinaria: true, precio_por_hora: true } }
        },
        orderBy: { detalle_maquinaria_id: "asc" }
      });

      const data = detalles.map(d => ({
        ...d,
        proyecto: d.proyectos?.nombre ?? null,
        maquinaria: d.maquinarias?.nombre_maquinaria ?? null
      }));

      res.json({ ok: true, data });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }

  static async getById(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) {
      return res.status(400).json({ ok: false, msg: "El id del detalle debe ser un número" });
    }

    try {
      const det = await prisma.detalles_maquinarias.findFirst({
        where: { AND: [{ detalle_maquinaria_id: idNum }, { fecha_eliminacion: null }] },
        include: {
          proyectos: { select: { proyecto_id: true, nombre: true } },
          maquinarias: { select: { maquinaria_id: true, nombre_maquinaria: true, precio_por_hora: true } }
        }
      });

      if (!det) {
        return res.status(404).json({ ok: false, msg: `No se encontró el detalle con id: ${idNum}` });
      }

      res.json({
        ok: true,
        data: {
          ...det,
          proyecto: det.proyectos?.nombre ?? null,
          maquinaria: det.maquinarias?.nombre_maquinaria ?? null
        }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server Error, something went wrong" });
    }
  }

  static async create(req, res) {
    const {
      proyecto_id,
      maquinaria_id,
      horas_utilizadas,
      fecha_inicio_renta,
      fecha_fin_renta,
      estado,
      descripcion
    } = req.body;

    if (
      proyecto_id === undefined ||
      maquinaria_id === undefined ||
      !fecha_inicio_renta
    ) {
      return res.status(400).json({ ok: false, msg: "Faltan campos obligatorios: proyecto_id, maquinaria_id y fecha_inicio_renta" });
    }

    const proyectoId = parseInt(proyecto_id);
    const maquinariaId = parseInt(maquinaria_id);
    if ([proyectoId, maquinariaId].some(isNaN)) {
      return res.status(400).json({ ok: false, msg: "proyecto_id y maquinaria_id deben ser numéricos" });
    }

    let horas = null;
    if (horas_utilizadas !== undefined && horas_utilizadas !== null) {
      const parsed = parseInt(horas_utilizadas);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ ok: false, msg: "horas_utilizadas debe ser un número >= 0" });
      }
      horas = parsed;
    }

    const fInicio = new Date(fecha_inicio_renta);
    if (isNaN(fInicio.getTime())) {
      return res.status(400).json({ ok: false, msg: "fecha_inicio_renta no es válida" });
    }
    let fFin = null;
    if (fecha_fin_renta) {
      fFin = new Date(fecha_fin_renta);
      if (isNaN(fFin.getTime())) {
        return res.status(400).json({ ok: false, msg: "fecha_fin_renta no es válida" });
      }
      if (fFin < fInicio) {
        return res.status(400).json({ ok: false, msg: "fecha_fin_renta no puede ser anterior a fecha_inicio_renta" });
      }
    }

    if (estado !== undefined && estado !== null && !ESTADOS_PERMITIDOS.includes(estado)) {
      return res.status(400).json({ ok: false, msg: `estado inválido. Valores permitidos: ${ESTADOS_PERMITIDOS.join(", ")}` });
    }

    try {
      const proyOk = await prisma.proyectos.findFirst({
        where: { AND: [{ proyecto_id: proyectoId }, { fecha_eliminacion: null }] }
      });
      if (!proyOk) return res.status(400).json({ ok: false, msg: "El proyecto no existe o fue dado de baja" });

      const maqOk = await prisma.maquinarias.findFirst({
        where: { AND: [{ maquinaria_id: maquinariaId }, { fecha_eliminacion: null }] }
      });
      if (!maqOk) return res.status(400).json({ ok: false, msg: "La maquinaria no existe o fue dada de baja" });

      const nuevo = await prisma.detalles_maquinarias.create({
        data: {
          proyecto_id: proyectoId,
          maquinaria_id: maquinariaId,
          horas_utilizadas: horas,
          fecha_inicio_renta: fInicio,
          fecha_fin_renta: fFin,
          estado: estado ?? null
        },
        include: {
          proyectos: { select: { proyecto_id: true, nombre: true } },
          maquinarias: { select: { maquinaria_id: true, nombre_maquinaria: true, precio_por_hora: true } }
        }
      });

      res.status(201).json({
        ok: true,
        msg: "Detalle de maquinaria creado correctamente",
        data: {
          ...nuevo,
          proyecto: nuevo.proyectos?.nombre ?? null,
          maquinaria: nuevo.maquinarias?.nombre_maquinaria ?? null
        }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }

  static async update(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) {
      return res.status(400).json({ ok: false, msg: "El id del detalle debe ser un número" });
    }

    try {
      const old = await prisma.detalles_maquinarias.findUnique({
        where: { detalle_maquinaria_id: idNum }
      });
      if (!old || old.fecha_eliminacion !== null) {
        return res.status(404).json({ ok: false, msg: "No se encontró el detalle que se desea modificar" });
      }

      const {
        proyecto_id,
        maquinaria_id,
        horas_utilizadas,
        fecha_inicio_renta,
        fecha_fin_renta,
        estado
      } = req.body;

      let proyectoId = old.proyecto_id;
      if (proyecto_id !== undefined) {
        const parsed = parseInt(proyecto_id);
        if (isNaN(parsed)) return res.status(400).json({ ok: false, msg: "El id del proyecto debe ser un número" });
        const proyOk = await prisma.proyectos.findFirst({
          where: { AND: [{ proyecto_id: parsed }, { fecha_eliminacion: null }] }
        });
        if (!proyOk) return res.status(400).json({ ok: false, msg: "El proyecto no existe o fue dado de baja" });
        proyectoId = parsed;
      }

      let maquinariaId = old.maquinaria_id;
      if (maquinaria_id !== undefined) {
        const parsed = parseInt(maquinaria_id);
        if (isNaN(parsed)) return res.status(400).json({ ok: false, msg: "El id de la maquinaria debe ser un número" });
        const maqOk = await prisma.maquinarias.findFirst({
          where: { AND: [{ maquinaria_id: parsed }, { fecha_eliminacion: null }] }
        });
        if (!maqOk) return res.status(400).json({ ok: false, msg: "La maquinaria no existe o fue dada de baja" });
        maquinariaId = parsed;
      }

      let horas = old.horas_utilizadas;
      if (horas_utilizadas !== undefined) {
        const parsed = parseInt(horas_utilizadas);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ ok: false, msg: "horas_utilizadas debe ser un número >= 0" });
        }
        horas = parsed;
      }

      let fInicio = old.fecha_inicio_renta;
      if (fecha_inicio_renta !== undefined) {
        const parsed = new Date(fecha_inicio_renta);
        if (isNaN(parsed.getTime())) return res.status(400).json({ ok: false, msg: "fecha_inicio_renta no es válida" });
        fInicio = parsed;
      }

      let fFin = old.fecha_fin_renta;
      if (fecha_fin_renta !== undefined) {
        if (fecha_fin_renta === null) {
          fFin = null;
        } else {
          const parsed = new Date(fecha_fin_renta);
          if (isNaN(parsed.getTime())) return res.status(400).json({ ok: false, msg: "fecha_fin_renta no es válida" });
          fFin = parsed;
        }
      }

      if (fFin && fInicio && fFin < fInicio) {
        return res.status(400).json({ ok: false, msg: "fecha_fin_renta no puede ser anterior a fecha_inicio_renta" });
      }

      let nuevoEstado = old.estado;
      if (estado !== undefined) {
        if (estado !== null && !ESTADOS_PERMITIDOS.includes(estado)) {
          return res.status(400).json({ ok: false, msg: `estado inválido. Valores permitidos: ${ESTADOS_PERMITIDOS.join(", ")}` });
        }
        nuevoEstado = estado; 
      }

      const actualizado = await prisma.detalles_maquinarias.update({
        where: { detalle_maquinaria_id: idNum },
        data: {
          proyecto_id: proyectoId,
          maquinaria_id: maquinariaId,
          horas_utilizadas: horas,
          fecha_inicio_renta: fInicio,
          fecha_fin_renta: fFin,
          estado: nuevoEstado,
          fecha_actualizacion: new Date()
        },
        include: {
          proyectos: { select: { proyecto_id: true, nombre: true } },
          maquinarias: { select: { maquinaria_id: true, nombre_maquinaria: true, precio_por_hora: true } }
        }
      });

      res.json({
        ok: true,
        msg: "Detalle de maquinaria actualizado correctamente",
        data: {
          ...actualizado,
          proyecto: actualizado.proyectos?.nombre ?? null,
          maquinaria: actualizado.maquinarias?.nombre_maquinaria ?? null
        }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }

  static async delete(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) {
      return res.status(400).json({ ok: false, msg: "El id del detalle debe ser un número" });
    }

    try {
      const existe = await prisma.detalles_maquinarias.findFirst({
        where: { AND: [{ detalle_maquinaria_id: idNum }, { fecha_eliminacion: null }] }
      });
      if (!existe) {
        return res.status(404).json({ ok: false, msg: "No se encontró el detalle que se desea eliminar" });
      }

      const { detalle_maquinaria_id } = await prisma.detalles_maquinarias.update({
        where: { detalle_maquinaria_id: idNum },
        data: { fecha_eliminacion: new Date() }
      });

      res.json({ ok: true, msg: "Se eliminó el detalle correctamente", id: detalle_maquinaria_id });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }
}
