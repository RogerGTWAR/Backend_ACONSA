import prisma from "../database.js";

const mapWithCalcs = (row) => {
  const total = Number(row.total_costo_directo ?? 0);

  const administracion = total * 0.05;
  const operacion = total * 0.10;
  const utilidad = total * 0.15;

  const precio_unitario = administracion + operacion + utilidad;
  const total_costo_indirecto = precio_unitario;

  return {
    ...row,
    administracion: Number(administracion.toFixed(2)),
    operacion: Number(operacion.toFixed(2)),
    utilidad: Number(utilidad.toFixed(2)),
    precio_unitario: Number(precio_unitario.toFixed(2)),
    total_costo_indirecto: Number(total_costo_indirecto.toFixed(2)),
  };
};

export default class CostosIndirectosServiciosController {

  static async getAll(_req, res) {
    try {
      const items = await prisma.costos_indirectos_servicios.findMany({
        where: { fecha_eliminacion: null },
        include: {
          costo_directo_id_costos_directos_servicios: {
            select: {
              costo_directo_id: true,
              cantidad_material: true,
              precio_unitario: true,
            },
          },
          servicio_id_servicios: {
            select: {
              servicio_id: true,
              nombre_servicio: true,
              descripcion: true,
              total_costo_directo: true,
              total_costo_indirecto: true,
            },
          },
        },
        orderBy: { costo_indirecto_id: "asc" },
      });

      res.json({
        ok: true,
        data: items.map(mapWithCalcs),
      });
    } catch (error) {
      console.error("Error getAll:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener costos indirectos.",
      });
    }
  }

  static async getById(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ ok: false, msg: "ID inválido." });

    try {
      const item = await prisma.costos_indirectos_servicios.findFirst({
        where: { costo_indirecto_id: id, fecha_eliminacion: null },
        include: {
          costo_directo_id_costos_directos_servicios: true,
          servicio_id_servicios: true,
        },
      });

      if (!item)
        return res
          .status(404)
          .json({ ok: false, msg: "Registro no encontrado." });

      res.json({ ok: true, data: mapWithCalcs(item) });
    } catch (error) {
      console.error("Error getById:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener el registro.",
      });
    }
  }

  static async create(req, res) {
    try {
      const { servicio_id, costo_directo_id, total_costo_directo } = req.body;

      if (!servicio_id || !costo_directo_id || !total_costo_directo) {
        return res.status(400).json({
          ok: false,
          msg: "Faltan campos requeridos.",
        });
      }

      const servId = Number(servicio_id);
      const dirId = Number(costo_directo_id);

      const servicioExiste = await prisma.servicios.findFirst({
        where: { servicio_id: servId, fecha_eliminacion: null },
      });

      if (!servicioExiste)
        return res.status(400).json({
          ok: false,
          msg: "El servicio no existe.",
        });

      const directoExiste =
        await prisma.costos_directos_servicios.findFirst({
          where: { costo_directo_id: dirId, fecha_eliminacion: null },
        });

      if (!directoExiste)
        return res.status(400).json({
          ok: false,
          msg: "El costo directo no existe.",
        });

      const previo = await prisma.costos_indirectos_servicios.findFirst({
        where: { servicio_id: servId, costo_directo_id: dirId },
      });

      if (previo && previo.fecha_eliminacion !== null) {
        const reactivado = await prisma.costos_indirectos_servicios.update({
          where: { costo_indirecto_id: previo.costo_indirecto_id },
          data: {
            fecha_eliminacion: null,
            total_costo_directo: Number(total_costo_directo),
            fecha_actualizacion: new Date(),
          },
          include: {
            costo_directo_id_costos_directos_servicios: true,
            servicio_id_servicios: true,
          },
        });

        return res.json({
          ok: true,
          msg: "Registro reactivado.",
          data: mapWithCalcs(reactivado),
        });
      }

      if (previo && previo.fecha_eliminacion === null) {
        return res.json({
          ok: true,
          msg: "El registro ya existe.",
          data: mapWithCalcs(previo),
        });
      }

      const nuevo = await prisma.costos_indirectos_servicios.create({
        data: {
          servicio_id: servId,
          costo_directo_id: dirId,
          total_costo_directo: Number(total_costo_directo),
        },
        include: {
          costo_directo_id_costos_directos_servicios: true,
          servicio_id_servicios: true,
        },
      });

      res.status(201).json({
        ok: true,
        msg: "Costo indirecto creado correctamente.",
        data: mapWithCalcs(nuevo),
      });
    } catch (error) {
      console.error("Error create:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al crear el costo indirecto.",
      });
    }
  }

  static async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ ok: false, msg: "ID inválido." });

      const existe = await prisma.costos_indirectos_servicios.findUnique({
        where: { costo_indirecto_id: id },
      });

      if (!existe || existe.fecha_eliminacion !== null)
        return res.status(404).json({
          ok: false,
          msg: "Registro no existe o está eliminado.",
        });

      const { servicio_id, costo_directo_id, total_costo_directo } = req.body;

      const actualizado =
        await prisma.costos_indirectos_servicios.update({
          where: { costo_indirecto_id: id },
          data: {
            servicio_id:
              servicio_id !== undefined
                ? Number(servicio_id)
                : existe.servicio_id,
            costo_directo_id:
              costo_directo_id !== undefined
                ? Number(costo_directo_id)
                : existe.costo_directo_id,
            total_costo_directo:
              total_costo_directo !== undefined
                ? Number(total_costo_directo)
                : existe.total_costo_directo,
            fecha_actualizacion: new Date(),
          },
          include: {
            costo_directo_id_costos_directos_servicios: true,
            servicio_id_servicios: true,
          },
        });

      res.json({
        ok: true,
        msg: "Actualizado correctamente.",
        data: mapWithCalcs(actualizado),
      });
    } catch (error) {
      console.error("Error update:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al actualizar.",
      });
    }
  }

  static async delete(req, res) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ ok: false, msg: "ID inválido." });

      const existe = await prisma.costos_indirectos_servicios.findFirst({
        where: { costo_indirecto_id: id, fecha_eliminacion: null },
      });

      if (!existe)
        return res.status(404).json({
          ok: false,
          msg: "Registro no encontrado.",
        });

      await prisma.costos_indirectos_servicios.update({
        where: { costo_indirecto_id: id },
        data: { fecha_eliminacion: new Date() },
      });

      res.json({
        ok: true,
        msg: "Costo indirecto eliminado correctamente.",
      });
    } catch (error) {
      console.error("Error delete:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar.",
      });
    }
  }
}
