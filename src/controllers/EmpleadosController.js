import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class EmpleadosController {
  static async getAll(_req, res) {
    try {
      const empleados = await prisma.empleados.findMany({
        where: { fecha_eliminacion: null },
        include: { roles: true },
        orderBy: { empleado_id: "asc" },
      });

      res.json({ ok: true, data: empleados });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener empleados",
        mensaje: error.message || "Ocurrió un error al cargar los empleados.",
        modulo: "Empleados",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error al obtener los empleados.",
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
        titulo: "Empleado no consultado",
        mensaje: "No se pudo consultar el empleado porque el ID no es válido.",
        modulo: "Empleados",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del empleado debe ser un número.",
      });
    }

    try {
      const empleado = await prisma.empleados.findFirst({
        where: {
          empleado_id: idNum,
          fecha_eliminacion: null,
        },
        include: { roles: true },
      });

      if (!empleado) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no encontrado",
          mensaje: `No se encontró el empleado con ID: ${idNum}.`,
          modulo: "Empleados",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: `No se encontró el empleado con ID: ${idNum}.`,
        });
      }

      res.json({ ok: true, data: empleado });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al obtener empleado",
        mensaje:
          error.message || `Ocurrió un error al obtener el empleado ${idNum}.`,
        modulo: "Empleados",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener el empleado.",
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
          titulo: "Empleado no creado",
          mensaje:
            "No se pudo crear el empleado porque el cuerpo de la petición está vacío o mal formateado.",
          modulo: "Empleados",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El cuerpo de la petición está vacío o mal formateado. Asegúrate de usar JSON.",
        });
      }

      const {
        nombres,
        apellidos,
        cedula,
        rol_id,
        fecha_nacimiento,
        fecha_contratacion,
        direccion,
        pais,
        telefono,
        correo,
        reportes,
      } = req.body;

      if (
        !nombres ||
        !apellidos ||
        !cedula ||
        !rol_id ||
        !fecha_nacimiento ||
        !fecha_contratacion
      ) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no creado",
          mensaje:
            "No se pudo crear el empleado porque faltan campos obligatorios: nombres, apellidos, cédula, rol, fecha de nacimiento y fecha de contratación.",
          modulo: "Empleados",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: nombres, apellidos, cedula, rol_id, fecha_nacimiento, fecha_contratacion.",
        });
      }

      const cedulaLimpia = cedula.trim();

      const cedulaRegex = /^[0-9]{13}[A-Za-z]$/;

      if (!cedulaRegex.test(cedulaLimpia)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no creado",
          mensaje:
            "No se pudo crear el empleado porque la cédula no tiene un formato válido.",
          modulo: "Empleados",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "La cédula debe tener 13 dígitos y una letra. Ejemplo: 2410102061000L.",
        });
      }

      if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no creado",
          mensaje:
            "No se pudo crear el empleado porque el correo ingresado no tiene un formato válido.",
          modulo: "Empleados",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El correo ingresado no tiene un formato válido.",
        });
      }

      const rolIdNum = parseInt(rol_id);

      if (isNaN(rolIdNum)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no creado",
          mensaje:
            "No se pudo crear el empleado porque el rol enviado no es válido.",
          modulo: "Empleados",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El rol especificado no es válido.",
        });
      }

      const rolExistente = await prisma.roles.findUnique({
        where: {
          rol_id: rolIdNum,
        },
      });

      if (!rolExistente) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no creado",
          mensaje: `No se pudo crear el empleado porque el rol con ID ${rolIdNum} no existe.`,
          modulo: "Empleados",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El rol especificado no existe.",
        });
      }

      const existeCedula = await prisma.empleados.findFirst({
        where: {
          cedula: cedulaLimpia,
          fecha_eliminacion: null,
        },
      });

      if (existeCedula) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no creado",
          mensaje: `No se pudo crear el empleado porque ya existe un empleado con la cédula "${cedulaLimpia}".`,
          modulo: "Empleados",
          referencia_id: existeCedula.empleado_id,
          prioridad: "Alta",
        });

        return res.status(409).json({
          ok: false,
          msg: "Ya existe un empleado con esa cédula.",
        });
      }

      const empleado = await prisma.empleados.create({
        data: {
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          cedula: cedulaLimpia,
          rol_id: rolIdNum,
          fecha_nacimiento: new Date(fecha_nacimiento),
          fecha_contratacion: new Date(fecha_contratacion),
          direccion: direccion?.trim() || null,
          pais: pais?.trim() || null,
          telefono: telefono?.trim() || null,
          correo: correo?.trim() || null,
          reportes: reportes ? parseInt(reportes) : null,
        },
        include: {
          roles: true,
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Empleado creado",
        mensaje: `Se creó el empleado ${empleado.nombres} ${empleado.apellidos} con el cargo "${empleado.roles?.cargo ?? "Sin cargo"}".`,
        modulo: "Empleados",
        referencia_id: empleado.empleado_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Empleado creado correctamente.",
        data: empleado,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al crear empleado",
        mensaje: error.message || "Ocurrió un error al crear el empleado.",
        modulo: "Empleados",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al crear el empleado.",
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
        titulo: "Empleado no actualizado",
        mensaje:
          "No se pudo actualizar el empleado porque el ID enviado no es válido.",
        modulo: "Empleados",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del empleado debe ser un número.",
      });
    }

    try {
      const old = await prisma.empleados.findUnique({
        where: {
          empleado_id: idNum,
        },
        include: {
          roles: true,
        },
      });

      if (!old || old.fecha_eliminacion !== null) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no actualizado",
          mensaje: `No se pudo actualizar el empleado con ID ${idNum} porque no existe o está eliminado.`,
          modulo: "Empleados",
          referencia_id: idNum,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el empleado a modificar.",
        });
      }

      const {
        nombres,
        apellidos,
        cedula,
        rol_id,
        fecha_nacimiento,
        fecha_contratacion,
        direccion,
        pais,
        telefono,
        correo,
        reportes,
      } = req.body;

      const cedulaLimpia = cedula?.trim();

      if (cedulaLimpia) {
        const cedulaRegex = /^[0-9]{13}[A-Za-z]$/;

        if (!cedulaRegex.test(cedulaLimpia)) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Empleado no actualizado",
            mensaje:
              "No se pudo actualizar el empleado porque la cédula no tiene un formato válido.",
            modulo: "Empleados",
            referencia_id: idNum,
            prioridad: "Media",
          });

          return res.status(400).json({
            ok: false,
            msg: "La cédula debe tener 13 dígitos y una letra. Ejemplo: 2410102061000L.",
          });
        }
      }

      if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no actualizado",
          mensaje:
            "No se pudo actualizar el empleado porque el correo ingresado no tiene un formato válido.",
          modulo: "Empleados",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El correo ingresado no tiene un formato válido.",
        });
      }

      let rolIdNum = old.rol_id;

      if (rol_id) {
        rolIdNum = parseInt(rol_id);

        if (isNaN(rolIdNum)) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Empleado no actualizado",
            mensaje:
              "No se pudo actualizar el empleado porque el rol enviado no es válido.",
            modulo: "Empleados",
            referencia_id: idNum,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "El rol especificado no es válido.",
          });
        }

        const rolExistente = await prisma.roles.findUnique({
          where: {
            rol_id: rolIdNum,
          },
        });

        if (!rolExistente) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Empleado no actualizado",
            mensaje: `No se pudo actualizar el empleado porque el rol con ID ${rolIdNum} no existe.`,
            modulo: "Empleados",
            referencia_id: idNum,
            prioridad: "Alta",
          });

          return res.status(400).json({
            ok: false,
            msg: "El rol especificado no existe.",
          });
        }
      }

      if (cedulaLimpia && cedulaLimpia !== old.cedula) {
        const existeCedula = await prisma.empleados.findFirst({
          where: {
            cedula: cedulaLimpia,
            fecha_eliminacion: null,
            NOT: {
              empleado_id: idNum,
            },
          },
        });

        if (existeCedula) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Empleado no actualizado",
            mensaje: `No se pudo actualizar el empleado porque ya existe otro empleado con la cédula "${cedulaLimpia}".`,
            modulo: "Empleados",
            referencia_id: idNum,
            prioridad: "Alta",
          });

          return res.status(409).json({
            ok: false,
            msg: "Ya existe otro empleado con esa cédula.",
          });
        }
      }

      const empleado = await prisma.empleados.update({
        where: {
          empleado_id: idNum,
        },
        data: {
          nombres: nombres?.trim() ?? old.nombres,
          apellidos: apellidos?.trim() ?? old.apellidos,
          cedula: cedulaLimpia ?? old.cedula,
          rol_id: rolIdNum,
          fecha_nacimiento: fecha_nacimiento
            ? new Date(fecha_nacimiento)
            : old.fecha_nacimiento,
          fecha_contratacion: fecha_contratacion
            ? new Date(fecha_contratacion)
            : old.fecha_contratacion,
          direccion: direccion?.trim() ?? old.direccion,
          pais: pais?.trim() ?? old.pais,
          telefono: telefono?.trim() ?? old.telefono,
          correo: correo?.trim() ?? old.correo,
          reportes: reportes ? parseInt(reportes) : old.reportes,
          fecha_actualizacion: new Date(),
        },
        include: {
          roles: true,
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Empleado actualizado",
        mensaje: `Se actualizó el empleado ${empleado.nombres} ${empleado.apellidos}.`,
        modulo: "Empleados",
        referencia_id: empleado.empleado_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Empleado actualizado correctamente.",
        data: empleado,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al actualizar empleado",
        mensaje:
          error.message || "Ocurrió un error al actualizar el empleado.",
        modulo: "Empleados",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al actualizar el empleado.",
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
        titulo: "Empleado no eliminado",
        mensaje:
          "No se pudo eliminar el empleado porque el ID enviado no es válido.",
        modulo: "Empleados",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del empleado debe ser un número.",
      });
    }

    try {
      const existe = await prisma.empleados.findFirst({
        where: {
          empleado_id: idNum,
          fecha_eliminacion: null,
        },
        include: {
          roles: true,
        },
      });

      if (!existe) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Empleado no eliminado",
          mensaje: `No se pudo eliminar el empleado con ID ${idNum} porque no existe o ya fue eliminado.`,
          modulo: "Empleados",
          referencia_id: idNum,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el empleado a eliminar.",
        });
      }

      const eliminado = await prisma.empleados.update({
        where: {
          empleado_id: idNum,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Empleado eliminado",
        mensaje: `Se eliminó el empleado ${existe.nombres} ${existe.apellidos}.`,
        modulo: "Empleados",
        referencia_id: eliminado.empleado_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Empleado eliminado correctamente.",
        id: eliminado.empleado_id,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al eliminar empleado",
        mensaje: error.message || "Ocurrió un error al eliminar el empleado.",
        modulo: "Empleados",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar el empleado.",
      });
    }
  }
}