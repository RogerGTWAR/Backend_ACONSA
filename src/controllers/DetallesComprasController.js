import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

async function recalcularMontoTotal(tx, compraId) {
  const detalles = await tx.detalles_compras.findMany({
    where: {
      compra_id: Number(compraId),
      fecha_eliminacion: null,
    },
    select: {
      cantidad: true,
      precio_unitario: true,
    },
  });

  const total = detalles.reduce(
    (sum, d) => sum + Number(d.cantidad) * Number(d.precio_unitario),
    0
  );

  await tx.compras.update({
    where: {
      compra_id: Number(compraId),
    },
    data: {
      monto_total: total,
      fecha_actualizacion: new Date(),
    },
  });

  return total;
}

async function registrarMovimientoInventario(
  tx,
  {
    material_id,
    tipo_movimiento,
    cantidad,
    stock_anterior,
    stock_nuevo,
    precio_unitario,
    referencia,
    descripcion,
    usuario_id = null,
  }
) {
  await tx.movimientos_inventario.create({
    data: {
      material_id: Number(material_id),
      tipo_movimiento,
      cantidad: Number(cantidad),
      stock_anterior: Number(stock_anterior),
      stock_nuevo: Number(stock_nuevo),
      precio_unitario: Number(precio_unitario),
      referencia,
      descripcion,
      usuario_id: usuario_id ? Number(usuario_id) : null,
      fecha_movimiento: new Date(),
    },
  });
}

async function aumentarStockMaterial(
  tx,
  materialId,
  cantidad,
  precioUnitario,
  referencia,
  descripcion,
  usuarioId = null
) {
  const material = await tx.materiales.findFirst({
    where: {
      material_id: Number(materialId),
      fecha_eliminacion: null,
    },
  });

  if (!material) {
    throw new Error("El material no existe o fue eliminado");
  }

  const stockAnterior = Number(material.cantidad_en_stock);
  const cantidadSumar = Number(cantidad);
  const stockNuevo = stockAnterior + cantidadSumar;

  await tx.materiales.update({
    where: {
      material_id: Number(materialId),
    },
    data: {
      cantidad_en_stock: stockNuevo,
      precio_unitario: Number(precioUnitario),
      fecha_actualizacion: new Date(),
    },
  });

  await registrarMovimientoInventario(tx, {
    material_id: materialId,
    tipo_movimiento: "Entrada",
    cantidad: cantidadSumar,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    precio_unitario: precioUnitario,
    referencia,
    descripcion,
    usuario_id: usuarioId,
  });
}

async function disminuirStockMaterial(
  tx,
  materialId,
  cantidad,
  precioUnitario,
  referencia,
  descripcion,
  usuarioId = null
) {
  const material = await tx.materiales.findFirst({
    where: {
      material_id: Number(materialId),
      fecha_eliminacion: null,
    },
  });

  if (!material) {
    throw new Error("El material no existe o fue eliminado");
  }

  const stockAnterior = Number(material.cantidad_en_stock);
  const cantidadRestar = Number(cantidad);

  if (stockAnterior < cantidadRestar) {
    throw new Error(
      `No se puede disminuir el stock. Stock actual: ${stockAnterior}, cantidad a restar: ${cantidadRestar}`
    );
  }

  const stockNuevo = stockAnterior - cantidadRestar;

  await tx.materiales.update({
    where: {
      material_id: Number(materialId),
    },
    data: {
      cantidad_en_stock: stockNuevo,
      fecha_actualizacion: new Date(),
    },
  });

  await registrarMovimientoInventario(tx, {
    material_id: materialId,
    tipo_movimiento: "Salida",
    cantidad: cantidadRestar,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    precio_unitario: precioUnitario,
    referencia,
    descripcion,
    usuario_id: usuarioId,
  });
}

export default class DetallesComprasController {
  static async getAll(_req, res) {
    try {
      const detalles = await prisma.detalles_compras.findMany({
        where: {
          fecha_eliminacion: null,
        },
        include: {
          compras: {
            select: {
              compra_id: true,
              numero_factura: true,
              fecha_compra: true,
              proveedor_id: true,
            },
          },
          materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              precio_unitario: true,
              cantidad_en_stock: true,
            },
          },
        },
        orderBy: {
          detalle_compra_id: "asc",
        },
      });

      res.json({
        ok: true,
        data: detalles,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener los detalles de compras",
      });
    }
  }

  static async getById(req, res) {
    const idNum = parseInt(req.params.id);

    if (isNaN(idNum)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del detalle debe ser un número",
      });
    }

    try {
      const detalle = await prisma.detalles_compras.findFirst({
        where: {
          detalle_compra_id: idNum,
          fecha_eliminacion: null,
        },
        include: {
          compras: {
            select: {
              compra_id: true,
              numero_factura: true,
            },
          },
          materiales: {
            select: {
              material_id: true,
              nombre_material: true,
              unidad_de_medida: true,
              precio_unitario: true,
              cantidad_en_stock: true,
            },
          },
        },
      });

      if (!detalle) {
        return res.status(404).json({
          ok: false,
          msg: `No se encontró el detalle con ID: ${idNum}`,
        });
      }

      res.json({
        ok: true,
        data: detalle,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener el detalle de compra",
      });
    }
  }

  static async create(req, res) {
    try {
      const usuario_id = req.user?.usuario_id ?? null;
      const { compra_id, material_id, cantidad, precio_unitario } = req.body;

      if (
        !compra_id ||
        !material_id ||
        cantidad == null ||
        precio_unitario == null
      ) {
        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: compra_id, material_id, cantidad, precio_unitario",
        });
      }

      if (Number(cantidad) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "La cantidad debe ser mayor que cero",
        });
      }

      if (Number(precio_unitario) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser mayor a cero",
        });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const compra = await tx.compras.findFirst({
          where: {
            compra_id: Number(compra_id),
            fecha_eliminacion: null,
          },
        });

        if (!compra) {
          throw new Error("La compra especificada no existe o fue eliminada");
        }

        const material = await tx.materiales.findFirst({
          where: {
            material_id: Number(material_id),
            fecha_eliminacion: null,
          },
        });

        if (!material) {
          throw new Error("El material especificado no existe o fue eliminado");
        }

        const detalle = await tx.detalles_compras.create({
          data: {
            compra_id: Number(compra_id),
            material_id: Number(material_id),
            cantidad: Number(cantidad),
            precio_unitario: Number(precio_unitario),
          },
          include: {
            compras: {
              select: {
                numero_factura: true,
              },
            },
            materiales: {
              select: {
                nombre_material: true,
              },
            },
          },
        });

        const total = await recalcularMontoTotal(tx, compra_id);

        return {
          detalle,
          total,
          compra,
          material,
        };
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Detalle de compra registrado",
        mensaje: `Se agregó ${Number(cantidad)} unidad(es) del material "${resultado.material.nombre_material}" a la compra "${resultado.compra.numero_factura}".`,
        modulo: "Detalles Compras",
        referencia_id: resultado.detalle.detalle_compra_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Detalle registrado correctamente",
        data: resultado.detalle,
        monto_total: resultado.total,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al crear detalle de compra",
        mensaje:
          error.message || "Ocurrió un error al crear un detalle de compra.",
        modulo: "Detalles Compras",
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Error interno al crear detalle de compra",
      });
    }
  }

  static async update(req, res) {
    const idNum = parseInt(req.params.id);

    if (isNaN(idNum)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del detalle debe ser numérico",
      });
    }

    try {
      const usuario_id = req.user?.usuario_id ?? null;
      const { compra_id, material_id, cantidad, precio_unitario } = req.body;

      if (cantidad !== undefined && Number(cantidad) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "La cantidad debe ser mayor que cero",
        });
      }

      if (precio_unitario !== undefined && Number(precio_unitario) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "El precio unitario debe ser mayor a cero",
        });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const old = await tx.detalles_compras.findUnique({
          where: {
            detalle_compra_id: idNum,
          },
          include: {
            compras: {
              select: {
                compra_id: true,
                numero_factura: true,
              },
            },
            materiales: {
              select: {
                nombre_material: true,
              },
            },
          },
        });

        if (!old || old.fecha_eliminacion !== null) {
          throw new Error("El detalle no existe o ya fue eliminado");
        }

        const nuevoCompraId =
          compra_id !== undefined ? Number(compra_id) : Number(old.compra_id);

        const nuevoMaterialId =
          material_id !== undefined
            ? Number(material_id)
            : Number(old.material_id);

        const nuevaCantidad =
          cantidad !== undefined ? Number(cantidad) : Number(old.cantidad);

        const nuevoPrecioUnitario =
          precio_unitario !== undefined
            ? Number(precio_unitario)
            : Number(old.precio_unitario);

        const compra = await tx.compras.findFirst({
          where: {
            compra_id: nuevoCompraId,
            fecha_eliminacion: null,
          },
        });

        if (!compra) {
          throw new Error("La compra indicada no existe o fue eliminada");
        }

        const material = await tx.materiales.findFirst({
          where: {
            material_id: nuevoMaterialId,
            fecha_eliminacion: null,
          },
        });

        if (!material) {
          throw new Error("El material indicado no existe o fue eliminado");
        }

        if (Number(old.material_id) === Number(nuevoMaterialId)) {
          const diferencia = nuevaCantidad - Number(old.cantidad);

          if (diferencia > 0) {
            await aumentarStockMaterial(
              tx,
              nuevoMaterialId,
              diferencia,
              nuevoPrecioUnitario,
              `Actualización compra ${compra.numero_factura}`,
              "Entrada por aumento de cantidad en compra",
              usuario_id
            );
          }

          if (diferencia < 0) {
            await disminuirStockMaterial(
              tx,
              nuevoMaterialId,
              Math.abs(diferencia),
              nuevoPrecioUnitario,
              `Actualización compra ${compra.numero_factura}`,
              "Salida por disminución de cantidad en compra",
              usuario_id
            );
          }
        } else {
          await disminuirStockMaterial(
            tx,
            old.material_id,
            old.cantidad,
            old.precio_unitario,
            `Actualización compra ${compra.numero_factura}`,
            "Salida por cambio de material en compra",
            usuario_id
          );

          await aumentarStockMaterial(
            tx,
            nuevoMaterialId,
            nuevaCantidad,
            nuevoPrecioUnitario,
            `Actualización compra ${compra.numero_factura}`,
            "Entrada por cambio de material en compra",
            usuario_id
          );
        }

        const updated = await tx.detalles_compras.update({
          where: {
            detalle_compra_id: idNum,
          },
          data: {
            compra_id: nuevoCompraId,
            material_id: nuevoMaterialId,
            cantidad: nuevaCantidad,
            precio_unitario: nuevoPrecioUnitario,
            fecha_actualizacion: new Date(),
          },
          include: {
            materiales: {
              select: {
                nombre_material: true,
              },
            },
            compras: {
              select: {
                numero_factura: true,
              },
            },
          },
        });

        const comprasARecalcular = [Number(old.compra_id)];

        if (Number(old.compra_id) !== Number(nuevoCompraId)) {
          comprasARecalcular.push(Number(nuevoCompraId));
        }

        for (const idCompra of comprasARecalcular) {
          await recalcularMontoTotal(tx, idCompra);
        }

        return updated;
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Detalle de compra actualizado",
        mensaje: `Se actualizó el detalle de compra del material "${resultado.materiales?.nombre_material ?? "Material"}" en la compra "${resultado.compras?.numero_factura ?? "Compra"}".`,
        modulo: "Detalles Compras",
        referencia_id: resultado.detalle_compra_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Detalle actualizado correctamente",
        data: resultado,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al actualizar detalle de compra",
        mensaje:
          error.message ||
          "Ocurrió un error al actualizar un detalle de compra.",
        modulo: "Detalles Compras",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Error interno al actualizar detalle de compra",
      });
    }
  }

  static async delete(req, res) {
    const idNum = parseInt(req.params.id);

    if (isNaN(idNum)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del detalle debe ser un número",
      });
    }

    try {
      const usuario_id = req.user?.usuario_id ?? null;

      const resultado = await prisma.$transaction(async (tx) => {
        const existe = await tx.detalles_compras.findFirst({
          where: {
            detalle_compra_id: idNum,
            fecha_eliminacion: null,
          },
          include: {
            compras: {
              select: {
                numero_factura: true,
              },
            },
            materiales: {
              select: {
                nombre_material: true,
              },
            },
          },
        });

        if (!existe) {
          throw new Error("No se encontró el detalle a eliminar");
        }

        await disminuirStockMaterial(
          tx,
          existe.material_id,
          existe.cantidad,
          existe.precio_unitario,
          `Eliminación compra ${existe.compras?.numero_factura ?? ""}`,
          "Salida por eliminación de detalle de compra",
          usuario_id
        );

        const eliminado = await tx.detalles_compras.update({
          where: {
            detalle_compra_id: idNum,
          },
          data: {
            fecha_eliminacion: new Date(),
            fecha_actualizacion: new Date(),
          },
        });

        const total = await recalcularMontoTotal(tx, existe.compra_id);

        return {
          eliminado,
          total,
          existe,
        };
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Detalle de compra eliminado",
        mensaje: `Se eliminó el detalle del material "${resultado.existe.materiales?.nombre_material ?? "Material"}" en la compra "${resultado.existe.compras?.numero_factura ?? "Compra"}".`,
        modulo: "Detalles Compras",
        referencia_id: resultado.eliminado.detalle_compra_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Detalle eliminado correctamente",
        id: resultado.eliminado.detalle_compra_id,
        monto_total: resultado.total,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al eliminar detalle de compra",
        mensaje:
          error.message ||
          "Ocurrió un error al eliminar un detalle de compra.",
        modulo: "Detalles Compras",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Error interno al eliminar detalle de compra",
      });
    }
  }
}