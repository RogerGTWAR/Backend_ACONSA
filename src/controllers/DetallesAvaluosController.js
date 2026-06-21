import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

const mapDetalle = (row) => {
  const cantidad = Number(row.cantidad ?? 0);
  const precioUnit = Number(row.precio_unitario ?? 0);

  const costo_venta = cantidad * precioUnit;
  const iva = costo_venta * 0.15;
  const total_costo_venta = costo_venta + iva;

  return {
    ...row,
    costo_venta: Number(costo_venta.toFixed(2)),
    iva: Number(iva.toFixed(2)),
    total_costo_venta: Number(total_costo_venta.toFixed(2)),
  };
};

async function recalcularMontoEjecutado(tx, avaluo_id) {
  const detalles = await tx.detalles_avaluos.findMany({
    where: {
      avaluo_id: Number(avaluo_id),
      fecha_eliminacion: null,
    },
  });

  let total = 0;

  for (const d of detalles) {
    const m = mapDetalle(d);
    total += m.total_costo_venta;
  }

  await tx.avaluos.update({
    where: {
      avaluo_id: Number(avaluo_id),
    },
    data: {
      monto_ejecutado: Number(total.toFixed(2)),
      fecha_actualizacion: new Date(),
    },
  });

  return Number(total.toFixed(2));
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

async function obtenerMaterialesDelServicio(tx, servicioId) {
  const materialesServicio = await tx.costos_directos_servicios.findMany({
    where: {
      servicio_id: Number(servicioId),
      fecha_eliminacion: null,
    },
    include: {
      material_id_materiales: true,
    },
  });

  if (materialesServicio.length === 0) {
    throw new Error(
      "El servicio no tiene materiales asignados en costos directos."
    );
  }

  return materialesServicio;
}

async function disminuirInventarioPorServicio(
  tx,
  servicioId,
  cantidadServicio,
  referencia = "Salida por avalúo",
  descripcion = "Salida automática por servicio asignado a avalúo",
  usuarioId = null
) {
  const materialesServicio = await obtenerMaterialesDelServicio(tx, servicioId);

  for (const item of materialesServicio) {
    const materialId = Number(item.material_id);
    const cantidadNecesaria =
      Number(item.cantidad_material) * Number(cantidadServicio);

    const material = await tx.materiales.findFirst({
      where: {
        material_id: materialId,
        fecha_eliminacion: null,
      },
    });

    if (!material) {
      throw new Error(
        `El material con ID ${materialId} no existe o fue eliminado.`
      );
    }

    const stockAnterior = Number(material.cantidad_en_stock);
    const stockNuevo = stockAnterior - cantidadNecesaria;
    const precioUnitario = Number(material.precio_unitario ?? 0);

    if (stockAnterior < cantidadNecesaria) {
      throw new Error(
        `Stock insuficiente para "${material.nombre_material}". Stock actual: ${stockAnterior}, cantidad requerida: ${cantidadNecesaria}.`
      );
    }

    await tx.materiales.update({
      where: {
        material_id: materialId,
      },
      data: {
        cantidad_en_stock: stockNuevo,
        fecha_actualizacion: new Date(),
      },
    });

    await registrarMovimientoInventario(tx, {
      material_id: materialId,
      tipo_movimiento: "Salida",
      cantidad: cantidadNecesaria,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      precio_unitario: precioUnitario,
      referencia,
      descripcion,
      usuario_id: usuarioId,
    });
  }
}

async function devolverInventarioPorServicio(
  tx,
  servicioId,
  cantidadServicio,
  referencia = "Devolución por avalúo",
  descripcion = "Entrada automática por devolución de inventario",
  usuarioId = null
) {
  const materialesServicio = await obtenerMaterialesDelServicio(tx, servicioId);

  for (const item of materialesServicio) {
    const materialId = Number(item.material_id);
    const cantidadDevolver =
      Number(item.cantidad_material) * Number(cantidadServicio);

    const material = await tx.materiales.findFirst({
      where: {
        material_id: materialId,
        fecha_eliminacion: null,
      },
    });

    if (!material) {
      throw new Error(
        `El material con ID ${materialId} no existe o fue eliminado.`
      );
    }

    const stockAnterior = Number(material.cantidad_en_stock);
    const stockNuevo = stockAnterior + cantidadDevolver;
    const precioUnitario = Number(material.precio_unitario ?? 0);

    await tx.materiales.update({
      where: {
        material_id: materialId,
      },
      data: {
        cantidad_en_stock: stockNuevo,
        fecha_actualizacion: new Date(),
      },
    });

    await registrarMovimientoInventario(tx, {
      material_id: materialId,
      tipo_movimiento: "Entrada",
      cantidad: cantidadDevolver,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      precio_unitario: precioUnitario,
      referencia,
      descripcion,
      usuario_id: usuarioId,
    });
  }
}

async function registrarErrorDetalleAvaluo(error, req, accion, referenciaId = null) {
  const esStockInsuficiente = error.message?.includes("Stock insuficiente");

  await registrarAlerta({
    usuario_id: req.user?.usuario_id ?? null,
    tipo: esStockInsuficiente ? "Stock insuficiente" : "Error",
    titulo: esStockInsuficiente
      ? "Inventario insuficiente"
      : `Error al ${accion} detalle de avalúo`,
    mensaje:
      error.message ||
      `Ocurrió un error al ${accion} el detalle de avalúo.`,
    modulo: "Detalles Avalúos",
    referencia_id: referenciaId,
    prioridad: "Alta",
  });
}

export default class DetallesAvaluosController {
  static async getAll(_req, res) {
    try {
      const data = await prisma.detalles_avaluos.findMany({
        where: {
          fecha_eliminacion: null,
        },
        include: {
          Servicios: true,
          Avaluos: true,
        },
        orderBy: {
          detalle_avaluo_id: "asc",
        },
      });

      res.json({
        ok: true,
        data: data.map(mapDetalle),
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener detalles del avalúo.",
      });
    }
  }

  static async getById(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        msg: "ID inválido.",
      });
    }

    try {
      const detalle = await prisma.detalles_avaluos.findFirst({
        where: {
          detalle_avaluo_id: id,
          fecha_eliminacion: null,
        },
        include: {
          Servicios: true,
          Avaluos: true,
        },
      });

      if (!detalle) {
        return res.status(404).json({
          ok: false,
          msg: "No encontrado.",
        });
      }

      res.json({
        ok: true,
        data: mapDetalle(detalle),
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Error interno.",
      });
    }
  }

  static async create(req, res) {
    try {
      const usuario_id = req.user?.usuario_id ?? null;

      const {
        avaluo_id,
        servicio_id,
        actividad,
        unidad_de_medida,
        cantidad,
      } = req.body;

      if (
        !avaluo_id ||
        !servicio_id ||
        !actividad ||
        !unidad_de_medida ||
        cantidad == null
      ) {
        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios faltantes.",
        });
      }

      if (Number(cantidad) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "La cantidad debe ser mayor que cero.",
        });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const avaluo = await tx.avaluos.findFirst({
          where: {
            avaluo_id: Number(avaluo_id),
            fecha_eliminacion: null,
          },
        });

        if (!avaluo) {
          throw new Error("El avalúo no existe.");
        }

        const dup = await tx.detalles_avaluos.findFirst({
          where: {
            avaluo_id: Number(avaluo_id),
            servicio_id: Number(servicio_id),
            fecha_eliminacion: null,
          },
        });

        if (dup) {
          throw new Error("Este servicio ya está asignado a este avalúo.");
        }

        const serv = await tx.servicios.findFirst({
          where: {
            servicio_id: Number(servicio_id),
            fecha_eliminacion: null,
          },
        });

        if (!serv) {
          throw new Error("El servicio no existe.");
        }

        await disminuirInventarioPorServicio(
          tx,
          Number(servicio_id),
          Number(cantidad),
          `Avalúo ${Number(avaluo_id)} - Servicio ${Number(servicio_id)}`,
          "Salida automática por creación de detalle de avalúo",
          usuario_id
        );

        const precio_unitario =
          Number(serv.total_costo_directo) + Number(serv.total_costo_indirecto);

        const nuevo = await tx.detalles_avaluos.create({
          data: {
            avaluo_id: Number(avaluo_id),
            servicio_id: Number(servicio_id),
            actividad,
            unidad_de_medida,
            cantidad: Number(cantidad),
            precio_unitario,
          },
          include: {
            Servicios: true,
            Avaluos: true,
          },
        });

        const montoEjecutado = await recalcularMontoEjecutado(
          tx,
          Number(avaluo_id)
        );

        return {
          nuevo,
          montoEjecutado,
          serv,
        };
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Detalle de avalúo agregado",
        mensaje: `Se agregó el servicio "${resultado.serv.nombre_servicio ?? resultado.serv.nombreServicio ?? "Servicio"}" al avalúo ID ${Number(avaluo_id)}.`,
        modulo: "Detalles Avalúos",
        referencia_id: resultado.nuevo.detalle_avaluo_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Detalle agregado. El inventario y movimientos fueron actualizados.",
        data: mapDetalle(resultado.nuevo),
        monto_ejecutado: resultado.montoEjecutado,
      });
    } catch (error) {
      await registrarErrorDetalleAvaluo(error, req, "crear");

      res.status(500).json({
        ok: false,
        msg: error.message || "Error interno al crear.",
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
          msg: "ID inválido.",
        });
      }

      const { servicio_id, actividad, unidad_de_medida, cantidad } = req.body;

      if (cantidad !== undefined && Number(cantidad) <= 0) {
        return res.status(400).json({
          ok: false,
          msg: "La cantidad debe ser mayor que cero.",
        });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const old = await tx.detalles_avaluos.findFirst({
          where: {
            detalle_avaluo_id: id,
            fecha_eliminacion: null,
          },
        });

        if (!old) {
          throw new Error("No encontrado.");
        }

        const nuevoServicioId =
          servicio_id !== undefined
            ? Number(servicio_id)
            : Number(old.servicio_id);

        const nuevaCantidad =
          cantidad !== undefined ? Number(cantidad) : Number(old.cantidad);

        let precio_unitario = Number(old.precio_unitario);

        if (Number(nuevoServicioId) !== Number(old.servicio_id)) {
          const dup = await tx.detalles_avaluos.findFirst({
            where: {
              avaluo_id: Number(old.avaluo_id),
              servicio_id: nuevoServicioId,
              fecha_eliminacion: null,
            },
          });

          if (dup) {
            throw new Error("Ese servicio ya está asignado a este avalúo.");
          }

          const servNuevo = await tx.servicios.findFirst({
            where: {
              servicio_id: nuevoServicioId,
              fecha_eliminacion: null,
            },
          });

          if (!servNuevo) {
            throw new Error("El nuevo servicio no existe.");
          }

          await devolverInventarioPorServicio(
            tx,
            old.servicio_id,
            old.cantidad,
            `Avalúo ${Number(old.avaluo_id)} - Cambio de servicio`,
            "Entrada por devolución del servicio anterior en avalúo",
            usuario_id
          );

          await disminuirInventarioPorServicio(
            tx,
            nuevoServicioId,
            nuevaCantidad,
            `Avalúo ${Number(old.avaluo_id)} - Nuevo servicio`,
            "Salida por nuevo servicio asignado en avalúo",
            usuario_id
          );

          precio_unitario =
            Number(servNuevo.total_costo_directo) +
            Number(servNuevo.total_costo_indirecto);
        } else {
          const diferencia = nuevaCantidad - Number(old.cantidad);

          if (diferencia > 0) {
            await disminuirInventarioPorServicio(
              tx,
              old.servicio_id,
              diferencia,
              `Avalúo ${Number(old.avaluo_id)} - Aumento de cantidad`,
              "Salida por aumento de cantidad en detalle de avalúo",
              usuario_id
            );
          }

          if (diferencia < 0) {
            await devolverInventarioPorServicio(
              tx,
              old.servicio_id,
              Math.abs(diferencia),
              `Avalúo ${Number(old.avaluo_id)} - Disminución de cantidad`,
              "Entrada por devolución de cantidad en detalle de avalúo",
              usuario_id
            );
          }
        }

        const upd = await tx.detalles_avaluos.update({
          where: {
            detalle_avaluo_id: id,
          },
          data: {
            servicio_id: nuevoServicioId,
            actividad: actividad ?? old.actividad,
            unidad_de_medida: unidad_de_medida ?? old.unidad_de_medida,
            cantidad: nuevaCantidad,
            precio_unitario,
            fecha_actualizacion: new Date(),
          },
          include: {
            Servicios: true,
            Avaluos: true,
          },
        });

        const montoEjecutado = await recalcularMontoEjecutado(
          tx,
          upd.avaluo_id
        );

        return {
          upd,
          montoEjecutado,
        };
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Detalle de avalúo actualizado",
        mensaje: `Se actualizó el detalle ID ${resultado.upd.detalle_avaluo_id} del avalúo ID ${resultado.upd.avaluo_id}.`,
        modulo: "Detalles Avalúos",
        referencia_id: resultado.upd.detalle_avaluo_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Actualizado correctamente. El inventario y movimientos fueron ajustados.",
        data: mapDetalle(resultado.upd),
        monto_ejecutado: resultado.montoEjecutado,
      });
    } catch (error) {
      const id = Number(req.params.id);
      await registrarErrorDetalleAvaluo(error, req, "actualizar", isNaN(id) ? null : id);

      res.status(500).json({
        ok: false,
        msg: error.message || "Error al actualizar.",
      });
    }
  }

  static async delete(req, res) {
    try {
      const usuario_id = req.user?.usuario_id ?? null;
      const id = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido.",
        });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const old = await tx.detalles_avaluos.findFirst({
          where: {
            detalle_avaluo_id: id,
            fecha_eliminacion: null,
          },
        });

        if (!old) {
          throw new Error("No encontrado.");
        }

        await devolverInventarioPorServicio(
          tx,
          old.servicio_id,
          old.cantidad,
          `Avalúo ${Number(old.avaluo_id)} - Eliminación de detalle`,
          "Entrada por eliminación de detalle de avalúo",
          usuario_id
        );

        const eliminado = await tx.detalles_avaluos.update({
          where: {
            detalle_avaluo_id: id,
          },
          data: {
            fecha_eliminacion: new Date(),
            fecha_actualizacion: new Date(),
          },
        });

        const montoEjecutado = await recalcularMontoEjecutado(
          tx,
          old.avaluo_id
        );

        return {
          eliminado,
          old,
          montoEjecutado,
        };
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Detalle de avalúo eliminado",
        mensaje: `Se eliminó el detalle ID ${resultado.eliminado.detalle_avaluo_id} del avalúo ID ${resultado.old.avaluo_id}. El inventario fue devuelto.`,
        modulo: "Detalles Avalúos",
        referencia_id: resultado.eliminado.detalle_avaluo_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Eliminado correctamente. El inventario fue devuelto y el movimiento fue registrado.",
        id: resultado.eliminado.detalle_avaluo_id,
        monto_ejecutado: resultado.montoEjecutado,
      });
    } catch (error) {
      const id = Number(req.params.id);
      await registrarErrorDetalleAvaluo(error, req, "eliminar", isNaN(id) ? null : id);

      res.status(500).json({
        ok: false,
        msg: error.message || "Error al eliminar.",
      });
    }
  }
}