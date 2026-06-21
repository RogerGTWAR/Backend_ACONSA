import prisma from "../database.js";

const mapWithCalcs = (row) => {
  const cantidad = Number(row.cantidad_material ?? 0);
  const precio = Number(row.precio_unitario ?? 0);

  const costo_material = cantidad * precio;
  const mano_obra = costo_material * 0.40;
  const equipos_transporte_herramientas = costo_material * 0.10;
  const total_costo_directo =
    costo_material + mano_obra + equipos_transporte_herramientas;

  return {
    ...row,
    costo_material: Number(costo_material.toFixed(2)),
    mano_obra: Number(mano_obra.toFixed(2)),
    equipos_transporte_herramientas: Number(equipos_transporte_herramientas.toFixed(2)),
    total_costo_directo: Number(total_costo_directo.toFixed(2)),
  };
};

export default class CostosDirectosServiciosController {

  static async getAll(_req, res) {
    try {
      const detalles = await prisma.costos_directos_servicios.findMany({
        where: { fecha_eliminacion: null },
        include: {
          servicio_id_servicios: {
            select: {
              servicio_id: true,
              nombre_servicio: true,
              descripcion: true,
              total_costo_directo: true,
              total_costo_indirecto: true,
              fecha_creacion: true,
              fecha_actualizacion: true,
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
        orderBy: { costo_directo_id: "asc" },
      });

      res.json({
        ok: true,
        data: detalles.map(mapWithCalcs),
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        ok: false,
        msg: "Server error, something went wrong",
      });
    }
  }

  static async getById(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ ok: false, msg: "ID inválido" });

    try {
      const detalle = await prisma.costos_directos_servicios.findFirst({
        where: { costo_directo_id: id, fecha_eliminacion: null },
        include: {
          servicio_id_servicios: {
            select: {
              servicio_id: true,
              nombre_servicio: true,
              descripcion: true,
              total_costo_directo: true,
              total_costo_indirecto: true,
            },
          },
          material_id_materiales: true,
        },
      });

      if (!detalle)
        return res.status(404).json({ ok: false, msg: "Registro no encontrado" });

      res.json({
        ok: true,
        data: mapWithCalcs(detalle),
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        ok: false,
        msg: "Server error, something went wrong",
      });
    }
  }

  static async create(req, res) {
    try {
      const {
        servicio_id,
        material_id,
        cantidad_material,
        unidad_de_medida,
        precio_unitario,
      } = req.body;

      if (
        !servicio_id ||
        !material_id ||
        !cantidad_material ||
        !unidad_de_medida ||
        !precio_unitario
      ) {
        return res.status(400).json({
          ok: false,
          msg: "Faltan campos requeridos.",
        });
      }

      const servId = Number(servicio_id);
      const matId = Number(material_id);

      const servicioExiste = await prisma.servicios.findFirst({
        where: { servicio_id: servId, fecha_eliminacion: null },
      });

      if (!servicioExiste)
        return res.status(400).json({
          ok: false,
          msg: "El servicio no existe.",
        });

      const materialExiste = await prisma.materiales.findFirst({
        where: { material_id: matId, fecha_eliminacion: null },
      });

      if (!materialExiste)
        return res.status(400).json({
          ok: false,
          msg: "El material no existe.",
        });

      const previo = await prisma.costos_directos_servicios.findFirst({
        where: { servicio_id: servId, material_id: matId },
      });

      if (previo && previo.fecha_eliminacion !== null) {
        const reactivado = await prisma.costos_directos_servicios.update({
          where: { costo_directo_id: previo.costo_directo_id },
          data: {
            fecha_eliminacion: null,
            cantidad_material,
            unidad_de_medida,
            precio_unitario: Number(precio_unitario),
            fecha_actualizacion: new Date(),
          },
          include: {
            servicio_id_servicios: true,
            material_id_materiales: true,
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

      const nuevo = await prisma.costos_directos_servicios.create({
        data: {
          servicio_id: servId,
          material_id: matId,
          cantidad_material,
          unidad_de_medida,
          precio_unitario: Number(precio_unitario),
        },
        include: {
          servicio_id_servicios: true,
          material_id_materiales: true,
        },
      });

      res.status(201).json({
        ok: true,
        msg: "Creado correctamente.",
        data: mapWithCalcs(nuevo),
      });

    } catch (error) {
      console.error("Error create:", error);
      res.status(500).json({
        ok: false,
        msg: "Error interno al crear el costo directo.",
      });
    }
  }

  static async update(req, res) {
    try {
      const id = Number(req.params.id);

      if (isNaN(id))
        return res.status(400).json({ ok: false, msg: "ID inválido" });

      const existe = await prisma.costos_directos_servicios.findUnique({
        where: { costo_directo_id: id },
      });

      if (!existe || existe.fecha_eliminacion !== null)
        return res
          .status(404)
          .json({ ok: false, msg: "No existe o fue eliminado." });

      const {
        servicio_id,
        material_id,
        cantidad_material,
        unidad_de_medida,
        precio_unitario,
      } = req.body;

      const actualizado = await prisma.costos_directos_servicios.update({
        where: { costo_directo_id: id },
        data: {
          servicio_id: servicio_id ? Number(servicio_id) : existe.servicio_id,
          material_id: material_id ? Number(material_id) : existe.material_id,
          cantidad_material:
            cantidad_material !== undefined
              ? cantidad_material
              : existe.cantidad_material,
          unidad_de_medida: unidad_de_medida ?? existe.unidad_de_medida,
          precio_unitario:
            precio_unitario !== undefined
              ? Number(precio_unitario)
              : existe.precio_unitario,
          fecha_actualizacion: new Date(),
        },
        include: {
          servicio_id_servicios: true,
          material_id_materiales: true,
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
        return res.status(400).json({ ok: false, msg: "ID inválido" });

      const existe = await prisma.costos_directos_servicios.findFirst({
        where: { costo_directo_id: id, fecha_eliminacion: null },
      });

      if (!existe)
        return res
          .status(404)
          .json({ ok: false, msg: "Registro no encontrado." });

      await prisma.costos_directos_servicios.update({
        where: { costo_directo_id: id },
        data: { fecha_eliminacion: new Date() },
      });

      res.json({
        ok: true,
        msg: "Eliminado correctamente.",
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
