import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class ProveedoresController {
  static async getAll(_req, res) {
    try {
      const proveedores = await prisma.proveedores.findMany({
        where: { fecha_eliminacion: null },
        include: {
          categorias_proveedor: {
            select: {
              nombre_categoria: true,
            },
          },
        },
        orderBy: { proveedor_id: "asc" },
      });

      const data = proveedores.map((p) => ({
        ...p,
        categoria: p.categorias_proveedor?.nombre_categoria ?? null,
      }));

      res.json({ ok: true, data });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener proveedores",
        mensaje:
          error.message || "Ocurrió un error al cargar los proveedores.",
        modulo: "Proveedores",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener los proveedores.",
      });
    }
  }

  static async getById(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const idNum = parseInt(req.params.id);

    if (isNaN(idNum)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Proveedor no consultado",
        mensaje: "No se pudo consultar el proveedor porque el ID no es válido.",
        modulo: "Proveedores",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser un número.",
      });
    }

    try {
      const proveedor = await prisma.proveedores.findFirst({
        where: {
          proveedor_id: idNum,
          fecha_eliminacion: null,
        },
        include: {
          categorias_proveedor: {
            select: {
              nombre_categoria: true,
            },
          },
        },
      });

      if (!proveedor) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no encontrado",
          mensaje: `No se encontró el proveedor con ID ${idNum}.`,
          modulo: "Proveedores",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: `No se encontró el proveedor con ID ${idNum}.`,
        });
      }

      res.json({
        ok: true,
        data: {
          ...proveedor,
          categoria: proveedor.categorias_proveedor?.nombre_categoria ?? null,
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al obtener proveedor",
        mensaje:
          error.message ||
          `Ocurrió un error al obtener el proveedor con ID ${idNum}.`,
        modulo: "Proveedores",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener el proveedor.",
      });
    }
  }

  static async create(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;

    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no creado",
          mensaje:
            "No se pudo crear el proveedor porque el cuerpo de la petición está vacío o mal formateado.",
          modulo: "Proveedores",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El cuerpo de la petición está vacío o mal formateado.",
        });
      }

      const {
        categoria_proveedor_id,
        nombre_empresa,
        nombre_contacto,
        cargo_contacto,
        direccion,
        ciudad,
        pais,
        telefono,
        correo,
      } = req.body;

      if (!categoria_proveedor_id || !nombre_empresa) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no creado",
          mensaje:
            "No se pudo crear el proveedor porque faltan campos obligatorios: categoría y nombre de empresa.",
          modulo: "Proveedores",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: categoria_proveedor_id y nombre_empresa.",
        });
      }

      const catId = parseInt(categoria_proveedor_id);

      if (isNaN(catId)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no creado",
          mensaje:
            "No se pudo crear el proveedor porque la categoría enviada no es válida.",
          modulo: "Proveedores",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La categoría debe ser un número válido.",
        });
      }

      const catOk = await prisma.categorias_proveedor.findFirst({
        where: {
          categoria_proveedor_id: catId,
          fecha_eliminacion: null,
        },
      });

      if (!catOk) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no creado",
          mensaje: `No se pudo crear el proveedor porque la categoría con ID ${catId} no existe o fue dada de baja.`,
          modulo: "Proveedores",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La categoría no existe o fue dada de baja.",
        });
      }

      if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no creado",
          mensaje:
            "No se pudo crear el proveedor porque el correo ingresado no tiene un formato válido.",
          modulo: "Proveedores",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El correo ingresado no tiene un formato válido.",
        });
      }

      if (telefono && !/^[0-9]+$/.test(telefono.trim())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no creado",
          mensaje:
            "No se pudo crear el proveedor porque el teléfono contiene caracteres no válidos.",
          modulo: "Proveedores",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El teléfono debe contener solo números.",
        });
      }

      const proveedor = await prisma.proveedores.create({
        data: {
          categoria_proveedor_id: catId,
          nombre_empresa: nombre_empresa.trim(),
          nombre_contacto: nombre_contacto?.trim() ?? null,
          cargo_contacto: cargo_contacto?.trim() ?? null,
          direccion: direccion?.trim() ?? null,
          ciudad: ciudad?.trim() ?? null,
          pais: pais?.trim() ?? null,
          telefono: telefono?.trim() ?? null,
          correo: correo?.trim() ?? null,
        },
        include: {
          categorias_proveedor: {
            select: {
              nombre_categoria: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Proveedor creado",
        mensaje: `Se creó el proveedor "${proveedor.nombre_empresa}".`,
        modulo: "Proveedores",
        referencia_id: proveedor.proveedor_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Proveedor creado correctamente.",
        data: {
          ...proveedor,
          categoria: proveedor.categorias_proveedor?.nombre_categoria ?? null,
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al crear proveedor",
        mensaje: error.message || "Ocurrió un error al crear el proveedor.",
        modulo: "Proveedores",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al crear el proveedor.",
      });
    }
  }

  static async update(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const idNum = parseInt(req.params.id);

    if (isNaN(idNum)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Proveedor no actualizado",
        mensaje:
          "No se pudo actualizar el proveedor porque el ID enviado no es válido.",
        modulo: "Proveedores",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser un número.",
      });
    }

    try {
      const old = await prisma.proveedores.findUnique({
        where: {
          proveedor_id: idNum,
        },
      });

      if (!old || old.fecha_eliminacion !== null) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no actualizado",
          mensaje: `No se pudo actualizar el proveedor con ID ${idNum} porque no existe o está eliminado.`,
          modulo: "Proveedores",
          referencia_id: idNum,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el proveedor a modificar.",
        });
      }

      const {
        categoria_proveedor_id,
        nombre_empresa,
        nombre_contacto,
        cargo_contacto,
        direccion,
        ciudad,
        pais,
        telefono,
        correo,
      } = req.body;

      let catId = old.categoria_proveedor_id;

      if (categoria_proveedor_id) {
        catId = parseInt(categoria_proveedor_id);

        if (isNaN(catId)) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Proveedor no actualizado",
            mensaje:
              "No se pudo actualizar el proveedor porque la categoría enviada no es válida.",
            modulo: "Proveedores",
            referencia_id: idNum,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "La categoría debe ser un número válido.",
          });
        }

        const catOk = await prisma.categorias_proveedor.findFirst({
          where: {
            categoria_proveedor_id: catId,
            fecha_eliminacion: null,
          },
        });

        if (!catOk) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Proveedor no actualizado",
            mensaje: `No se pudo actualizar el proveedor porque la categoría con ID ${catId} no existe o fue dada de baja.`,
            modulo: "Proveedores",
            referencia_id: idNum,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "La categoría no existe o fue dada de baja.",
          });
        }
      }

      if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no actualizado",
          mensaje:
            "No se pudo actualizar el proveedor porque el correo ingresado no tiene un formato válido.",
          modulo: "Proveedores",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El correo ingresado no tiene un formato válido.",
        });
      }

      if (telefono && !/^[0-9]+$/.test(telefono.trim())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no actualizado",
          mensaje:
            "No se pudo actualizar el proveedor porque el teléfono contiene caracteres no válidos.",
          modulo: "Proveedores",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El teléfono debe contener solo números.",
        });
      }

      const proveedor = await prisma.proveedores.update({
        where: {
          proveedor_id: idNum,
        },
        data: {
          categoria_proveedor_id: catId,
          nombre_empresa: nombre_empresa?.trim() ?? old.nombre_empresa,
          nombre_contacto: nombre_contacto?.trim() ?? old.nombre_contacto,
          cargo_contacto: cargo_contacto?.trim() ?? old.cargo_contacto,
          direccion: direccion?.trim() ?? old.direccion,
          ciudad: ciudad?.trim() ?? old.ciudad,
          pais: pais?.trim() ?? old.pais,
          telefono: telefono?.trim() ?? old.telefono,
          correo: correo?.trim() ?? old.correo,
          fecha_actualizacion: new Date(),
        },
        include: {
          categorias_proveedor: {
            select: {
              nombre_categoria: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Proveedor actualizado",
        mensaje: `Se actualizó el proveedor "${proveedor.nombre_empresa}".`,
        modulo: "Proveedores",
        referencia_id: proveedor.proveedor_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Proveedor actualizado correctamente.",
        data: {
          ...proveedor,
          categoria: proveedor.categorias_proveedor?.nombre_categoria ?? null,
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al actualizar proveedor",
        mensaje:
          error.message || "Ocurrió un error al actualizar el proveedor.",
        modulo: "Proveedores",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al actualizar el proveedor.",
      });
    }
  }

  static async delete(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const idNum = parseInt(req.params.id);

    if (isNaN(idNum)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Proveedor no eliminado",
        mensaje:
          "No se pudo eliminar el proveedor porque el ID enviado no es válido.",
        modulo: "Proveedores",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser un número.",
      });
    }

    try {
      const existe = await prisma.proveedores.findFirst({
        where: {
          proveedor_id: idNum,
          fecha_eliminacion: null,
        },
      });

      if (!existe) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proveedor no eliminado",
          mensaje: `No se pudo eliminar el proveedor con ID ${idNum} porque no existe o ya fue eliminado.`,
          modulo: "Proveedores",
          referencia_id: idNum,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el proveedor a eliminar.",
        });
      }

      const eliminado = await prisma.proveedores.update({
        where: {
          proveedor_id: idNum,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Proveedor eliminado",
        mensaje: `Se eliminó el proveedor "${existe.nombre_empresa}".`,
        modulo: "Proveedores",
        referencia_id: eliminado.proveedor_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Proveedor eliminado correctamente.",
        id: eliminado.proveedor_id,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al eliminar proveedor",
        mensaje: error.message || "Ocurrió un error al eliminar el proveedor.",
        modulo: "Proveedores",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar el proveedor.",
      });
    }
  }
}