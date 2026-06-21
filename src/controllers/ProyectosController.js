import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

const ESTADOS_VALIDOS = ["En Espera", "Activo", "Completado", "Cancelado"];

export default class ProyectosController {
  static async getAll(_req, res) {
    try {
      const proyectos = await prisma.proyectos.findMany({
        where: {
          fecha_eliminacion: null,
        },
        include: {
          clientes: {
            select: {
              nombre_empresa: true,
            },
          },
        },
        orderBy: {
          proyecto_id: "asc",
        },
      });

      const data = proyectos.map((p) => ({
        ...p,
        cliente_nombre: p.clientes?.nombre_empresa ?? "—",
      }));

      res.json({
        ok: true,
        data,
      });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener proyectos",
        mensaje: error.message || "Ocurrió un error al cargar los proyectos.",
        modulo: "Proyectos",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener los proyectos.",
      });
    }
  }

  static async getById(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const idNum = Number(req.params.id);

    if (isNaN(idNum)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Proyecto no consultado",
        mensaje: "No se pudo consultar el proyecto porque el ID no es válido.",
        modulo: "Proyectos",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del proyecto debe ser un número.",
      });
    }

    try {
      const proyecto = await prisma.proyectos.findFirst({
        where: {
          proyecto_id: idNum,
          fecha_eliminacion: null,
        },
        include: {
          clientes: {
            select: {
              nombre_empresa: true,
            },
          },
        },
      });

      if (!proyecto) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no encontrado",
          mensaje: `No se encontró el proyecto con ID ${idNum}.`,
          modulo: "Proyectos",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el proyecto.",
        });
      }

      res.json({
        ok: true,
        data: {
          ...proyecto,
          cliente_nombre: proyecto.clientes?.nombre_empresa ?? "—",
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al obtener proyecto",
        mensaje: error.message || "Ocurrió un error al obtener el proyecto.",
        modulo: "Proyectos",
        referencia_id: idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al obtener el proyecto.",
      });
    }
  }

  static async create(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;

    try {
      const {
        cliente_id,
        nombre_proyecto,
        descripcion,
        ubicacion,
        fecha_inicio,
        fecha_fin,
        presupuesto_total,
        estado,
      } = req.body;

      if (!cliente_id || !nombre_proyecto || !fecha_inicio || !fecha_fin) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no creado",
          mensaje:
            "No se pudo crear el proyecto porque faltan campos obligatorios: cliente, nombre, fecha de inicio y fecha de fin.",
          modulo: "Proyectos",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: cliente_id, nombre_proyecto, fecha_inicio y fecha_fin.",
        });
      }

      const clienteId = String(cliente_id).trim();
      const presupuesto = Number(presupuesto_total ?? 0);
      const estadoFinal = estado ?? "En Espera";

      if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no creado",
          mensaje: `No se pudo crear el proyecto porque el estado "${estadoFinal}" no es válido.`,
          modulo: "Proyectos",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El estado del proyecto no es válido.",
        });
      }

      if (isNaN(presupuesto) || presupuesto <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no creado",
          mensaje:
            "No se pudo crear el proyecto porque el presupuesto debe ser mayor que cero.",
          modulo: "Proyectos",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El presupuesto debe ser mayor que cero.",
        });
      }

      const inicio = new Date(fecha_inicio);
      const fin = new Date(fecha_fin);

      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no creado",
          mensaje:
            "No se pudo crear el proyecto porque una de las fechas no es válida.",
          modulo: "Proyectos",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "Las fechas ingresadas no son válidas.",
        });
      }

      if (fin < inicio) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no creado",
          mensaje:
            "No se pudo crear el proyecto porque la fecha de fin es menor que la fecha de inicio.",
          modulo: "Proyectos",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "La fecha de fin no puede ser menor que la fecha de inicio.",
        });
      }

      const cliente = await prisma.clientes.findFirst({
        where: {
          cliente_id: clienteId,
          fecha_eliminacion: null,
        },
      });

      if (!cliente) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no creado",
          mensaje: `No se pudo crear el proyecto porque el cliente con ID "${clienteId}" no existe o fue eliminado.`,
          modulo: "Proyectos",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El cliente seleccionado no existe o fue eliminado.",
        });
      }

      const existeNombre = await prisma.proyectos.findFirst({
        where: {
          cliente_id: clienteId,
          nombre_proyecto: {
            equals: nombre_proyecto.trim(),
            mode: "insensitive",
          },
          fecha_eliminacion: null,
        },
      });

      if (existeNombre) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no creado",
          mensaje: `No se pudo crear el proyecto porque el cliente ya tiene un proyecto llamado "${nombre_proyecto.trim()}".`,
          modulo: "Proyectos",
          referencia_id: existeNombre.proyecto_id,
          prioridad: "Alta",
        });

        return res.status(409).json({
          ok: false,
          msg: "Ya existe un proyecto con ese nombre para el cliente seleccionado.",
        });
      }

      const proyecto = await prisma.proyectos.create({
        data: {
          cliente_id: clienteId,
          nombre_proyecto: nombre_proyecto.trim(),
          descripcion: descripcion?.trim() || null,
          ubicacion: ubicacion?.trim() || null,
          fecha_inicio: inicio,
          fecha_fin: fin,
          presupuesto_total: presupuesto,
          estado: estadoFinal,
        },
        include: {
          clientes: {
            select: {
              nombre_empresa: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Proyecto creado",
        mensaje: `Se creó el proyecto "${proyecto.nombre_proyecto}" para el cliente "${proyecto.clientes?.nombre_empresa ?? "Sin cliente"}".`,
        modulo: "Proyectos",
        referencia_id: proyecto.proyecto_id,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Proyecto creado correctamente.",
        data: {
          ...proyecto,
          cliente_nombre: proyecto.clientes?.nombre_empresa ?? "—",
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al crear proyecto",
        mensaje: error.message || "Ocurrió un error al crear el proyecto.",
        modulo: "Proyectos",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al crear el proyecto.",
      });
    }
  }

  static async update(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const idNum = Number(req.params.id);

    if (isNaN(idNum)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Proyecto no actualizado",
        mensaje:
          "No se pudo actualizar el proyecto porque el ID enviado no es válido.",
        modulo: "Proyectos",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del proyecto debe ser un número.",
      });
    }

    try {
      const old = await prisma.proyectos.findFirst({
        where: {
          proyecto_id: idNum,
          fecha_eliminacion: null,
        },
      });

      if (!old) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no actualizado",
          mensaje: `No se pudo actualizar el proyecto con ID ${idNum} porque no existe o fue eliminado.`,
          modulo: "Proyectos",
          referencia_id: idNum,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el proyecto a modificar.",
        });
      }

      const {
        cliente_id,
        nombre_proyecto,
        descripcion,
        ubicacion,
        fecha_inicio,
        fecha_fin,
        presupuesto_total,
        estado,
      } = req.body;

      const clienteId = cliente_id ? String(cliente_id).trim() : old.cliente_id;
      const nombreFinal = nombre_proyecto?.trim() ?? old.nombre_proyecto;
      const presupuesto =
        presupuesto_total !== undefined
          ? Number(presupuesto_total)
          : Number(old.presupuesto_total);
      const estadoFinal = estado ?? old.estado;

      if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no actualizado",
          mensaje: `No se pudo actualizar el proyecto porque el estado "${estadoFinal}" no es válido.`,
          modulo: "Proyectos",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El estado del proyecto no es válido.",
        });
      }

      if (isNaN(presupuesto) || presupuesto <= 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no actualizado",
          mensaje:
            "No se pudo actualizar el proyecto porque el presupuesto debe ser mayor que cero.",
          modulo: "Proyectos",
          referencia_id: idNum,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El presupuesto debe ser mayor que cero.",
        });
      }

      const inicio = fecha_inicio ? new Date(fecha_inicio) : old.fecha_inicio;
      const fin = fecha_fin ? new Date(fecha_fin) : old.fecha_fin;

      if (isNaN(new Date(inicio).getTime()) || isNaN(new Date(fin).getTime())) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no actualizado",
          mensaje:
            "No se pudo actualizar el proyecto porque una de las fechas no es válida.",
          modulo: "Proyectos",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "Las fechas ingresadas no son válidas.",
        });
      }

      if (new Date(fin) < new Date(inicio)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no actualizado",
          mensaje:
            "No se pudo actualizar el proyecto porque la fecha de fin es menor que la fecha de inicio.",
          modulo: "Proyectos",
          referencia_id: idNum,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "La fecha de fin no puede ser menor que la fecha de inicio.",
        });
      }

      const cliente = await prisma.clientes.findFirst({
        where: {
          cliente_id: clienteId,
          fecha_eliminacion: null,
        },
      });

      if (!cliente) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no actualizado",
          mensaje: `No se pudo actualizar el proyecto porque el cliente con ID "${clienteId}" no existe o fue eliminado.`,
          modulo: "Proyectos",
          referencia_id: idNum,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El cliente seleccionado no existe o fue eliminado.",
        });
      }

      if (
        nombreFinal !== old.nombre_proyecto ||
        String(clienteId) !== String(old.cliente_id)
      ) {
        const existeNombre = await prisma.proyectos.findFirst({
          where: {
            cliente_id: clienteId,
            nombre_proyecto: {
              equals: nombreFinal,
              mode: "insensitive",
            },
            fecha_eliminacion: null,
            NOT: {
              proyecto_id: idNum,
            },
          },
        });

        if (existeNombre) {
          await registrarAlerta({
            usuario_id,
            tipo: "Error",
            titulo: "Proyecto no actualizado",
            mensaje: `No se pudo actualizar el proyecto porque ya existe otro proyecto llamado "${nombreFinal}" para el cliente seleccionado.`,
            modulo: "Proyectos",
            referencia_id: idNum,
            prioridad: "Alta",
          });

          return res.status(409).json({
            ok: false,
            msg: "Ya existe otro proyecto con ese nombre para el cliente seleccionado.",
          });
        }
      }

      const proyecto = await prisma.proyectos.update({
        where: {
          proyecto_id: idNum,
        },
        data: {
          cliente_id: clienteId,
          nombre_proyecto: nombreFinal,
          descripcion: descripcion?.trim() ?? old.descripcion,
          ubicacion: ubicacion?.trim() ?? old.ubicacion,
          fecha_inicio: new Date(inicio),
          fecha_fin: new Date(fin),
          presupuesto_total: presupuesto,
          estado: estadoFinal,
          fecha_actualizacion: new Date(),
        },
        include: {
          clientes: {
            select: {
              nombre_empresa: true,
            },
          },
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Proyecto actualizado",
        mensaje: `Se actualizó el proyecto "${proyecto.nombre_proyecto}".`,
        modulo: "Proyectos",
        referencia_id: proyecto.proyecto_id,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Proyecto actualizado correctamente.",
        data: {
          ...proyecto,
          cliente_nombre: proyecto.clientes?.nombre_empresa ?? "—",
        },
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al actualizar proyecto",
        mensaje: error.message || "Ocurrió un error al actualizar el proyecto.",
        modulo: "Proyectos",
        referencia_id: isNaN(idNum) ? null : idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al actualizar el proyecto.",
      });
    }
  }

  static async delete(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const idNum = Number(req.params.id);

    if (isNaN(idNum)) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Proyecto no eliminado",
        mensaje:
          "No se pudo eliminar el proyecto porque el ID enviado no es válido.",
        modulo: "Proyectos",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del proyecto debe ser un número.",
      });
    }

    try {
      const existe = await prisma.proyectos.findFirst({
        where: {
          proyecto_id: idNum,
          fecha_eliminacion: null,
        },
      });

      if (!existe) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Proyecto no eliminado",
          mensaje: `No se pudo eliminar el proyecto con ID ${idNum} porque no existe o ya fue eliminado.`,
          modulo: "Proyectos",
          referencia_id: idNum,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el proyecto a eliminar.",
        });
      }

      const eliminado = await prisma.proyectos.update({
        where: {
          proyecto_id: idNum,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Proyecto eliminado",
        mensaje: `Se eliminó el proyecto "${existe.nombre_proyecto}".`,
        modulo: "Proyectos",
        referencia_id: eliminado.proyecto_id,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Proyecto eliminado correctamente.",
        id: eliminado.proyecto_id,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al eliminar proyecto",
        mensaje: error.message || "Ocurrió un error al eliminar el proyecto.",
        modulo: "Proyectos",
        referencia_id: isNaN(idNum) ? null : idNum,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar el proyecto.",
      });
    }
  }
}