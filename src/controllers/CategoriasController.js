import prisma from "../database.js";

export default class CategoriasController {
  static async getAll(_req, res) {
    try {
      const categorias = await prisma.categorias.findMany({
        where: { fecha_eliminacion: null },
        orderBy: { categoria_id: "asc" },
      });
      res.json({ ok: true, data: categorias });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }

  static async getById(req, res) {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ ok: false, msg: "El ID de la categoría debe ser un número" });

    try {
      const categoria = await prisma.categorias.findFirst({
        where: { AND: [{ categoria_id: id }, { fecha_eliminacion: null }] },
      });

      if (!categoria)
        return res
          .status(404)
          .json({ ok: false, msg: `No se encontró la categoría con ID ${id}` });

      res.json({ ok: true, data: categoria });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }

  static async create(req, res) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          ok: false,
          msg: "El cuerpo de la petición está vacío o mal formateado. Asegúrate de usar JSON.",
        });
      }

      const { nombre_categoria, descripcion } = req.body;

      if (!nombre_categoria || !descripcion) {
        return res.status(400).json({
          ok: false,
          msg: "Los campos 'nombre_categoria' y 'descripcion' son obligatorios.",
        });
      }

      const existe = await prisma.categorias.findFirst({
        where: { AND: [{ nombre_categoria: nombre_categoria.trim() }, { fecha_eliminacion: null }] },
      });
      if (existe) {
        return res.status(409).json({ ok: false, msg: "Ya existe una categoría con ese nombre" });
      }

      const categoria = await prisma.categorias.create({
        data: {
          nombre_categoria: nombre_categoria.trim(),
          descripcion: descripcion.trim(),
        },
      });

      res.status(201).json({ ok: true, msg: "Categoría creada correctamente", data: categoria });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }

  static async update(req, res) {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ ok: false, msg: "El ID de la categoría debe ser un número" });

    try {
      const old = await prisma.categorias.findUnique({ where: { categoria_id: id } });
      if (!old || old.fecha_eliminacion !== null) {
        return res.status(404).json({ ok: false, msg: "No se encontró la categoría a modificar" });
      }

      const { nombre_categoria, descripcion } = req.body;

      const categoria = await prisma.categorias.update({
        where: { categoria_id: id },
        data: {
          nombre_categoria: nombre_categoria?.trim() ?? old.nombre_categoria,
          descripcion: descripcion?.trim() ?? old.descripcion,
          fecha_actualizacion: new Date(),
        },
      });

      res.json({ ok: true, msg: "Categoría actualizada correctamente", data: categoria });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }

  static async delete(req, res) {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ ok: false, msg: "El ID de la categoría debe ser un número" });

    try {
      const existe = await prisma.categorias.findFirst({
        where: { AND: [{ categoria_id: id }, { fecha_eliminacion: null }] },
      });
      if (!existe)
        return res.status(404).json({ ok: false, msg: "No se encontró la categoría a eliminar" });

      const { categoria_id } = await prisma.categorias.update({
        where: { categoria_id: id },
        data: { fecha_eliminacion: new Date() },
      });

      res.json({ ok: true, msg: "Categoría eliminada correctamente", id: categoria_id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }
}
