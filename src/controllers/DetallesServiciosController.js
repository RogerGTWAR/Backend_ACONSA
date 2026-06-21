import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class DetallesServiciosController {
  static async getAll(_req, res) {
    try {
      const detalles = await prisma.detalles_servicios.findMany({
        where: { fecha_eliminacion: null },
        include: {
          servicio_id_servicios: {
            select: {
              servicio_id: true,
              nombre_servicio: true,
              descripcion: true,
              precio_unitario: true,
              cantidad: true,
              unidad_de_medida: true,
              estado: true,
            },
          },
          material_id_materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              precio_unitario: true,
              cantidad_en_stock: true,
            },
          },
        },
        orderBy: { detalle_servicio_id: "asc" },
      });

      const list = detalles.map((d) => ({
        ...d,
        total: Number(d.precio_unitario) * Number(d.cantidad),
      }));

      res.json({ ok: true, data: list });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Server error, something went wrong",
      });
    }
  }

  static async getById(req, res) {
    const idNum = parseInt(req.params.id);

    if (isNaN(idNum)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico",
      });
    }

    try {
      const detalle = await prisma.detalles_servicios.findFirst({
        where: {
          detalle_servicio_id: idNum,
          fecha_eliminacion: null,
        },
        include: {
          servicio_id_servicios: true,
          material_id_materiales: true,
        },
      });

      if (!detalle) {
        return res.status(404).json({
          ok: false,
          msg: "Detalle no encontrado",
        });
      }

      detalle.total = Number(detalle.precio_unitario) * Number(detalle.cantidad);

      res.json({
        ok: true,
        data: detalle,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Server error, something went wrong",
      });
    }
  }

  static async create(req, res) {
    try {
      const usuario_id = req.user?.usuario_id ?? null;

      const {
        servicio_id,
        material_id,
        descripcion,
        cantidad,
        unidad_de_medida,
        precio_unitario,
      } = req.body;

      if (
        !servicio_id ||
        !material_id ||
        !descripcion ||
        cantidad == null ||
        !unidad_de_medida ||
        precio_unitario == null
      ) {
        return res.status(400).json({
          ok: false,
          msg: "Faltan campos requeridos.",
        });
      }

      if (Number(cantidad) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "La cantidad debe ser mayor que cero.",
        });
      }

      if (Number(precio_unitario) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser mayor que cero.",
        });
      }

      const servicioId = Number(servicio_id);
      const materialId = Number(material_id);

      const servOk = await prisma.servicios.findFirst({
        where: {
          servicio_id: servicioId,
          fecha_eliminacion: null,
        },
      });

      if (!servOk) {
        return res.status(400).json({
          ok: false,
          msg: "El servicio indicado no existe.",
        });
      }

      const matOk = await prisma.materiales.findFirst({
        where: {
          material_id: materialId,
          fecha_eliminacion: null,
        },
      });

      if (!matOk) {
        return res.status(400).json({
          ok: false,
          msg: "El material indicado no existe.",
        });
      }

      const previo = await prisma.detalles_servicios.findFirst({
        where: {
          servicio_id: servicioId,
          material_id: materialId,
        },
        include: {
          servicio_id_servicios: true,
          material_id_materiales: true,
        },
      });

      if (previo && previo.fecha_eliminacion !== null) {
        const reactivado = await prisma.detalles_servicios.update({
          where: {
            detalle_servicio_id: previo.detalle_servicio_id,
          },
          data: {
            fecha_eliminacion: null,
            descripcion: descripcion.trim(),
            cantidad: Number(cantidad),
            unidad_de_medida: unidad_de_medida.trim(),
            precio_unitario: Number(precio_unitario),
            fecha_actualizacion: new Date(),
          },
          include: {
            servicio_id_servicios: true,
            material_id_materiales: true,
          },
        });

        await registrarAlerta({
          usuario_id,
          tipo: "Registro reactivado",
          titulo: "Detalle de servicio reactivado",
          mensaje: `Se reactivó el material "${reactivado.material_id_materiales?.nombre_material ?? "Material"}" en el servicio "${reactivado.servicio_id_servicios?.nombre_servicio ?? "Servicio"}".`,
          modulo: "Detalles Servicios",
          referencia_id: reactivado.detalle_servicio_id,
          prioridad: "Media",
        });

        return res.json({
          ok: true,
          msg: "Detalle reactivado",
          data: {
            ...reactivado,
            total:
              Number(reactivado.cantidad) *
              Number(reactivado.precio_unitario),
          },
        });
      }

      if (previo && previo.fecha_eliminacion === null) {
        return res.json({
          ok: true,
          msg: "El detalle ya existe",
          data: previo,
        });
      }

      const nuevo = await prisma.detalles_servicios.create({
        data: {
          servicio_id: servicioId,
          material_id: materialId,
          descripcion: descripcion.trim(),
          cantidad: Number(cantidad),
          unidad_de_medida: unidad_de_medida.trim(),
          precio_unitario: Number(precio_unitario),
        },
        include: {
          servicio_id_servicios: true,
          material_id_materiales: true,
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Detalle de servicio creado",
        mensaje: `Se agregó el material "${nuevo.material_id_materiales?.nombre_material ?? "Material"}" al servicio "${nuevo.servicio_id_servicios?.nombre_servicio ?? "Servicio"}".`,
        modulo: "Detalles Servicios",
        referencia_id: nuevo.detalle_servicio_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Detalle creado correctamente",
        data: {
          ...nuevo,
          total: Number(nuevo.cantidad) * Number(nuevo.precio_unitario),
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al crear detalle de servicio",
        mensaje:
          error.message ||
          "Ocurrió un error al crear el detalle del servicio.",
        modulo: "Detalles Servicios",
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Error interno al crear el detalle.",
      });
    }
  }

  static async update(req, res) {
    try {
      const usuario_id = req.user?.usuario_id ?? null;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "El ID debe ser numérico.",
        });
      }

      const existente = await prisma.detalles_servicios.findUnique({
        where: {
          detalle_servicio_id: id,
        },
      });

      if (!existente || existente.fecha_eliminacion !== null) {
        return res.status(404).json({
          ok: false,
          msg: "El detalle no existe o ya fue eliminado",
        });
      }

      const {
        servicio_id,
        material_id,
        descripcion,
        cantidad,
        unidad_de_medida,
        precio_unitario,
      } = req.body;

      if (cantidad !== undefined && Number(cantidad) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "La cantidad debe ser mayor que cero.",
        });
      }

      if (precio_unitario !== undefined && Number(precio_unitario) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser mayor que cero.",
        });
      }

      let servicioId = existente.servicio_id;

      if (servicio_id !== undefined) {
        const servOk = await prisma.servicios.findFirst({
          where: {
            servicio_id: Number(servicio_id),
            fecha_eliminacion: null,
          },
        });

        if (!servOk) {
          return res.status(400).json({
            ok: false,
            msg: "El servicio indicado no existe.",
          });
        }

        servicioId = Number(servicio_id);
      }

      let materialId = existente.material_id;

      if (material_id !== undefined) {
        const matOk = await prisma.materiales.findFirst({
          where: {
            material_id: Number(material_id),
            fecha_eliminacion: null,
          },
        });

        if (!matOk) {
          return res.status(400).json({
            ok: false,
            msg: "El material indicado no existe.",
          });
        }

        materialId = Number(material_id);
      }

      const actualizado = await prisma.detalles_servicios.update({
        where: {
          detalle_servicio_id: id,
        },
        data: {
          servicio_id: servicioId,
          material_id: materialId,
          descripcion: descripcion?.trim() ?? existente.descripcion,
          cantidad:
            cantidad !== undefined ? Number(cantidad) : existente.cantidad,
          unidad_de_medida:
            unidad_de_medida?.trim() ?? existente.unidad_de_medida,
          precio_unitario:
            precio_unitario !== undefined
              ? Number(precio_unitario)
              : existente.precio_unitario,
          fecha_actualizacion: new Date(),
        },
        include: {
          servicio_id_servicios: true,
          material_id_materiales: true,
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Detalle de servicio actualizado",
        mensaje: `Se actualizó el detalle del material "${actualizado.material_id_materiales?.nombre_material ?? "Material"}" en el servicio "${actualizado.servicio_id_servicios?.nombre_servicio ?? "Servicio"}".`,
        modulo: "Detalles Servicios",
        referencia_id: actualizado.detalle_servicio_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Detalle actualizado",
        data: {
          ...actualizado,
          total:
            Number(actualizado.cantidad) *
            Number(actualizado.precio_unitario),
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al actualizar detalle de servicio",
        mensaje:
          error.message ||
          "Ocurrió un error al actualizar el detalle del servicio.",
        modulo: "Detalles Servicios",
        referencia_id: isNaN(Number(req.params.id))
          ? null
          : Number(req.params.id),
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Error interno al actualizar",
      });
    }
  }

  static async delete(req, res) {
    try {
      const usuario_id = req.user?.usuario_id ?? null;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "El ID debe ser numérico.",
        });
      }

      const existe = await prisma.detalles_servicios.findFirst({
        where: {
          detalle_servicio_id: id,
          fecha_eliminacion: null,
        },
        include: {
          servicio_id_servicios: true,
          material_id_materiales: true,
        },
      });

      if (!existe) {
        return res.status(404).json({
          ok: false,
          msg: "No se encontró el detalle a eliminar",
        });
      }

      const eliminado = await prisma.detalles_servicios.update({
        where: {
          detalle_servicio_id: id,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Detalle de servicio eliminado",
        mensaje: `Se eliminó el material "${existe.material_id_materiales?.nombre_material ?? "Material"}" del servicio "${existe.servicio_id_servicios?.nombre_servicio ?? "Servicio"}".`,
        modulo: "Detalles Servicios",
        referencia_id: eliminado.detalle_servicio_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Detalle eliminado correctamente",
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al eliminar detalle de servicio",
        mensaje:
          error.message ||
          "Ocurrió un error al eliminar el detalle del servicio.",
        modulo: "Detalles Servicios",
        referencia_id: isNaN(Number(req.params.id))
          ? null
          : Number(req.params.id),
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Error interno al eliminar",
      });
    }
  }
}