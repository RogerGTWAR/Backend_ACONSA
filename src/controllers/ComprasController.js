import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

const ESTADOS_VALIDOS = ["Pendiente", "Pagada", "Cancelada"];

async function recalcularMontoTotal(compraId) {
  const detalles = await prisma.detalles_compras.findMany({
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

  await prisma.compras.update({
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

export default class ComprasController {
  static async getAll(_req, res) {
    try {
      const compras = await prisma.compras.findMany({
        where: {
          fecha_eliminacion: null,
        },
        include: {
          proveedores: {
            select: {
              nombre_empresa: true,
            },
          },
          empleados: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
        },
        orderBy: {
          compra_id: "asc",
        },
      });

      const list = compras.map((c) => ({
        ...c,
        proveedorNombre: c.proveedores?.nombre_empresa ?? "—",
        empleadoNombre: c.empleados
          ? `${c.empleados.nombres} ${c.empleados.apellidos}`
          : "—",
      }));

      res.json({
        ok: true,
        data: list,
      });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener compras",
        mensaje: error.message || "Ocurrió un error al cargar las compras.",
        modulo: "Compras",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener compras.",
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
        titulo: "Compra no consultada",
        mensaje: "No se pudo consultar la compra porque el ID enviado no es válido.",
        modulo: "Compras",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "ID inválido.",
      });
    }

    try {
      const compra = await prisma.compras.findFirst({
        where: {
          compra_id: id,
          fecha_eliminacion: null,
        },
        include: {
          proveedores: {
            select: {
              nombre_empresa: true,
            },
          },
          empleados: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
          detalles_compras: {
            where: {
              fecha_eliminacion: null,
            },
            include: {
              materiales: {
                select: {
                  nombre_material: true,
                  unidad_de_medida: true,
                },
              },
            },
          },
        },
      });

      if (!compra) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no encontrada",
          mensaje: `No se encontró la compra con ID ${id}.`,
          modulo: "Compras",
          referencia_id: id,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: "Compra no encontrada.",
        });
      }

      const data = {
        ...compra,
        proveedorNombre: compra.proveedores?.nombre_empresa ?? "—",
        empleadoNombre: compra.empleados
          ? `${compra.empleados.nombres} ${compra.empleados.apellidos}`
          : "—",
      };

      res.json({
        ok: true,
        data,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al obtener compra",
        mensaje: error.message || "Ocurrió un error al obtener una compra.",
        modulo: "Compras",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener compra.",
      });
    }
  }

  static async create(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;

    try {
      const {
        proveedor_id,
        empleado_id,
        numero_factura,
        fecha_compra,
        estado,
        observaciones,
      } = req.body;

      if (!proveedor_id || !numero_factura || !estado) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no registrada",
          mensaje:
            "No se pudo registrar la compra porque faltan campos obligatorios: proveedor, número de factura y estado.",
          modulo: "Compras",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios faltantes.",
        });
      }

      const proveedorId = Number(proveedor_id);

      if (isNaN(proveedorId)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no registrada",
          mensaje:
            "No se pudo registrar la compra porque el proveedor enviado no es válido.",
          modulo: "Compras",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El proveedor debe ser válido.",
        });
      }

      if (!ESTADOS_VALIDOS.includes(estado)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no registrada",
          mensaje: `No se pudo registrar la compra porque el estado "${estado}" no es válido.`,
          modulo: "Compras",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El estado de la compra no es válido.",
        });
      }

      const proveedor = await prisma.proveedores.findFirst({
        where: {
          proveedor_id: proveedorId,
          fecha_eliminacion: null,
        },
      });

      if (!proveedor) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no registrada",
          mensaje:
            "No se pudo registrar la compra porque el proveedor seleccionado no existe o fue eliminado.",
          modulo: "Compras",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Proveedor no existe.",
        });
      }

      let empleadoValido = null;

      if (empleado_id) {
        const empleadoId = Number(empleado_id);

        if (isNaN(empleadoId)) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Compra no registrada",
            mensaje:
              "No se pudo registrar la compra porque el empleado enviado no es válido.",
            modulo: "Compras",
            referencia_id: null,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "Empleado inválido.",
          });
        }

        empleadoValido = await prisma.empleados.findFirst({
          where: {
            empleado_id: empleadoId,
            fecha_eliminacion: null,
          },
        });

        if (!empleadoValido) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Compra no registrada",
            mensaje:
              "No se pudo registrar la compra porque el empleado seleccionado no existe o fue eliminado.",
            modulo: "Compras",
            referencia_id: null,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "Empleado inválido.",
          });
        }
      }

      const facturaLimpia = numero_factura.trim();

      const existeFactura = await prisma.compras.findFirst({
        where: {
          numero_factura: {
            equals: facturaLimpia,
            mode: "insensitive",
          },
          fecha_eliminacion: null,
        },
      });

      if (existeFactura) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no registrada",
          mensaje: `No se pudo registrar la compra porque ya existe una compra con la factura "${facturaLimpia}".`,
          modulo: "Compras",
          referencia_id: existeFactura.compra_id,
          prioridad: "Alta",
        });

        return res.status(409).json({
          ok: false,
          msg: "Ya existe una compra con ese número de factura.",
        });
      }

      const fechaCompraFinal = fecha_compra ? new Date(fecha_compra) : new Date();

      if (isNaN(fechaCompraFinal.getTime())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no registrada",
          mensaje:
            "No se pudo registrar la compra porque la fecha ingresada no es válida.",
          modulo: "Compras",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "La fecha de compra no es válida.",
        });
      }

      const nueva = await prisma.compras.create({
        data: {
          proveedor_id: proveedorId,
          empleado_id: empleadoValido ? empleadoValido.empleado_id : null,
          numero_factura: facturaLimpia,
          fecha_compra: fechaCompraFinal,
          monto_total: 0,
          estado,
          observaciones: observaciones?.trim() || null,
        },
        include: {
          proveedores: {
            select: {
              nombre_empresa: true,
            },
          },
          empleados: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
        },
      });

      const total = await recalcularMontoTotal(nueva.compra_id);

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Compra registrada",
        mensaje: `Se registró la compra "${nueva.numero_factura}" del proveedor "${proveedor.nombre_empresa}".`,
        modulo: "Compras",
        referencia_id: nueva.compra_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Compra registrada correctamente.",
        data: {
          ...nueva,
          monto_total: total,
          proveedorNombre: nueva.proveedores?.nombre_empresa ?? "—",
          empleadoNombre: nueva.empleados
            ? `${nueva.empleados.nombres} ${nueva.empleados.apellidos}`
            : "—",
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al crear compra",
        mensaje: error.message || "Ocurrió un error al crear una compra.",
        modulo: "Compras",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al crear compra.",
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
        titulo: "Compra no actualizada",
        mensaje:
          "No se pudo actualizar la compra porque el ID enviado no es válido.",
        modulo: "Compras",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "ID inválido.",
      });
    }

    try {
      const old = await prisma.compras.findFirst({
        where: {
          compra_id: id,
          fecha_eliminacion: null,
        },
        include: {
          proveedores: {
            select: {
              nombre_empresa: true,
            },
          },
        },
      });

      if (!old) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no actualizada",
          mensaje: `No se pudo actualizar la compra con ID ${id} porque no existe o fue eliminada.`,
          modulo: "Compras",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Compra no encontrada.",
        });
      }

      const {
        proveedor_id,
        empleado_id,
        numero_factura,
        fecha_compra,
        estado,
        observaciones,
      } = req.body;

      let proveedorNombre = old.proveedores?.nombre_empresa ?? "—";
      let proveedorFinal = old.proveedor_id;

      if (proveedor_id !== undefined) {
        proveedorFinal = Number(proveedor_id);

        if (isNaN(proveedorFinal)) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Compra no actualizada",
            mensaje:
              "No se pudo actualizar la compra porque el proveedor enviado no es válido.",
            modulo: "Compras",
            referencia_id: id,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "Proveedor inválido.",
          });
        }

        const proveedor = await prisma.proveedores.findFirst({
          where: {
            proveedor_id: proveedorFinal,
            fecha_eliminacion: null,
          },
        });

        if (!proveedor) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Compra no actualizada",
            mensaje:
              "No se pudo actualizar la compra porque el proveedor seleccionado no existe o fue eliminado.",
            modulo: "Compras",
            referencia_id: id,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "Proveedor no existe.",
          });
        }

        proveedorNombre = proveedor.nombre_empresa;
      }

      let empleadoFinal = old.empleado_id;

      if (empleado_id !== undefined) {
        if (empleado_id) {
          empleadoFinal = Number(empleado_id);

          if (isNaN(empleadoFinal)) {
            await registrarAlerta({
              usuario_id,
              tipo: "Error",
              titulo: "Compra no actualizada",
              mensaje:
                "No se pudo actualizar la compra porque el empleado enviado no es válido.",
              modulo: "Compras",
              referencia_id: id,
              prioridad: "Alta",
            });

            return res.status(400).json({
              ok: false,
              msg: "Empleado inválido.",
            });
          }

          const empleado = await prisma.empleados.findFirst({
            where: {
              empleado_id: empleadoFinal,
              fecha_eliminacion: null,
            },
          });

          if (!empleado) {
            await registrarAlerta({
              usuario_id,
              tipo: "Error",
              titulo: "Compra no actualizada",
              mensaje:
                "No se pudo actualizar la compra porque el empleado seleccionado no existe o fue eliminado.",
              modulo: "Compras",
              referencia_id: id,
              prioridad: "Alta",
            });

            return res.status(400).json({
              ok: false,
              msg: "Empleado inválido.",
            });
          }
        } else {
          empleadoFinal = null;
        }
      }

      const estadoFinal = estado ?? old.estado;

      if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no actualizada",
          mensaje: `No se pudo actualizar la compra porque el estado "${estadoFinal}" no es válido.`,
          modulo: "Compras",
          referencia_id: id,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El estado de la compra no es válido.",
        });
      }

      const facturaFinal = numero_factura?.trim() ?? old.numero_factura;

      if (!facturaFinal) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no actualizada",
          mensaje:
            "No se pudo actualizar la compra porque el número de factura es obligatorio.",
          modulo: "Compras",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El número de factura es obligatorio.",
        });
      }

      if (facturaFinal !== old.numero_factura) {
        const existeFactura = await prisma.compras.findFirst({
          where: {
            numero_factura: {
              equals: facturaFinal,
              mode: "insensitive",
            },
            fecha_eliminacion: null,
            NOT: {
              compra_id: id,
            },
          },
        });

        if (existeFactura) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Compra no actualizada",
            mensaje: `No se pudo actualizar la compra porque ya existe otra compra con la factura "${facturaFinal}".`,
            modulo: "Compras",
            referencia_id: id,
            prioridad: "Alta",
          });

          return res.status(409).json({
            ok: false,
            msg: "Ya existe otra compra con ese número de factura.",
          });
        }
      }

      const fechaCompraFinal = fecha_compra
        ? new Date(fecha_compra)
        : old.fecha_compra;

      if (isNaN(new Date(fechaCompraFinal).getTime())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no actualizada",
          mensaje:
            "No se pudo actualizar la compra porque la fecha ingresada no es válida.",
          modulo: "Compras",
          referencia_id: id,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "La fecha de compra no es válida.",
        });
      }

      const updated = await prisma.compras.update({
        where: {
          compra_id: id,
        },
        data: {
          proveedor_id: proveedorFinal,
          empleado_id: empleadoFinal,
          numero_factura: facturaFinal,
          fecha_compra: new Date(fechaCompraFinal),
          estado: estadoFinal,
          observaciones:
            observaciones !== undefined
              ? observaciones?.trim() || null
              : old.observaciones,
          fecha_actualizacion: new Date(),
        },
        include: {
          proveedores: {
            select: {
              nombre_empresa: true,
            },
          },
          empleados: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
        },
      });

      const total = await recalcularMontoTotal(id);

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Compra actualizada",
        mensaje: `Se actualizó la compra "${updated.numero_factura}" del proveedor "${proveedorNombre}".`,
        modulo: "Compras",
        referencia_id: updated.compra_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Compra actualizada correctamente.",
        data: {
          ...updated,
          monto_total: total,
          proveedorNombre: updated.proveedores?.nombre_empresa ?? "—",
          empleadoNombre: updated.empleados
            ? `${updated.empleados.nombres} ${updated.empleados.apellidos}`
            : "—",
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al actualizar compra",
        mensaje: error.message || "Ocurrió un error al actualizar una compra.",
        modulo: "Compras",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error al actualizar compra.",
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
        titulo: "Compra no eliminada",
        mensaje:
          "No se pudo eliminar la compra porque el ID enviado no es válido.",
        modulo: "Compras",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "ID inválido.",
      });
    }

    try {
      const compra = await prisma.compras.findFirst({
        where: {
          compra_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!compra) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Compra no eliminada",
          mensaje: `No se pudo eliminar la compra con ID ${id} porque no existe o ya fue eliminada.`,
          modulo: "Compras",
          referencia_id: id,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "Compra no encontrada.",
        });
      }

      const eliminada = await prisma.compras.update({
        where: {
          compra_id: id,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Compra eliminada",
        mensaje: `Se eliminó la compra "${compra.numero_factura}".`,
        modulo: "Compras",
        referencia_id: eliminada.compra_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Compra eliminada correctamente.",
        id: eliminada.compra_id,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al eliminar compra",
        mensaje: error.message || "Ocurrió un error al eliminar una compra.",
        modulo: "Compras",
        referencia_id: id,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error al eliminar compra.",
      });
    }
  }
}