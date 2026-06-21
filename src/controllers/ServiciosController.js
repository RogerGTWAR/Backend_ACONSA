import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class ServiciosController {
  static calcularCostoVenta(servicio) {
    return (
      Number(servicio.total_costo_directo ?? 0) +
      Number(servicio.total_costo_indirecto ?? 0)
    );
  }

  static async getAll(_req, res) {
    try {
      const servicios = await prisma.servicios.findMany({
        where: { fecha_eliminacion: null },
        orderBy: { servicio_id: "asc" },
      });

      const list = servicios.map((s) => ({
        ...s,
        costo_venta: ServiciosController.calcularCostoVenta(s),
      }));

      res.json({ ok: true, data: list });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener servicios",
        mensaje: error.message || "Ocurrió un error al cargar los servicios.",
        modulo: "Servicios",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener servicios.",
      });
    }
  }

  static async getById(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Servicio no consultado",
        mensaje: "No se pudo consultar el servicio porque el ID no es válido.",
        modulo: "Servicios",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "ID inválido.",
      });
    }

    try {
      const servicioEncontrado = await prisma.servicios.findFirst({
        where: {
          servicio_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!servicioEncontrado) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no encontrado",
          mensaje: `No se encontró el servicio con ID ${id}.`,
          modulo: "Servicios",
          referencia_id: id,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: "Servicio no encontrado.",
        });
      }

      const servicio = {
        ...servicioEncontrado,
        costo_venta: ServiciosController.calcularCostoVenta(servicioEncontrado),
      };

      res.json({ ok: true, data: servicio });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al obtener servicio",
        mensaje: error.message || "Ocurrió un error al obtener el servicio.",
        modulo: "Servicios",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener el servicio.",
      });
    }
  }

  static async create(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;

    try {
      const {
        nombre_servicio,
        descripcion,
        total_costo_directo,
        total_costo_indirecto,
      } = req.body;

      if (
        !nombre_servicio ||
        total_costo_directo == null ||
        total_costo_indirecto == null
      ) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no creado",
          mensaje:
            "No se pudo crear el servicio porque faltan campos obligatorios: nombre del servicio, costo directo y costo indirecto.",
          modulo: "Servicios",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: nombre_servicio, total_costo_directo, total_costo_indirecto.",
        });
      }

      const costoDirecto = Number(total_costo_directo);
      const costoIndirecto = Number(total_costo_indirecto);

      if (isNaN(costoDirecto) || isNaN(costoIndirecto)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no creado",
          mensaje:
            "No se pudo crear el servicio porque los costos enviados no son números válidos.",
          modulo: "Servicios",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Los costos deben ser valores numéricos.",
        });
      }

      if (costoDirecto <= 0 || costoIndirecto <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no creado",
          mensaje:
            "No se pudo crear el servicio porque los costos deben ser mayores que cero.",
          modulo: "Servicios",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Los costos deben ser mayores que cero.",
        });
      }

      const existeNombre = await prisma.servicios.findFirst({
        where: {
          nombre_servicio: {
            equals: nombre_servicio.trim(),
            mode: "insensitive",
          },
          fecha_eliminacion: null,
        },
      });

      if (existeNombre) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no creado",
          mensaje: `No se pudo crear el servicio porque ya existe un servicio llamado "${nombre_servicio.trim()}".`,
          modulo: "Servicios",
          referencia_id: existeNombre.servicio_id,
          prioridad: "Alta",
        });

        return res.status(409).json({
          ok: false,
          msg: "Ya existe un servicio con ese nombre.",
        });
      }

      const nuevo = await prisma.servicios.create({
        data: {
          nombre_servicio: nombre_servicio.trim(),
          descripcion: descripcion?.trim() || null,
          total_costo_directo: costoDirecto,
          total_costo_indirecto: costoIndirecto,
        },
      });

      const data = {
        ...nuevo,
        costo_venta: ServiciosController.calcularCostoVenta(nuevo),
      };

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Servicio creado",
        mensaje: `Se creó el servicio "${nuevo.nombre_servicio}" con costo de venta C$ ${data.costo_venta.toFixed(2)}.`,
        modulo: "Servicios",
        referencia_id: nuevo.servicio_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Servicio creado correctamente.",
        data,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al crear servicio",
        mensaje: error.message || "Ocurrió un error al crear el servicio.",
        modulo: "Servicios",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al crear el servicio.",
      });
    }
  }

  static async update(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Servicio no actualizado",
        mensaje:
          "No se pudo actualizar el servicio porque el ID enviado no es válido.",
        modulo: "Servicios",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "ID inválido.",
      });
    }

    try {
      const old = await prisma.servicios.findFirst({
        where: {
          servicio_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!old) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no actualizado",
          mensaje: `No se pudo actualizar el servicio con ID ${id} porque no existe o fue eliminado.`,
          modulo: "Servicios",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Servicio no encontrado.",
        });
      }

      const {
        nombre_servicio,
        descripcion,
        total_costo_directo,
        total_costo_indirecto,
      } = req.body;

      const costoDirecto =
        total_costo_directo != null
          ? Number(total_costo_directo)
          : Number(old.total_costo_directo);

      const costoIndirecto =
        total_costo_indirecto != null
          ? Number(total_costo_indirecto)
          : Number(old.total_costo_indirecto);

      if (isNaN(costoDirecto) || isNaN(costoIndirecto)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no actualizado",
          mensaje:
            "No se pudo actualizar el servicio porque los costos enviados no son números válidos.",
          modulo: "Servicios",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Los costos deben ser valores numéricos.",
        });
      }

      if (costoDirecto <= 0 || costoIndirecto <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no actualizado",
          mensaje:
            "No se pudo actualizar el servicio porque los costos deben ser mayores que cero.",
          modulo: "Servicios",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Los costos deben ser mayores que cero.",
        });
      }

      if (nombre_servicio && nombre_servicio.trim() !== old.nombre_servicio) {
        const existeNombre = await prisma.servicios.findFirst({
          where: {
            nombre_servicio: {
              equals: nombre_servicio.trim(),
              mode: "insensitive",
            },
            fecha_eliminacion: null,
            NOT: {
              servicio_id: id,
            },
          },
        });

        if (existeNombre) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Servicio no actualizado",
            mensaje: `No se pudo actualizar el servicio porque ya existe otro servicio llamado "${nombre_servicio.trim()}".`,
            modulo: "Servicios",
            referencia_id: id,
            prioridad: "Alta",
          });

          return res.status(409).json({
            ok: false,
            msg: "Ya existe otro servicio con ese nombre.",
          });
        }
      }

      const actualizado = await prisma.servicios.update({
        where: { servicio_id: id },
        data: {
          nombre_servicio: nombre_servicio?.trim() ?? old.nombre_servicio,
          descripcion: descripcion?.trim() ?? old.descripcion,
          total_costo_directo: costoDirecto,
          total_costo_indirecto: costoIndirecto,
          fecha_actualizacion: new Date(),
        },
      });

      const data = {
        ...actualizado,
        costo_venta: ServiciosController.calcularCostoVenta(actualizado),
      };

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Servicio actualizado",
        mensaje: `Se actualizó el servicio "${actualizado.nombre_servicio}".`,
        modulo: "Servicios",
        referencia_id: actualizado.servicio_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Servicio actualizado.",
        data,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al actualizar servicio",
        mensaje: error.message || "Ocurrió un error al actualizar el servicio.",
        modulo: "Servicios",
        referencia_id: isNaN(id) ? null : id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al actualizar el servicio.",
      });
    }
  }

  static async delete(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Servicio no eliminado",
        mensaje:
          "No se pudo eliminar el servicio porque el ID enviado no es válido.",
        modulo: "Servicios",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "ID inválido.",
      });
    }

    try {
      const existe = await prisma.servicios.findFirst({
        where: {
          servicio_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!existe) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Servicio no eliminado",
          mensaje: `No se pudo eliminar el servicio con ID ${id} porque no existe o ya fue eliminado.`,
          modulo: "Servicios",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el servicio a eliminar.",
        });
      }

      const eliminado = await prisma.servicios.update({
        where: { servicio_id: id },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Servicio eliminado",
        mensaje: `Se eliminó el servicio "${existe.nombre_servicio}".`,
        modulo: "Servicios",
        referencia_id: eliminado.servicio_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Servicio eliminado correctamente.",
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al eliminar servicio",
        mensaje: error.message || "Ocurrió un error al eliminar el servicio.",
        modulo: "Servicios",
        referencia_id: isNaN(id) ? null : id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar el servicio.",
      });
    }
  }
}