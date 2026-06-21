import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class MaterialesController {
  static async getAll(_req, res) {
    try {
      const materiales = await prisma.materiales.findMany({
        where: {
          fecha_eliminacion: null,
        },
        include: {
          categorias: {
            select: {
              categoria_id: true,
              nombre_categoria: true,
            },
          },
          _count: {
            select: {
              movimientos_inventario: true,
              alertas_inventario: true,
            },
          },
        },
        orderBy: {
          material_id: "asc",
        },
      });

      res.json({
        ok: true,
        data: materiales,
      });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener materiales",
        mensaje: error.message || "Ocurrió un error al cargar los materiales.",
        modulo: "Materiales",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener los materiales.",
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
        titulo: "Material no consultado",
        mensaje: "No se pudo consultar el material porque el ID no es válido.",
        modulo: "Materiales",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico.",
      });
    }

    try {
      const material = await prisma.materiales.findFirst({
        where: {
          material_id: id,
          fecha_eliminacion: null,
        },
        include: {
          categorias: {
            select: {
              categoria_id: true,
              nombre_categoria: true,
            },
          },
          movimientos_inventario: {
            orderBy: {
              fecha_movimiento: "desc",
            },
          },
          alertas_inventario: {
            where: {
              fecha_eliminacion: null,
            },
            orderBy: {
              fecha_creacion: "desc",
            },
          },
        },
      });

      if (!material) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no encontrado",
          mensaje: `No se encontró el material con ID ${id}.`,
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: `No se encontró el material con ID ${id}.`,
        });
      }

      res.json({
        ok: true,
        data: material,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al obtener material",
        mensaje: error.message || "Ocurrió un error al obtener el material.",
        modulo: "Materiales",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener el material.",
      });
    }
  }

  static async create(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;

    try {
      const {
        nombre_material,
        categoria_id,
        descripcion,
        unidad_de_medida,
        cantidad_en_stock,
        stock_minimo,
        precio_unitario,
      } = req.body;

      if (
        !nombre_material ||
        !unidad_de_medida ||
        cantidad_en_stock == null ||
        precio_unitario == null
      ) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje:
            "No se pudo crear el material porque faltan campos obligatorios.",
          modulo: "Materiales",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Faltan campos obligatorios.",
        });
      }

      const cantidadFinal = Number(cantidad_en_stock);
      const stockMinimoFinal =
        stock_minimo != null && stock_minimo !== "" ? Number(stock_minimo) : 10;
      const precioFinal = Number(precio_unitario);

      if (isNaN(cantidadFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje:
            "No se pudo crear el material porque la cantidad en stock no es numérica.",
          modulo: "Materiales",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cantidad en stock debe ser numérica.",
        });
      }

      if (isNaN(stockMinimoFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje:
            "No se pudo crear el material porque el stock mínimo no es numérico.",
          modulo: "Materiales",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El stock mínimo debe ser numérico.",
        });
      }

      if (isNaN(precioFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje:
            "No se pudo crear el material porque el precio unitario no es numérico.",
          modulo: "Materiales",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser numérico.",
        });
      }

      if (cantidadFinal < 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje:
            "No se pudo crear el material porque la cantidad en stock no puede ser negativa.",
          modulo: "Materiales",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cantidad en stock no puede ser negativa.",
        });
      }

      if (stockMinimoFinal < 10) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje:
            "No se pudo crear el material porque el stock mínimo no puede ser menor a 10 unidades.",
          modulo: "Materiales",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El stock mínimo no puede ser menor a 10 unidades.",
        });
      }

      if (cantidadFinal < stockMinimoFinal) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje:
            "No se pudo crear el material porque la cantidad en stock no puede ser menor al stock mínimo.",
          modulo: "Materiales",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cantidad en stock no puede ser menor al stock mínimo.",
        });
      }

      if (precioFinal <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje:
            "No se pudo crear el material porque el precio unitario debe ser mayor que cero.",
          modulo: "Materiales",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser mayor que cero.",
        });
      }

      if (categoria_id) {
        const categoria = await prisma.categorias.findFirst({
          where: {
            categoria_id: Number(categoria_id),
            fecha_eliminacion: null,
          },
        });

        if (!categoria) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Material no creado",
            mensaje:
              "No se pudo crear el material porque la categoría seleccionada no existe o fue eliminada.",
            modulo: "Materiales",
            referencia_id: null,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "La categoría seleccionada no existe o fue eliminada.",
          });
        }
      }

      const existe = await prisma.materiales.findFirst({
        where: {
          nombre_material: {
            equals: nombre_material.trim(),
            mode: "insensitive",
          },
          fecha_eliminacion: null,
        },
      });

      if (existe) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no creado",
          mensaje: `No se pudo crear el material porque ya existe un material llamado "${nombre_material.trim()}".`,
          modulo: "Materiales",
          referencia_id: existe.material_id,
          prioridad: "Alta",
        });

        return res.status(409).json({
          ok: false,
          msg: "Ya existe un material con ese nombre.",
        });
      }

      const material = await prisma.materiales.create({
        data: {
          nombre_material: nombre_material.trim(),
          categoria_id: categoria_id ? Number(categoria_id) : null,
          descripcion: descripcion?.trim() || null,
          unidad_de_medida: unidad_de_medida.trim(),
          cantidad_en_stock: cantidadFinal,
          stock_minimo: stockMinimoFinal,
          precio_unitario: precioFinal,
        },
        include: {
          categorias: {
            select: {
              categoria_id: true,
              nombre_categoria: true,
            },
          },
          _count: {
            select: {
              movimientos_inventario: true,
              alertas_inventario: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Material creado",
        mensaje: `Se creó el material "${material.nombre_material}" con stock inicial de ${material.cantidad_en_stock} ${material.unidad_de_medida}.`,
        modulo: "Materiales",
        referencia_id: material.material_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Material creado correctamente.",
        data: material,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al crear material",
        mensaje: error.message || "Ocurrió un error al crear el material.",
        modulo: "Materiales",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al crear material.",
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
        titulo: "Material no actualizado",
        mensaje:
          "No se pudo actualizar el material porque el ID enviado no es válido.",
        modulo: "Materiales",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico.",
      });
    }

    try {
      const old = await prisma.materiales.findFirst({
        where: {
          material_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!old) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no actualizado",
          mensaje: `No se pudo actualizar el material con ID ${id} porque no existe o fue eliminado.`,
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Material no encontrado o ya eliminado.",
        });
      }

      const {
        nombre_material,
        categoria_id,
        descripcion,
        unidad_de_medida,
        cantidad_en_stock,
        stock_minimo,
        precio_unitario,
      } = req.body;

      const cantidadFinal =
        cantidad_en_stock !== undefined && cantidad_en_stock !== ""
          ? Number(cantidad_en_stock)
          : Number(old.cantidad_en_stock);

      const stockMinimoFinal =
        stock_minimo !== undefined && stock_minimo !== ""
          ? Number(stock_minimo)
          : Number(old.stock_minimo);

      const precioFinal =
        precio_unitario !== undefined && precio_unitario !== ""
          ? Number(precio_unitario)
          : Number(old.precio_unitario);

      if (isNaN(cantidadFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no actualizado",
          mensaje:
            "No se pudo actualizar el material porque la cantidad en stock no es numérica.",
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cantidad en stock debe ser numérica.",
        });
      }

      if (isNaN(stockMinimoFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no actualizado",
          mensaje:
            "No se pudo actualizar el material porque el stock mínimo no es numérico.",
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El stock mínimo debe ser numérico.",
        });
      }

      if (isNaN(precioFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no actualizado",
          mensaje:
            "No se pudo actualizar el material porque el precio unitario no es numérico.",
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser numérico.",
        });
      }

      if (cantidadFinal < 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no actualizado",
          mensaje:
            "No se pudo actualizar el material porque la cantidad en stock no puede ser negativa.",
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cantidad en stock no puede ser negativa.",
        });
      }

      if (stockMinimoFinal < 10) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no actualizado",
          mensaje:
            "No se pudo actualizar el material porque el stock mínimo no puede ser menor a 10 unidades.",
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El stock mínimo no puede ser menor a 10 unidades.",
        });
      }

      if (cantidadFinal < stockMinimoFinal) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no actualizado",
          mensaje:
            "No se pudo actualizar el material porque la cantidad en stock no puede ser menor al stock mínimo.",
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cantidad en stock no puede ser menor al stock mínimo.",
        });
      }

      if (precioFinal <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no actualizado",
          mensaje:
            "No se pudo actualizar el material porque el precio unitario debe ser mayor que cero.",
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser mayor que cero.",
        });
      }

      if (categoria_id) {
        const categoria = await prisma.categorias.findFirst({
          where: {
            categoria_id: Number(categoria_id),
            fecha_eliminacion: null,
          },
        });

        if (!categoria) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Material no actualizado",
            mensaje:
              "No se pudo actualizar el material porque la categoría seleccionada no existe o fue eliminada.",
            modulo: "Materiales",
            referencia_id: id,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "La categoría seleccionada no existe o fue eliminada.",
          });
        }
      }

      const nombreFinal = nombre_material?.trim() ?? old.nombre_material;

      if (nombreFinal !== old.nombre_material) {
        const existe = await prisma.materiales.findFirst({
          where: {
            nombre_material: {
              equals: nombreFinal,
              mode: "insensitive",
            },
            fecha_eliminacion: null,
            NOT: {
              material_id: id,
            },
          },
        });

        if (existe) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Material no actualizado",
            mensaje: `No se pudo actualizar el material porque ya existe otro material llamado "${nombreFinal}".`,
            modulo: "Materiales",
            referencia_id: id,
            prioridad: "Alta",
          });

          return res.status(409).json({
            ok: false,
            msg: "Ya existe otro material con ese nombre.",
          });
        }
      }

      const material = await prisma.materiales.update({
        where: {
          material_id: id,
        },
        data: {
          nombre_material: nombreFinal,
          categoria_id:
            categoria_id !== undefined
              ? categoria_id
                ? Number(categoria_id)
                : null
              : old.categoria_id,
          descripcion:
            descripcion !== undefined
              ? descripcion?.trim() || null
              : old.descripcion,
          unidad_de_medida: unidad_de_medida?.trim() ?? old.unidad_de_medida,
          cantidad_en_stock: cantidadFinal,
          stock_minimo: stockMinimoFinal,
          precio_unitario: precioFinal,
          fecha_actualizacion: new Date(),
        },
        include: {
          categorias: {
            select: {
              categoria_id: true,
              nombre_categoria: true,
            },
          },
          _count: {
            select: {
              movimientos_inventario: true,
              alertas_inventario: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Material actualizado",
        mensaje: `Se actualizó el material "${material.nombre_material}".`,
        modulo: "Materiales",
        referencia_id: material.material_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Material actualizado correctamente.",
        data: material,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al actualizar material",
        mensaje:
          error.message || "Ocurrió un error al actualizar el material.",
        modulo: "Materiales",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al actualizar material.",
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
        titulo: "Material no eliminado",
        mensaje:
          "No se pudo eliminar el material porque el ID enviado no es válido.",
        modulo: "Materiales",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico.",
      });
    }

    try {
      const material = await prisma.materiales.findFirst({
        where: {
          material_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!material) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no eliminado",
          mensaje: `No se pudo eliminar el material con ID ${id} porque no existe o ya fue eliminado.`,
          modulo: "Materiales",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Material no encontrado o ya eliminado.",
        });
      }

      const eliminado = await prisma.materiales.update({
        where: {
          material_id: id,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Material eliminado",
        mensaje: `Se eliminó el material "${material.nombre_material}".`,
        modulo: "Materiales",
        referencia_id: eliminado.material_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Material eliminado correctamente.",
        id: eliminado.material_id,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al eliminar material",
        mensaje: error.message || "Ocurrió un error al eliminar el material.",
        modulo: "Materiales",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar material.",
      });
    }
  }
}