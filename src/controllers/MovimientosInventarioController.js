import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class MovimientosInventarioController {
  static async getAll(_req, res) {
    try {
      const movimientos = await prisma.movimientos_inventario.findMany({
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
          usuarios: {
            select: {
              usuario_id: true,
              usuario: true,
              empleados: {
                select: {
                  empleado_id: true,
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
        orderBy: {
          fecha_movimiento: "desc",
        },
      });

      res.json({
        ok: true,
        data: movimientos,
      });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener movimientos",
        mensaje:
          error.message ||
          "Ocurrió un error al obtener los movimientos de inventario.",
        modulo: "Movimientos de Inventario",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener los movimientos de inventario.",
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
        titulo: "Movimiento no consultado",
        mensaje:
          "No se pudo consultar el movimiento porque el ID enviado no es válido.",
        modulo: "Movimientos de Inventario",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico.",
      });
    }

    try {
      const movimiento = await prisma.movimientos_inventario.findUnique({
        where: {
          movimiento_id: id,
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
          usuarios: {
            select: {
              usuario_id: true,
              usuario: true,
              empleados: {
                select: {
                  empleado_id: true,
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
      });

      if (!movimiento) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Movimiento no encontrado",
          mensaje: `No se encontró el movimiento con ID ${id}.`,
          modulo: "Movimientos de Inventario",
          referencia_id: id,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: `No se encontró el movimiento con ID ${id}.`,
        });
      }

      res.json({
        ok: true,
        data: movimiento,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al obtener movimiento",
        mensaje:
          error.message ||
          "Ocurrió un error al obtener el movimiento de inventario.",
        modulo: "Movimientos de Inventario",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener el movimiento de inventario.",
      });
    }
  }

  static async getByMaterial(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const material_id = Number(req.params.material_id);

    if (isNaN(material_id)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Movimientos no consultados",
        mensaje:
          "No se pudieron consultar los movimientos porque el ID del material no es válido.",
        modulo: "Movimientos de Inventario",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del material debe ser numérico.",
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
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Material no encontrado",
          mensaje: `No se encontró el material con ID ${material_id} para consultar sus movimientos.`,
          modulo: "Movimientos de Inventario",
          referencia_id: material_id,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: "Material no encontrado.",
        });
      }

      const movimientos = await prisma.movimientos_inventario.findMany({
        where: {
          material_id,
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
          usuarios: {
            select: {
              usuario_id: true,
              usuario: true,
              empleados: {
                select: {
                  empleado_id: true,
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
        orderBy: {
          fecha_movimiento: "desc",
        },
      });

      res.json({
        ok: true,
        data: movimientos,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al obtener movimientos",
        mensaje:
          error.message ||
          "Ocurrió un error al obtener los movimientos del material.",
        modulo: "Movimientos de Inventario",
        referencia_id: material_id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener movimientos del material.",
      });
    }
  }

  static async registrarEntrada(req, res) {
    const usuario_id = req.user?.usuario_id ?? req.body.usuario_id ?? null;

    try {
      const {
        material_id,
        cantidad,
        precio_unitario,
        referencia,
        descripcion,
      } = req.body;

      if (!material_id || !cantidad || precio_unitario == null) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Entrada no registrada",
          mensaje:
            "No se pudo registrar la entrada porque faltan campos obligatorios: material, cantidad y precio unitario.",
          modulo: "Movimientos de Inventario",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: material_id, cantidad y precio_unitario.",
        });
      }

      const materialId = Number(material_id);
      const cantidadFinal = Number(cantidad);
      const precioFinal = Number(precio_unitario);

      if (isNaN(materialId)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Entrada no registrada",
          mensaje:
            "No se pudo registrar la entrada porque el material enviado no es válido.",
          modulo: "Movimientos de Inventario",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El material debe ser válido.",
        });
      }

      if (isNaN(cantidadFinal) || cantidadFinal <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Entrada no registrada",
          mensaje:
            "No se pudo registrar la entrada porque la cantidad debe ser mayor que cero.",
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cantidad debe ser mayor que cero.",
        });
      }

      if (isNaN(precioFinal) || precioFinal <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Entrada no registrada",
          mensaje:
            "No se pudo registrar la entrada porque el precio unitario debe ser mayor que cero.",
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser mayor que cero.",
        });
      }

      const material = await prisma.materiales.findFirst({
        where: {
          material_id: materialId,
          fecha_eliminacion: null,
        },
      });

      if (!material) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Entrada no registrada",
          mensaje:
            "No se pudo registrar la entrada porque el material no existe o fue eliminado.",
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Material no encontrado.",
        });
      }

      await prisma.$queryRaw`
        SELECT public.registrar_entrada_material(
          ${materialId}::INTEGER,
          ${cantidadFinal}::INTEGER,
          ${precioFinal}::NUMERIC,
          ${referencia?.trim() || "Entrada de inventario"}::VARCHAR,
          ${descripcion?.trim() || "Entrada registrada desde el sistema"}::VARCHAR,
          ${usuario_id ? Number(usuario_id) : null}::INTEGER
        )
      `;

      const materialActualizado = await prisma.materiales.findFirst({
        where: {
          material_id: materialId,
        },
        include: {
          categorias: {
            select: {
              categoria_id: true,
              nombre_categoria: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Entrada de inventario",
        titulo: "Entrada registrada",
        mensaje: `Se registró una entrada de ${cantidadFinal} ${material.unidad_de_medida} para el material "${material.nombre_material}".`,
        modulo: "Movimientos de Inventario",
        referencia_id: materialId,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Entrada de inventario registrada correctamente.",
        data: materialActualizado,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al registrar entrada",
        mensaje:
          error.message ||
          "Ocurrió un error al registrar la entrada de inventario.",
        modulo: "Movimientos de Inventario",
        referencia_id: req.body.material_id ? Number(req.body.material_id) : null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Error interno al registrar entrada de inventario.",
      });
    }
  }

  static async registrarSalida(req, res) {
    const usuario_id = req.user?.usuario_id ?? req.body.usuario_id ?? null;

    try {
      const { material_id, cantidad, referencia, descripcion } = req.body;

      if (!material_id || !cantidad) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Salida no registrada",
          mensaje:
            "No se pudo registrar la salida porque faltan campos obligatorios: material y cantidad.",
          modulo: "Movimientos de Inventario",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: material_id y cantidad.",
        });
      }

      const materialId = Number(material_id);
      const cantidadFinal = Number(cantidad);

      if (isNaN(materialId)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Salida no registrada",
          mensaje:
            "No se pudo registrar la salida porque el material enviado no es válido.",
          modulo: "Movimientos de Inventario",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El material debe ser válido.",
        });
      }

      if (isNaN(cantidadFinal) || cantidadFinal <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Salida no registrada",
          mensaje:
            "No se pudo registrar la salida porque la cantidad debe ser mayor que cero.",
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cantidad debe ser mayor que cero.",
        });
      }

      const material = await prisma.materiales.findFirst({
        where: {
          material_id: materialId,
          fecha_eliminacion: null,
        },
      });

      if (!material) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Salida no registrada",
          mensaje:
            "No se pudo registrar la salida porque el material no existe o fue eliminado.",
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Material no encontrado.",
        });
      }

      const stockActual = Number(material.cantidad_en_stock ?? 0);
      const stockMinimo = Number(material.stock_minimo ?? 10);

      if (cantidadFinal > stockActual) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Salida no registrada",
          mensaje: `No se pudo registrar la salida del material "${material.nombre_material}" porque la cantidad solicitada supera el stock disponible.`,
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "No hay suficiente stock disponible.",
        });
      }

      if (stockActual - cantidadFinal < stockMinimo) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Salida no registrada",
          mensaje: `No se pudo registrar la salida del material "${material.nombre_material}" porque dejaría el stock por debajo del mínimo permitido.`,
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "La salida dejaría el stock por debajo del mínimo permitido.",
        });
      }

      await prisma.$queryRaw`
        SELECT public.registrar_salida_material(
          ${materialId}::INTEGER,
          ${cantidadFinal}::INTEGER,
          ${referencia?.trim() || "Salida de inventario"}::VARCHAR,
          ${descripcion?.trim() || "Salida registrada desde el sistema"}::VARCHAR,
          ${usuario_id ? Number(usuario_id) : null}::INTEGER
        )
      `;

      const materialActualizado = await prisma.materiales.findFirst({
        where: {
          material_id: materialId,
        },
        include: {
          categorias: {
            select: {
              categoria_id: true,
              nombre_categoria: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Salida de inventario",
        titulo: "Salida registrada",
        mensaje: `Se registró una salida de ${cantidadFinal} ${material.unidad_de_medida} para el material "${material.nombre_material}".`,
        modulo: "Movimientos de Inventario",
        referencia_id: materialId,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Salida de inventario registrada correctamente.",
        data: materialActualizado,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al registrar salida",
        mensaje:
          error.message ||
          "Ocurrió un error al registrar la salida de inventario.",
        modulo: "Movimientos de Inventario",
        referencia_id: req.body.material_id ? Number(req.body.material_id) : null,
        prioridad: "Alta",
      });

      res.status(400).json({
        ok: false,
        msg: error.message || "Error interno al registrar salida de inventario.",
      });
    }
  }

  static async registrarAjuste(req, res) {
    const usuario_id = req.user?.usuario_id ?? req.body.usuario_id ?? null;

    try {
      const { material_id, stock_nuevo, referencia, descripcion } = req.body;

      if (!material_id || stock_nuevo == null) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Ajuste no registrado",
          mensaje:
            "No se pudo registrar el ajuste porque faltan campos obligatorios: material y nuevo stock.",
          modulo: "Movimientos de Inventario",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: material_id y stock_nuevo.",
        });
      }

      const materialId = Number(material_id);
      const stockNuevoFinal = Number(stock_nuevo);

      if (isNaN(materialId)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Ajuste no registrado",
          mensaje:
            "No se pudo registrar el ajuste porque el material enviado no es válido.",
          modulo: "Movimientos de Inventario",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El material debe ser válido.",
        });
      }

      if (isNaN(stockNuevoFinal) || stockNuevoFinal < 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Ajuste no registrado",
          mensaje:
            "No se pudo registrar el ajuste porque el nuevo stock debe ser un número mayor o igual a cero.",
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El nuevo stock debe ser un número mayor o igual a cero.",
        });
      }

      const material = await prisma.materiales.findFirst({
        where: {
          material_id: materialId,
          fecha_eliminacion: null,
        },
      });

      if (!material) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Ajuste no registrado",
          mensaje:
            "No se pudo registrar el ajuste porque el material no existe o fue eliminado.",
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Material no encontrado.",
        });
      }

      if (stockNuevoFinal < Number(material.stock_minimo ?? 10)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Ajuste no registrado",
          mensaje: `No se pudo registrar el ajuste del material "${material.nombre_material}" porque el nuevo stock es menor al stock mínimo (${material.stock_minimo}).`,
          modulo: "Movimientos de Inventario",
          referencia_id: materialId,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: `El nuevo stock no puede ser menor al stock mínimo (${material.stock_minimo}).`,
        });
      }

      await prisma.$queryRaw`
        SELECT public.registrar_ajuste_material(
          ${materialId}::INTEGER,
          ${stockNuevoFinal}::INTEGER,
          ${referencia?.trim() || "Ajuste de inventario"}::VARCHAR,
          ${descripcion?.trim() || "Ajuste registrado desde el sistema"}::VARCHAR,
          ${usuario_id ? Number(usuario_id) : null}::INTEGER
        )
      `;

      const materialActualizado = await prisma.materiales.findFirst({
        where: {
          material_id: materialId,
        },
        include: {
          categorias: {
            select: {
              categoria_id: true,
              nombre_categoria: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Ajuste de inventario",
        titulo: "Ajuste registrado",
        mensaje: `Se ajustó el stock del material "${material.nombre_material}" a ${stockNuevoFinal} ${material.unidad_de_medida}.`,
        modulo: "Movimientos de Inventario",
        referencia_id: materialId,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Ajuste de inventario registrado correctamente.",
        data: materialActualizado,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al registrar ajuste",
        mensaje:
          error.message ||
          "Ocurrió un error al registrar el ajuste de inventario.",
        modulo: "Movimientos de Inventario",
        referencia_id: req.body.material_id ? Number(req.body.material_id) : null,
        prioridad: "Alta",
      });

      res.status(400).json({
        ok: false,
        msg: error.message || "Error interno al registrar ajuste de inventario.",
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
        titulo: "Movimiento no eliminado",
        mensaje:
          "No se pudo eliminar el movimiento porque el ID enviado no es válido.",
        modulo: "Movimientos de Inventario",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID debe ser numérico.",
      });
    }

    try {
      const movimiento = await prisma.movimientos_inventario.findUnique({
        where: {
          movimiento_id: id,
        },
        include: {
          materiales: {
            select: {
              nombre_material: true,
            },
          },
        },
      });

      if (!movimiento) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Movimiento no eliminado",
          mensaje: `No se pudo eliminar el movimiento con ID ${id} porque no existe.`,
          modulo: "Movimientos de Inventario",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Movimiento no encontrado.",
        });
      }

      await prisma.movimientos_inventario.delete({
        where: {
          movimiento_id: id,
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Movimiento eliminado",
        mensaje: `Se eliminó un movimiento de inventario del material "${movimiento.materiales?.nombre_material ?? "Sin material"}".`,
        modulo: "Movimientos de Inventario",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Movimiento eliminado correctamente.",
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al eliminar movimiento",
        mensaje:
          error.message ||
          "Ocurrió un error al eliminar el movimiento de inventario.",
        modulo: "Movimientos de Inventario",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar movimiento de inventario.",
      });
    }
  }
}