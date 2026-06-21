import prisma from "../database.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

export default class PermisosController {
  static async buscarEmpleado(req, res) {
    try {
      const { usuario } = req.params;

      if (!usuario) {
        return res.status(400).json({
          ok: false,
          msg: "Debe enviar el usuario",
        });
      }

      const usuarioEncontrado = await prisma.usuarios.findFirst({
        where: { usuario },
        include: {
          empleados: {
            include: { roles: true },
          },
        },
      });

      if (!usuarioEncontrado) {
        return res.status(404).json({
          ok: false,
          msg: "Usuario no encontrado",
        });
      }

      return res.json({
        ok: true,
        data: usuarioEncontrado,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        msg: "Error al buscar usuario",
      });
    }
  }

  static async getMenuAll(_req, res) {
    try {
      const data = await prisma.menu.findMany({
        orderBy: { id_menu: "asc" },
      });

      return res.json({
        ok: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        msg: "Error al obtener menús",
      });
    }
  }

  static async getPermisosAsignados(req, res) {
    try {
      const usuarioId = Number(req.params.usuarioId);

      if (isNaN(usuarioId)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido",
        });
      }

      const asignados = await prisma.permisos.findMany({
        where: {
          usuario_id: usuarioId,
          fecha_eliminacion: null,
        },
        include: { menu: true },
        orderBy: { id_menu: "asc" },
      });

      const formatted = asignados.map((p) => ({
        permisoId: p.permiso_id,
        menuId: p.id_menu,
        usuarioId: p.usuario_id,
        nombre: p.menu?.nombre,
        url: p.menu?.url,
        esSubmenu: p.menu?.esSubmenu ?? false,
      }));

      return res.json({
        ok: true,
        data: formatted,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        msg: "Error interno",
      });
    }
  }

  static async getMenuSinAsignar(req, res) {
    try {
      const usuarioId = Number(req.params.usuarioId);

      if (isNaN(usuarioId)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido",
        });
      }

      const asignados = await prisma.permisos.findMany({
        where: {
          usuario_id: usuarioId,
          fecha_eliminacion: null,
        },
        select: { id_menu: true },
      });

      const idsAsignados = asignados.map((p) => p.id_menu);

      const noAsignados = await prisma.menu.findMany({
        where: {
          id_menu: {
            notIn: idsAsignados.length > 0 ? idsAsignados : [0],
          },
        },
        orderBy: { id_menu: "asc" },
      });

      return res.json({
        ok: true,
        data: noAsignados,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        msg: "Error interno",
      });
    }
  }

  static async asignar(req, res) {
    try {
      const usuarioAccion = req.user?.usuario_id ?? null;
      const { usuario_id, menus } = req.body;

      if (!usuario_id || !menus || !Array.isArray(menus)) {
        return res.status(400).json({
          ok: false,
          msg: "Debe enviar usuario_id y un arreglo de menus",
        });
      }

      const usuarioId = Number(usuario_id);

      const userExists = await prisma.usuarios.findFirst({
        where: { usuario_id: usuarioId },
        include: {
          empleados: {
            select: {
              nombres: true,
              apellidos: true,
            },
          },
        },
      });

      if (!userExists) {
        return res.status(404).json({
          ok: false,
          msg: "Usuario no existe",
        });
      }

      const resultado = [];
      const menusAsignados = [];

      for (const menu of menus) {
        const menuId = Number(menu);

        const existeMenu = await prisma.menu.findFirst({
          where: { id_menu: menuId },
        });

        if (!existeMenu) continue;

        const permiso = await prisma.permisos.findFirst({
          where: {
            usuario_id: usuarioId,
            id_menu: menuId,
          },
        });

        if (permiso && permiso.fecha_eliminacion !== null) {
          const updated = await prisma.permisos.update({
            where: { permiso_id: permiso.permiso_id },
            data: {
              fecha_eliminacion: null,
              fecha_actualizacion: new Date(),
              estado: true,
            },
          });

          resultado.push(updated);
          menusAsignados.push(existeMenu.nombre);
          continue;
        }

        if (!permiso) {
          const created = await prisma.permisos.create({
            data: {
              usuario_id: usuarioId,
              id_menu: menuId,
            },
          });

          resultado.push(created);
          menusAsignados.push(existeMenu.nombre);
        }
      }

      if (resultado.length > 0) {
        await registrarAlerta({
          usuario_id: usuarioAccion,
          tipo: "Permisos asignados",
          titulo: "Permisos asignados a usuario",
          mensaje: `Se asignaron ${resultado.length} permiso(s) al usuario "${userExists.usuario}". Menús: ${menusAsignados.join(", ")}.`,
          modulo: "Permisos",
          referencia_id: usuarioId,
          prioridad: "Alta",
        });
      }

      return res.json({
        ok: true,
        msg: "Permisos asignados correctamente",
        data: resultado,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al asignar permisos",
        mensaje: error.message || "Ocurrió un error al asignar permisos.",
        modulo: "Permisos",
        prioridad: "Alta",
      });

      return res.status(500).json({
        ok: false,
        msg: "Error al asignar permisos",
      });
    }
  }

  static async remover(req, res) {
    try {
      const usuarioAccion = req.user?.usuario_id ?? null;
      const { usuario_id, menus } = req.body;

      if (!usuario_id || !menus || !Array.isArray(menus)) {
        return res.status(400).json({
          ok: false,
          msg: "Debe enviar usuario_id y arreglo de menus",
        });
      }

      const usuarioId = Number(usuario_id);

      const usuarioEncontrado = await prisma.usuarios.findFirst({
        where: { usuario_id: usuarioId },
      });

      if (!usuarioEncontrado) {
        return res.status(404).json({
          ok: false,
          msg: "Usuario no existe",
        });
      }

      const resultado = [];
      const menusRemovidos = [];

      for (const id of menus) {
        const menuId = Number(id);

        const permiso = await prisma.permisos.findFirst({
          where: {
            usuario_id: usuarioId,
            id_menu: menuId,
            fecha_eliminacion: null,
          },
          include: {
            menu: true,
          },
        });

        if (!permiso) continue;

        const deleted = await prisma.permisos.update({
          where: { permiso_id: permiso.permiso_id },
          data: {
            fecha_eliminacion: new Date(),
            fecha_actualizacion: new Date(),
            estado: false,
          },
        });

        resultado.push(deleted);
        menusRemovidos.push(permiso.menu?.nombre ?? `Menú ID ${menuId}`);
      }

      if (resultado.length > 0) {
        await registrarAlerta({
          usuario_id: usuarioAccion,
          tipo: "Permisos removidos",
          titulo: "Permisos removidos a usuario",
          mensaje: `Se removieron ${resultado.length} permiso(s) al usuario "${usuarioEncontrado.usuario}". Menús: ${menusRemovidos.join(", ")}.`,
          modulo: "Permisos",
          referencia_id: usuarioId,
          prioridad: "Alta",
        });
      }

      return res.json({
        ok: true,
        msg: "Permisos removidos correctamente",
        data: resultado,
      });
    } catch (error) {
      await registrarAlerta({
        usuario_id: req.user?.usuario_id ?? null,
        tipo: "Error",
        titulo: "Error al remover permisos",
        mensaje: error.message || "Ocurrió un error al remover permisos.",
        modulo: "Permisos",
        prioridad: "Alta",
      });

      return res.status(500).json({
        ok: false,
        msg: "Error al remover permisos",
      });
    }
  }
}