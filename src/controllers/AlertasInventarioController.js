import prisma from "../database.js";

export default class AlertasInventarioController {
  static async getAll(_req, res) {
    try {
      const alertas = await prisma.alertas_inventario.findMany({
        where: {
          fecha_eliminacion: null,
        },
        include: {
          materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              cantidad_en_stock: true,
              stock_minimo: true,
              precio_unitario: true,
            },
          },
        },
        orderBy: {
          fecha_creacion: "desc",
        },
      });

      res.json({ ok: true, data: alertas });
    } catch (error) {
      console.error("Error getAll alertas inventario:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener las alertas de inventario",
      });
    }
  }

  static async getPendientes(_req, res) {
    try {
      const alertas = await prisma.alertas_inventario.findMany({
        where: {
          estado: "Pendiente",
          fecha_eliminacion: null,
        },
        include: {
          materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              cantidad_en_stock: true,
              stock_minimo: true,
              precio_unitario: true,
            },
          },
        },
        orderBy: {
          fecha_creacion: "desc",
        },
      });

      res.json({ ok: true, data: alertas });
    } catch (error) {
      console.error("Error getPendientes alertas inventario:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener las alertas pendientes",
      });
    }
  }

  static async getById(req, res) {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico",
      });
    }

    try {
      const alerta = await prisma.alertas_inventario.findFirst({
        where: {
          alerta_id: id,
          fecha_eliminacion: null,
        },
        include: {
          materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              cantidad_en_stock: true,
              stock_minimo: true,
              precio_unitario: true,
            },
          },
        },
      });

      if (!alerta) {
        return res.status(404).json({
          ok: false,
          msg: `No se encontró la alerta con ID ${id}`,
        });
      }

      res.json({ ok: true, data: alerta });
    } catch (error) {
      console.error("Error getById alertas inventario:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener la alerta de inventario",
      });
    }
  }

  static async getByMaterial(req, res) {
    const material_id = parseInt(req.params.material_id);

    if (isNaN(material_id)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del material debe ser numérico",
      });
    }

    try {
      const material = await prisma.materiales.findFirst({
        where: {
          material_id,
          fecha_eliminacion: null,
        },
      });

      if (!material) {
        return res.status(404).json({
          ok: false,
          msg: "Material no encontrado",
        });
      }

      const alertas = await prisma.alertas_inventario.findMany({
        where: {
          material_id,
          fecha_eliminacion: null,
        },
        include: {
          materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              cantidad_en_stock: true,
              stock_minimo: true,
              precio_unitario: true,
            },
          },
        },
        orderBy: {
          fecha_creacion: "desc",
        },
      });

      res.json({ ok: true, data: alertas });
    } catch (error) {
      console.error("Error getByMaterial alertas inventario:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener alertas del material",
      });
    }
  }

  static async atender(req, res) {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico",
      });
    }

    try {
      const alerta = await prisma.alertas_inventario.findFirst({
        where: {
          alerta_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!alerta) {
        return res.status(404).json({
          ok: false,
          msg: "Alerta no encontrada o ya eliminada",
        });
      }

      const alertaActualizada = await prisma.alertas_inventario.update({
        where: {
          alerta_id: id,
        },
        data: {
          estado: "Atendida",
          fecha_atendida: new Date(),
          fecha_actualizacion: new Date(),
        },
        include: {
          materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              cantidad_en_stock: true,
              stock_minimo: true,
              precio_unitario: true,
            },
          },
        },
      });

      res.json({
        ok: true,
        msg: "Alerta atendida correctamente",
        data: alertaActualizada,
      });
    } catch (error) {
      console.error("Error atender alerta inventario:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al atender alerta",
      });
    }
  }

  static async cancelar(req, res) {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico",
      });
    }

    try {
      const alerta = await prisma.alertas_inventario.findFirst({
        where: {
          alerta_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!alerta) {
        return res.status(404).json({
          ok: false,
          msg: "Alerta no encontrada o ya eliminada",
        });
      }

      const alertaActualizada = await prisma.alertas_inventario.update({
        where: {
          alerta_id: id,
        },
        data: {
          estado: "Cancelada",
          fecha_actualizacion: new Date(),
        },
        include: {
          materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              cantidad_en_stock: true,
              stock_minimo: true,
              precio_unitario: true,
            },
          },
        },
      });

      res.json({
        ok: true,
        msg: "Alerta cancelada correctamente",
        data: alertaActualizada,
      });
    } catch (error) {
      console.error("Error cancelar alerta inventario:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al cancelar alerta",
      });
    }
  }

  static async delete(req, res) {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico",
      });
    }

    try {
      const alerta = await prisma.alertas_inventario.findFirst({
        where: {
          alerta_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!alerta) {
        return res.status(404).json({
          ok: false,
          msg: "Alerta no encontrada o ya eliminada",
        });
      }

      await prisma.alertas_inventario.update({
        where: {
          alerta_id: id,
        },
        data: {
          fecha_eliminacion: new Date(),
        },
      });

      res.json({
        ok: true,
        msg: "Alerta eliminada correctamente",
      });
    } catch (error) {
      console.error("Error delete alerta inventario:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar alerta",
      });
    }
  }
}