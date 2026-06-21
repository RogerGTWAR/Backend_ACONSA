import prisma from "../database.js";

export default class CategoriasProveedorController {
  static async getAll(_req, res) {
    try {
      const categorias = await prisma.categorias_proveedor.findMany({
        where: { fecha_eliminacion: null },
        orderBy: { categoria_proveedor_id: "asc" }
      });
      res.json({ ok: true, data: categorias });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }

  static async getById(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) return res.status(400).json({ ok: false, msg: "El id de categoría debe ser un número" });

    try {
      const cat = await prisma.categorias_proveedor.findFirst({
        where: { AND: [{ categoria_proveedor_id: idNum }, { fecha_eliminacion: null }] }
      });
      if (!cat) return res.status(404).json({ ok: false, msg: `No se encontró la categoría con id: ${idNum}` });
      res.json({ ok: true, data: cat });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server Error, something went wrong" });
    }
  }

  static async create(req, res) {
    const { nombre_categoria, descripcion } = req.body;
    if (!nombre_categoria) {
      return res.status(400).json({ ok: false, msg: "El nombre de la categoría es obligatorio" });
    }

    try {
      const cat = await prisma.categorias_proveedor.create({
        data: {
          nombre_categoria,
          descripcion: descripcion ?? null
        }
      });
      res.status(201).json({ ok: true, msg: "Categoría creada correctamente", data: cat });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }

  static async update(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) return res.status(400).json({ ok: false, msg: "El id de categoría debe ser un número" });

    const old = await prisma.categorias_proveedor.findUnique({ where: { categoria_proveedor_id: idNum } });
    if (!old || old.fecha_eliminacion !== null) {
      return res.status(404).json({ ok: false, msg: "No se encontró la categoría que se desea modificar" });
    }

    const { nombre_categoria, descripcion } = req.body;

    try {
      const cat = await prisma.categorias_proveedor.update({
        where: { categoria_proveedor_id: idNum },
        data: {
          nombre_categoria: nombre_categoria ?? old.nombre_categoria,
          descripcion: descripcion ?? old.descripcion,
          fecha_actualizacion: new Date()
        }
      });
      res.json({ ok: true, msg: "Categoría actualizada correctamente", data: cat });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }

  static async delete(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) return res.status(400).json({ ok: false, msg: "El id de categoría debe ser un número" });

    const existe = await prisma.categorias_proveedor.findFirst({
      where: { AND: [{ categoria_proveedor_id: idNum }, { fecha_eliminacion: null }] }
    });
    if (!existe) return res.status(404).json({ ok: false, msg: "No se encontró la categoría que se desea eliminar" });

    try {
      const { categoria_proveedor_id } = await prisma.categorias_proveedor.update({
        where: { categoria_proveedor_id: idNum },
        data: { fecha_eliminacion: new Date() }
      });
      res.json({ ok: true, msg: "Categoría eliminada correctamente", id: categoria_proveedor_id });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }
}
