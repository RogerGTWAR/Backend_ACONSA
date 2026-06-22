import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class ClientesController {
  static async getAll(_req, res) {
    try {
      const clientes = await prisma.clientes.findMany({
        where: { fecha_eliminacion: null },
        orderBy: { cliente_id: "asc" },
      });

      res.json({ ok: true, data: clientes });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener clientes",
        mensaje: error.message || "Ocurrió un error al cargar los clientes.",
        modulo: "Clientes",
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error al obtener los clientes.",
      });
    }
  }

  static async getById(req, res) {
    const id = req.params.id?.trim();

    if (!id) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener cliente",
        mensaje: "Se intentó obtener un cliente sin enviar el ID.",
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Media",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del cliente es requerido.",
      });
    }

    try {
      const cliente = await prisma.clientes.findFirst({
        where: {
          cliente_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!cliente) {
        await registrarAlerta({
          tipo: "Error",
          titulo: "Cliente no encontrado",
          mensaje: `No se encontró el cliente con ID: ${id}.`,
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(404).json({
          ok: false,
          msg: `No se encontró el cliente con ID: ${id}`,
        });
      }

      res.json({ ok: true, data: cliente });
    } catch (error) {
      await registrarAlerta({
        tipo: "Error",
        titulo: "Error al obtener cliente",
        mensaje: error.message || `Ocurrió un error al obtener el cliente ${id}.`,
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error al obtener el cliente.",
      });
    }
  }

  static async create(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;

    try {
      const {
        cliente_id,
        tipo_cliente,
        numero_identificacion,
        nombre_empresa,
        nombre_contacto,
        cargo_contacto,
        direccion,
        ciudad,
        pais,
        telefono,
        correo,
      } = req.body;

      if (!cliente_id || !tipo_cliente || !nombre_empresa) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no creado",
          mensaje:
            "No se pudo crear el cliente porque faltan campos obligatorios: cliente_id, tipo_cliente y nombre_empresa.",
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "Campos obligatorios: cliente_id, tipo_cliente y nombre_empresa.",
        });
      }

      const tiposPermitidos = ["Persona Natural", "Persona Jurídica"];

      if (!tiposPermitidos.includes(tipo_cliente)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no creado",
          mensaje:
            "No se pudo crear el cliente porque el tipo de cliente no es válido.",
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El tipo de cliente debe ser Persona Natural o Persona Jurídica.",
        });
      }

      if (correo && !correo.includes("@")) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no creado",
          mensaje:
            "No se pudo crear el cliente porque el correo ingresado no tiene un formato válido.",
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El correo ingresado no tiene un formato válido.",
        });
      }

      const clienteIdLimpio = cliente_id.trim();

      const existe = await prisma.clientes.findUnique({
        where: {
          cliente_id: clienteIdLimpio,
        },
      });

      if (existe) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no creado",
          mensaje: `No se pudo crear el cliente porque ya existe un cliente con el ID "${clienteIdLimpio}".`,
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(409).json({
          ok: false,
          msg: "Ya existe un cliente con ese ID.",
        });
      }

      const cliente = await prisma.clientes.create({
        data: {
          cliente_id: clienteIdLimpio,
          tipo_cliente: tipo_cliente.trim(),
          numero_identificacion: numero_identificacion?.trim() ?? null,
          nombre_empresa: nombre_empresa.trim(),
          nombre_contacto: nombre_contacto?.trim() ?? null,
          cargo_contacto: cargo_contacto?.trim() ?? null,
          direccion: direccion?.trim() ?? null,
          ciudad: ciudad?.trim() ?? null,
          pais: pais?.trim() ?? null,
          telefono: telefono?.trim() ?? null,
          correo: correo?.trim() ?? null,
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro creado",
        titulo: "Cliente creado",
        mensaje: `Se creó el cliente "${cliente.nombre_empresa}".`,
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Media",
      });

      res.status(201).json({
        ok: true,
        msg: "Cliente creado correctamente.",
        data: cliente,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al crear cliente",
        mensaje: error.message || "Ocurrió un error al crear un cliente.",
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al crear el cliente.",
      });
    }
  }

  static async update(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const id = req.params.id?.trim();

    if (!id) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Cliente no actualizado",
        mensaje: "No se pudo actualizar el cliente porque no se envió el ID.",
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del cliente es requerido.",
      });
    }

    try {
      const old = await prisma.clientes.findUnique({
        where: {
          cliente_id: id,
        },
      });

      if (!old || old.fecha_eliminacion !== null) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no actualizado",
          mensaje: `No se pudo actualizar el cliente con ID "${id}" porque no existe o está eliminado.`,
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el cliente a modificar.",
        });
      }

      const {
        tipo_cliente,
        numero_identificacion,
        nombre_empresa,
        nombre_contacto,
        cargo_contacto,
        direccion,
        ciudad,
        pais,
        telefono,
        correo,
      } = req.body;

      const tiposPermitidos = ["Persona Natural", "Persona Jurídica"];

      if (tipo_cliente && !tiposPermitidos.includes(tipo_cliente)) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no actualizado",
          mensaje:
            "No se pudo actualizar el cliente porque el tipo de cliente no es válido.",
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(400).json({
          ok: false,
          msg: "El tipo de cliente debe ser Persona Natural o Persona Jurídica.",
        });
      }

      if (correo && !correo.includes("@")) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no actualizado",
          mensaje:
            "No se pudo actualizar el cliente porque el correo ingresado no tiene un formato válido.",
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Media",
        });

        return res.status(400).json({
          ok: false,
          msg: "El correo ingresado no tiene un formato válido.",
        });
      }

      const cliente = await prisma.clientes.update({
        where: {
          cliente_id: id,
        },
        data: {
          tipo_cliente: tipo_cliente?.trim() ?? old.tipo_cliente,
          numero_identificacion:
            numero_identificacion?.trim() ?? old.numero_identificacion,
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
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro actualizado",
        titulo: "Cliente actualizado",
        mensaje: `Se actualizó el cliente "${cliente.nombre_empresa}".`,
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Media",
      });

      res.json({
        ok: true,
        msg: "Cliente actualizado correctamente.",
        data: cliente,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al actualizar cliente",
        mensaje: error.message || `Ocurrió un error al actualizar el cliente ${id}.`,
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al actualizar el cliente.",
      });
    }
  }

  static async delete(req, res) {
    const usuario_id = req.user?.usuario_id ?? null;
    const id = req.params.id?.trim();

    if (!id) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Cliente no eliminado",
        mensaje: "No se pudo eliminar el cliente porque no se envió el ID.",
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Alta",
      });

      return res.status(400).json({
        ok: false,
        msg: "El ID del cliente es requerido.",
      });
    }

    try {
      const existe = await prisma.clientes.findFirst({
        where: {
          cliente_id: id,
          fecha_eliminacion: null,
        },
      });

      if (!existe) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no eliminado",
          mensaje: `No se pudo eliminar el cliente con ID "${id}" porque no existe o ya fue eliminado.`,
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(404).json({
          ok: false,
          msg: "No se encontró el cliente a eliminar.",
        });
      }

      const proyectosAsociados = await prisma.proyectos.count({
        where: {
          cliente_id: id,
          fecha_eliminacion: null,
        },
      });

      if (proyectosAsociados > 0) {
        await registrarAlerta({
          usuario_id,
          tipo: "Error",
          titulo: "Cliente no eliminado",
          mensaje: `No se pudo eliminar el cliente "${existe.nombre_empresa}" porque tiene ${proyectosAsociados} proyecto(s) asociado(s).`,
          modulo: "Clientes",
          referencia_id: null,
          prioridad: "Alta",
        });

        return res.status(409).json({
          ok: false,
          msg: "No se puede eliminar el cliente porque tiene proyectos asociados en el sistema.",
        });
      }

      await prisma.clientes.update({
        where: {
          cliente_id: id,
        },
        data: {
          fecha_eliminacion: new Date(),
          fecha_actualizacion: new Date(),
        },
      });

      await registrarAlerta({
        usuario_id,
        tipo: "Registro eliminado",
        titulo: "Cliente eliminado",
        mensaje: `Se eliminó el cliente "${existe.nombre_empresa}".`,
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.json({
        ok: true,
        msg: "Cliente eliminado correctamente.",
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id,
        tipo: "Error",
        titulo: "Error al eliminar cliente",
        mensaje: error.message || `Ocurrió un error al eliminar el cliente ${id}.`,
        modulo: "Clientes",
        referencia_id: null,
        prioridad: "Alta",
      });

      res.status(500).json({
        ok: false,
        msg: "Error interno al eliminar el cliente.",
      });
    }
  }
}