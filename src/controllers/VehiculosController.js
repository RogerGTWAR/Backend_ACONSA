// Listo
import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

const ESTADOS_PERMITIDOS = ["Disponible", "En Mantenimiento", "No Disponible"];
const COMBUSTIBLES_PERMITIDOS = ["Diésel", "Regular", "Gasolina Super"];

function isValidYear(anio) {
  const y = parseInt(anio);
  if (isNaN(y)) return false;
  const current = new Date().getFullYear();
  return y >= 1886 && y <= current;
}

export default class VehiculosController {
  static async getAll(_req, res) {
    try {
      const vehiculos = await prisma.vehiculos.findMany({
        where: { fecha_eliminacion: null },
        include: {
          proveedores: {
            select: {
              proveedor_id: true,
              nombre_empresa: true,
            },
          },
        },
        orderBy: { vehiculo_id: "asc" },
      });

      const data = vehiculos.map((v) => ({
        ...v,
        proveedor: v.proveedores?.nombre_empresa ?? null,
      }));

      res.json({ ok: true, data });
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
        msg: "El ID del vehículo debe ser un número",
      });
    }

    try {
      const vehiculo = await prisma.vehiculos.findFirst({
        where: {
          vehiculo_id: idNum,
          fecha_eliminacion: null,
        },
        include: {
          proveedores: {
            select: {
              proveedor_id: true,
              nombre_empresa: true,
            },
          },
        },
      });

      if (!vehiculo) {
        return res.status(404).json({
          ok: false,
          msg: `No se encontró el vehículo con ID: ${idNum}`,
        });
      }

      res.json({
        ok: true,
        data: {
          ...vehiculo,
          proveedor: vehiculo.proveedores?.nombre_empresa ?? null,
        },
      });
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
          msg: "El cuerpo de la petición está vacío o mal formateado. Asegúrate de usar JSON.",
        });
      }

      const {
        proveedor_id,
        marca,
        modelo,
        anio,
        placa,
        tipo_de_vehiculo,
        tipo_de_combustible,
        estado,
        fecha_registro,
      } = req.body;

      if (!marca || !modelo || !placa) {
        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: marca, modelo y placa",
        });
      }

      if (anio && !isValidYear(anio)) {
        return res.status(400).json({
          ok: false,
          msg: "Año inválido (>=1886 y <= año actual)",
        });
      }

      if (estado && !ESTADOS_PERMITIDOS.includes(estado)) {
        return res.status(400).json({
          ok: false,
          msg: `Estado inválido. Valores permitidos: ${ESTADOS_PERMITIDOS.join(", ")}`,
        });
      }

      if (
        tipo_de_combustible &&
        !COMBUSTIBLES_PERMITIDOS.includes(tipo_de_combustible)
      ) {
        return res.status(400).json({
          ok: false,
          msg: `Tipo de combustible inválido. Valores permitidos: ${COMBUSTIBLES_PERMITIDOS.join(", ")}`,
        });
      }

      let proveedorId = null;

      if (proveedor_id !== undefined && proveedor_id !== null) {
        const parsed = parseInt(proveedor_id);

        if (isNaN(parsed)) {
          return res.status(400).json({
            ok: false,
            msg: "El ID del proveedor debe ser un número",
          });
        }

        const provOk = await prisma.proveedores.findFirst({
          where: {
            proveedor_id: parsed,
            fecha_eliminacion: null,
          },
        });

        if (!provOk) {
          return res.status(400).json({
            ok: false,
            msg: "El proveedor no existe o fue dado de baja",
          });
        }

        proveedorId = parsed;
      }

      const placaNorm = placa.trim().toUpperCase();

      const existente = await prisma.vehiculos.findFirst({
        where: {
          placa: placaNorm,
          fecha_eliminacion: null,
        },
      });

      if (existente) {
        return res.status(400).json({
          ok: false,
          msg: `Ya existe un vehículo con la placa ${placaNorm}`,
        });
      }

      const fRegistro = fecha_registro ? new Date(fecha_registro) : null;

      const nuevo = await prisma.vehiculos.create({
        data: {
          proveedor_id: proveedorId,
          marca: marca.trim(),
          modelo: modelo.trim(),
          anio: anio ? parseInt(anio) : null,
          placa: placaNorm,
          tipo_de_vehiculo: tipo_de_vehiculo?.trim() ?? null,
          tipo_de_combustible: tipo_de_combustible ?? null,
          estado: estado ?? null,
          fecha_registro: fRegistro,
        },
        include: {
          proveedores: {
            select: {
              proveedor_id: true,
              nombre_empresa: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Vehículo creado",
        mensaje: `Se creó el vehículo ${nuevo.marca} ${nuevo.modelo}, placa ${nuevo.placa}.`,
        modulo: "Vehículos",
        referencia_id: nuevo.vehiculo_id,
        prioridad: "Media",
      });

      return res.status(201).json({
        ok: true,
        msg: "Vehículo creado correctamente",
        data: {
          ...nuevo,
          proveedor: nuevo.proveedores?.nombre_empresa ?? null,
        },
      });
    } catch (error) {
      const esPlacaDuplicada =
        error?.code === "P2002" && error?.meta?.target?.includes("placa");

      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: esPlacaDuplicada ? "Registro duplicado" : "Error",
        titulo: esPlacaDuplicada
          ? "Placa de vehículo duplicada"
          : "Error al crear vehículo",
        mensaje: esPlacaDuplicada
          ? "Se intentó registrar un vehículo con una placa ya existente."
          : error.message || "Ocurrió un error al crear el vehículo.",
        modulo: "Vehículos",
        prioridad: "Alta",
      });

      if (esPlacaDuplicada) {
        return res.status(400).json({
          ok: false,
          msg: "La placa ya está registrada",
        });
      }

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
        msg: "El ID del vehículo debe ser un número",
      });
    }

    try {
      const usuario_id = req.user?.usuario_id ?? null;

      const old = await prisma.vehiculos.findUnique({
        where: {
          vehiculo_id: idNum,
        },
      });

      if (!old || old.fecha_eliminacion !== null) {
        return res.status(404).json({
          ok: false,
          msg: "No se encontró el vehículo a modificar",
        });
      }

      const {
        proveedor_id,
        marca,
        modelo,
        anio,
        placa,
        tipo_de_vehiculo,
        tipo_de_combustible,
        estado,
        fecha_registro,
      } = req.body;

      let proveedorId = old.proveedor_id;

      if (proveedor_id !== undefined) {
        if (proveedor_id === null) {
          proveedorId = null;
        } else {
          const parsed = parseInt(proveedor_id);

          if (isNaN(parsed)) {
            return res.status(400).json({
              ok: false,
              msg: "El ID del proveedor debe ser un número",
            });
          }

          const provOk = await prisma.proveedores.findFirst({
            where: {
              proveedor_id: parsed,
              fecha_eliminacion: null,
            },
          });

          if (!provOk) {
            return res.status(400).json({
              ok: false,
              msg: "El proveedor no existe o fue dado de baja",
            });
          }

          proveedorId = parsed;
        }
      }

      if (anio && !isValidYear(anio)) {
        return res.status(400).json({
          ok: false,
          msg: "Año inválido (>=1886 y <= año actual)",
        });
      }

      if (estado && !ESTADOS_PERMITIDOS.includes(estado)) {
        return res.status(400).json({
          ok: false,
          msg: `Estado inválido. Valores permitidos: ${ESTADOS_PERMITIDOS.join(", ")}`,
        });
      }

      if (
        tipo_de_combustible &&
        !COMBUSTIBLES_PERMITIDOS.includes(tipo_de_combustible)
      ) {
        return res.status(400).json({
          ok: false,
          msg: `Tipo de combustible inválido. Valores permitidos: ${COMBUSTIBLES_PERMITIDOS.join(", ")}`,
        });
      }

      const fRegistro = fecha_registro
        ? new Date(fecha_registro)
        : old.fecha_registro;

      const nuevaPlaca = placa ? placa.trim().toUpperCase() : old.placa;

      const actualizado = await prisma.vehiculos.update({
        where: {
          vehiculo_id: idNum,
        },
        data: {
          proveedor_id: proveedorId,
          marca: marca?.trim() ?? old.marca,
          modelo: modelo?.trim() ?? old.modelo,
          anio: anio ? parseInt(anio) : old.anio,
          placa: nuevaPlaca,
          tipo_de_vehiculo: tipo_de_vehiculo?.trim() ?? old.tipo_de_vehiculo,
          tipo_de_combustible: tipo_de_combustible ?? old.tipo_de_combustible,
          estado: estado ?? old.estado,
          fecha_registro: fRegistro,
          fecha_actualizacion: new Date(),
        },
        include: {
          proveedores: {
            select: {
              proveedor_id: true,
              nombre_empresa: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Vehículo actualizado",
        mensaje: `Se actualizó el vehículo ${actualizado.marca} ${actualizado.modelo}, placa ${actualizado.placa}.`,
        modulo: "Vehículos",
        referencia_id: actualizado.vehiculo_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Vehículo actualizado correctamente",
        data: {
          ...actualizado,
          proveedor: actualizado.proveedores?.nombre_empresa ?? null,
        },
      });
    } catch (error) {
      const esPlacaDuplicada =
        error?.code === "P2002" && error?.meta?.target?.includes("placa");

      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: esPlacaDuplicada ? "Registro duplicado" : "Error",
        titulo: esPlacaDuplicada
          ? "Placa de vehículo duplicada"
          : "Error al actualizar vehículo",
        mensaje: esPlacaDuplicada
          ? "Se intentó actualizar un vehículo con una placa ya existente."
          : error.message || "Ocurrió un error al actualizar el vehículo.",
        modulo: "Vehículos",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      if (esPlacaDuplicada) {
        return res.status(400).json({
          ok: false,
          msg: "La placa ya está registrada",
        });
      }

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
        msg: "El ID del vehículo debe ser un número",
      });
    }

    try {
      const usuario_id = req.user?.usuario_id ?? null;

      const existe = await prisma.vehiculos.findFirst({
        where: {
          vehiculo_id: idNum,
          fecha_eliminacion: null,
        },
      });

      if (!existe) {
        return res.status(404).json({
          ok: false,
          msg: "No se encontró el vehículo a eliminar",
        });
      }

      const eliminado = await prisma.vehiculos.update({
        where: {
          vehiculo_id: idNum,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Vehículo eliminado",
        mensaje: `Se eliminó el vehículo ${existe.marca} ${existe.modelo}, placa ${existe.placa}.`,
        modulo: "Vehículos",
        referencia_id: eliminado.vehiculo_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Vehículo eliminado correctamente",
        id: eliminado.vehiculo_id,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al eliminar vehículo",
        mensaje: error.message || "Ocurrió un error al eliminar el vehículo.",
        modulo: "Vehículos",
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