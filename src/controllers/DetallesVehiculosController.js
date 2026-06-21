import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class DetallesVehiculosController {
  static async getAll(_req, res) {
    try {
      const detalles = await prisma.detalles_vehiculos.findMany({
        where: { fecha_eliminacion: null },
        include: {
          empleados: {
            select: {
              empleado_id: true,
              nombres: true,
              apellidos: true,
              roles: { select: { cargo: true } },
            },
          },
          vehiculos: {
            select: {
              vehiculo_id: true,
              placa: true,
              marca: true,
              modelo: true,
            },
          },
        },
        orderBy: { detalle_vehiculo_id: "asc" },
      });

      res.json({ ok: true, data: detalles });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Server error, something went wrong",
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
      const detalle = await prisma.detalles_vehiculos.findFirst({
        where: {
          detalle_vehiculo_id: idNum,
          fecha_eliminacion: null,
        },
        include: {
          empleados: {
            select: {
              empleado_id: true,
              nombres: true,
              apellidos: true,
            },
          },
          vehiculos: {
            select: {
              vehiculo_id: true,
              placa: true,
              marca: true,
              modelo: true,
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

      res.json({ ok: true, data: detalle });
    } catch (error) {
      res.status(500).json({
        ok: false,
        msg: "Server error, something went wrong",
      });
    }
  }

  static async create(req, res) {
    try {
      const usuario_id = req.user?.usuario_id ?? null;

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          ok: false,
          msg: "El cuerpo de la petición está vacío o mal formateado. Usa JSON válido.",
        });
      }

      const {
        empleado_id,
        vehiculo_id,
        fecha_asignacion,
        fecha_fin_asignacion,
        descripcion,
      } = req.body;

      const empleadoId = parseInt(empleado_id);
      const vehiculoId = parseInt(vehiculo_id);

      if (isNaN(empleadoId) || isNaN(vehiculoId)) {
        return res.status(400).json({
          ok: false,
          msg: "Los IDs de empleado y vehículo deben ser números válidos",
        });
      }

      const empOk = await prisma.empleados.findFirst({
        where: {
          empleado_id: empleadoId,
          fecha_eliminacion: null,
        },
      });

      if (!empOk) {
        return res.status(400).json({
          ok: false,
          msg: "El empleado especificado no existe o fue dado de baja",
        });
      }

      const vehOk = await prisma.vehiculos.findFirst({
        where: {
          vehiculo_id: vehiculoId,
          fecha_eliminacion: null,
        },
      });

      if (!vehOk) {
        return res.status(400).json({
          ok: false,
          msg: "El vehículo especificado no existe o fue dado de baja",
        });
      }

      const fInicio = fecha_asignacion
        ? new Date(fecha_asignacion)
        : new Date();

      const fFin = fecha_fin_asignacion
        ? new Date(fecha_fin_asignacion)
        : null;

      if (fFin && fFin < fInicio) {
        return res.status(400).json({
          ok: false,
          msg: "La fecha de fin no puede ser anterior a la de inicio",
        });
      }

      const previo = await prisma.detalles_vehiculos.findFirst({
        where: {
          empleado_id: empleadoId,
          vehiculo_id: vehiculoId,
        },
        include: {
          empleados: {
            select: {
              empleado_id: true,
              nombres: true,
              apellidos: true,
            },
          },
          vehiculos: {
            select: {
              vehiculo_id: true,
              placa: true,
              marca: true,
              modelo: true,
            },
          },
        },
      });

      if (previo && previo.fecha_eliminacion !== null) {
        const reactivado = await prisma.detalles_vehiculos.update({
          where: {
            detalle_vehiculo_id: previo.detalle_vehiculo_id,
          },
          data: {
            fecha_eliminacion: null,
            fecha_asignacion: fInicio,
            fecha_fin_asignacion: fFin,
            descripcion: descripcion ?? previo.descripcion,
            fecha_actualizacion: new Date(),
          },
          include: {
            empleados: {
              select: {
                empleado_id: true,
                nombres: true,
                apellidos: true,
              },
            },
            vehiculos: {
              select: {
                vehiculo_id: true,
                placa: true,
                marca: true,
                modelo: true,
              },
            },
          },
        });

        await registrarAlerta({
          usuario_id,
          tipo: "Registro reactivado",
          titulo: "Asignación de vehículo reactivada",
          mensaje: `Se reactivó la asignación del vehículo ${reactivado.vehiculos.marca} ${reactivado.vehiculos.modelo}, placa ${reactivado.vehiculos.placa}, al empleado ${reactivado.empleados.nombres} ${reactivado.empleados.apellidos}.`,
          modulo: "Detalles Vehículos",
          referencia_id: reactivado.detalle_vehiculo_id,
          prioridad: "Media",
        });

        return res.status(200).json({
          ok: true,
          msg: "Asignación reactivada correctamente",
          data: reactivado,
        });
      }

      if (previo && previo.fecha_eliminacion === null) {
        return res.status(200).json({
          ok: true,
          msg: "La asignación ya existía y está activa",
          data: previo,
        });
      }

      const detalle = await prisma.detalles_vehiculos.create({
        data: {
          empleado_id: empleadoId,
          vehiculo_id: vehiculoId,
          fecha_asignacion: fInicio,
          fecha_fin_asignacion: fFin,
          descripcion: descripcion ?? null,
        },
        include: {
          empleados: {
            select: {
              empleado_id: true,
              nombres: true,
              apellidos: true,
            },
          },
          vehiculos: {
            select: {
              vehiculo_id: true,
              placa: true,
              marca: true,
              modelo: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Vehículo asignado a empleado",
        mensaje: `Se asignó el vehículo ${detalle.vehiculos.marca} ${detalle.vehiculos.modelo}, placa ${detalle.vehiculos.placa}, al empleado ${detalle.empleados.nombres} ${detalle.empleados.apellidos}.`,
        modulo: "Detalles Vehículos",
        referencia_id: detalle.detalle_vehiculo_id,
        prioridad: "Media",
      });

      return res.status(201).json({
        ok: true,
        msg: "Asignación creada correctamente",
        data: detalle,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al asignar vehículo",
        mensaje:
          error.message ||
          "Ocurrió un error al asignar un vehículo a un empleado.",
        modulo: "Detalles Vehículos",
        prioridad: "Alta",
      });

      return res.status(500).json({
        ok: false,
        msg: error.message || "Server error, something went wrong",
      });
    }
  }

  static async update(req, res) {
    const idNum = parseInt(req.params.id);

    if (isNaN(idNum)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del detalle debe ser un número",
      });
    }

    try {
      const usuario_id = req.user?.usuario_id ?? null;

      const old = await prisma.detalles_vehiculos.findUnique({
        where: {
          detalle_vehiculo_id: idNum,
        },
      });

      if (!old || old.fecha_eliminacion !== null) {
        return res.status(404).json({
          ok: false,
          msg: "No se encontró el detalle que se desea modificar",
        });
      }

      const {
        empleado_id,
        vehiculo_id,
        fecha_asignacion,
        fecha_fin_asignacion,
        descripcion,
      } = req.body;

      let empleadoId = old.empleado_id;

      if (empleado_id !== undefined) {
        const parsed = parseInt(empleado_id);

        if (isNaN(parsed)) {
          return res.status(400).json({
            ok: false,
            msg: "El ID de empleado debe ser numérico",
          });
        }

        const empOk = await prisma.empleados.findFirst({
          where: {
            empleado_id: parsed,
            fecha_eliminacion: null,
          },
        });

        if (!empOk) {
          return res.status(400).json({
            ok: false,
            msg: "El empleado especificado no existe o fue dado de baja",
          });
        }

        empleadoId = parsed;
      }

      let vehiculoId = old.vehiculo_id;

      if (vehiculo_id !== undefined) {
        const parsed = parseInt(vehiculo_id);

        if (isNaN(parsed)) {
          return res.status(400).json({
            ok: false,
            msg: "El ID de vehículo debe ser numérico",
          });
        }

        const vehOk = await prisma.vehiculos.findFirst({
          where: {
            vehiculo_id: parsed,
            fecha_eliminacion: null,
          },
        });

        if (!vehOk) {
          return res.status(400).json({
            ok: false,
            msg: "El vehículo especificado no existe o fue dado de baja",
          });
        }

        vehiculoId = parsed;
      }

      const fInicio = fecha_asignacion
        ? new Date(fecha_asignacion)
        : old.fecha_asignacion;

      const fFin = fecha_fin_asignacion
        ? new Date(fecha_fin_asignacion)
        : old.fecha_fin_asignacion;

      if (fFin && fInicio && fFin < fInicio) {
        return res.status(400).json({
          ok: false,
          msg: "La fecha de fin no puede ser anterior a la de inicio",
        });
      }

      const detalle = await prisma.detalles_vehiculos.update({
        where: {
          detalle_vehiculo_id: idNum,
        },
        data: {
          empleado_id: empleadoId,
          vehiculo_id: vehiculoId,
          fecha_asignacion: fInicio,
          fecha_fin_asignacion: fFin,
          descripcion:
            descripcion !== undefined ? descripcion : old.descripcion,
          fecha_actualizacion: new Date(),
        },
        include: {
          empleados: {
            select: {
              empleado_id: true,
              nombres: true,
              apellidos: true,
            },
          },
          vehiculos: {
            select: {
              vehiculo_id: true,
              placa: true,
              marca: true,
              modelo: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Asignación de vehículo actualizada",
        mensaje: `Se actualizó la asignación del vehículo ${detalle.vehiculos.marca} ${detalle.vehiculos.modelo}, placa ${detalle.vehiculos.placa}, al empleado ${detalle.empleados.nombres} ${detalle.empleados.apellidos}.`,
        modulo: "Detalles Vehículos",
        referencia_id: detalle.detalle_vehiculo_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Asignación actualizada correctamente",
        data: detalle,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al actualizar asignación de vehículo",
        mensaje:
          error.message ||
          "Ocurrió un error al actualizar una asignación de vehículo.",
        modulo: "Detalles Vehículos",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Server error, something went wrong",
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

      const existe = await prisma.detalles_vehiculos.findFirst({
        where: {
          detalle_vehiculo_id: idNum,
          fecha_eliminacion: null,
        },
        include: {
          empleados: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
          vehiculos: {
            select: {
              placa: true,
              marca: true,
              modelo: true,
            },
          },
        },
      });

      if (!existe) {
        return res.status(404).json({
          ok: false,
          msg: "No se encontró el detalle a eliminar",
        });
      }

      const eliminado = await prisma.detalles_vehiculos.update({
        where: {
          detalle_vehiculo_id: idNum,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Asignación de vehículo eliminada",
        mensaje: `Se eliminó la asignación del vehículo ${existe.vehiculos.marca} ${existe.vehiculos.modelo}, placa ${existe.vehiculos.placa}, del empleado ${existe.empleados.nombres} ${existe.empleados.apellidos}.`,
        modulo: "Detalles Vehículos",
        referencia_id: eliminado.detalle_vehiculo_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Asignación eliminada correctamente",
        id: eliminado.detalle_vehiculo_id,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al eliminar asignación de vehículo",
        mensaje:
          error.message ||
          "Ocurrió un error al eliminar una asignación de vehículo.",
        modulo: "Detalles Vehículos",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: error.message || "Server error, something went wrong",
      });
    }
  }
}