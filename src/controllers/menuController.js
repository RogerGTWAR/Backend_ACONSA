import prisma from "../database.js";

export default class menuController {
  static normalizarParentId(value) {
    if (value === "" || value === undefined || value === null) {
      return null;
    }

    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? NaN : numberValue;
  }

  static async getAll(_req, res) {
    try {
      const data = await prisma.menu.findMany({
        where: { estado: true },
        include: {
          parent: true,
          children: true,
        },
        orderBy: { id_menu: "asc" },
      });

      res.json({
        ok: true,
        data,
      });
    } catch (error) {
      console.error("Error Menu getAll:", error);

      res.status(500).json({
        ok: false,
        msg: "Error al obtener menús.",
      });
    }
  }

  static async getById(req, res) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido.",
        });
      }

      const item = await prisma.menu.findUnique({
        where: { id_menu: id },
        include: {
          parent: true,
          children: true,
        },
      });

      if (!item) {
        return res.status(404).json({
          ok: false,
          msg: "Menú no encontrado.",
        });
      }

      res.json({
        ok: true,
        data: item,
      });
    } catch (error) {
      console.error("Error Menu getById:", error);

      res.status(500).json({
        ok: false,
        msg: "Error interno del sistema.",
      });
    }
  }

  static async create(req, res) {
    try {
      const { nombre, es_submenu, url, id_menu_parent, estado, show } =
        req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({
          ok: false,
          msg: "El nombre es obligatorio.",
        });
      }

      const parentId = menuController.normalizarParentId(id_menu_parent);

      if (Number.isNaN(parentId)) {
        return res.status(400).json({
          ok: false,
          msg: "El menú padre debe ser un número válido.",
        });
      }

      if (es_submenu === true && parentId === null) {
        return res.status(400).json({
          ok: false,
          msg: "Un submenú debe tener un menú padre.",
        });
      }

      if (parentId !== null) {
        const parent = await prisma.menu.findUnique({
          where: { id_menu: parentId },
        });

        if (!parent) {
          return res.status(404).json({
            ok: false,
            msg: "El menú padre seleccionado no existe.",
          });
        }

        if (parent.es_submenu) {
          return res.status(400).json({
            ok: false,
            msg: "No se puede asignar un submenú como menú padre.",
          });
        }
      }

      const nuevo = await prisma.menu.create({
        data: {
          nombre: nombre.trim(),
          es_submenu: Boolean(es_submenu),
          url: url && url.trim() ? url.trim() : null,
          id_menu_parent: parentId,
          estado: estado ?? true,
          show: show ?? true,
        },
      });

      res.status(201).json({
        ok: true,
        msg: "Menú creado.",
        data: nuevo,
      });
    } catch (error) {
      console.error("Error Menu create:", error);

      res.status(500).json({
        ok: false,
        msg: "Error al crear menú.",
      });
    }
  }

  static async update(req, res) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido.",
        });
      }

      const old = await prisma.menu.findUnique({
        where: { id_menu: id },
      });

      if (!old) {
        return res.status(404).json({
          ok: false,
          msg: "Menú no encontrado.",
        });
      }

      const { nombre, es_submenu, url, id_menu_parent, estado, show } =
        req.body;

      const parentId = menuController.normalizarParentId(id_menu_parent);

      if (Number.isNaN(parentId)) {
        return res.status(400).json({
          ok: false,
          msg: "El menú padre debe ser un número válido.",
        });
      }

      const finalEsSubmenu =
        es_submenu === undefined ? old.es_submenu : Boolean(es_submenu);

      if (finalEsSubmenu === true && parentId === null) {
        return res.status(400).json({
          ok: false,
          msg: "Un submenú debe tener un menú padre.",
        });
      }

      if (parentId === id) {
        return res.status(400).json({
          ok: false,
          msg: "Un menú no puede ser padre de sí mismo.",
        });
      }

      if (parentId !== null) {
        const parent = await prisma.menu.findUnique({
          where: { id_menu: parentId },
        });

        if (!parent) {
          return res.status(404).json({
            ok: false,
            msg: "El menú padre seleccionado no existe.",
          });
        }

        if (parent.es_submenu) {
          return res.status(400).json({
            ok: false,
            msg: "No se puede asignar un submenú como menú padre.",
          });
        }
      }

      const upd = await prisma.menu.update({
        where: { id_menu: id },
        data: {
          nombre: nombre?.trim() || old.nombre,
          es_submenu: finalEsSubmenu,
          url: url === "" ? null : url?.trim() ?? old.url,
          id_menu_parent: parentId,
          estado: estado ?? old.estado,
          show: show ?? old.show,
        },
      });

      res.json({
        ok: true,
        msg: "Menú actualizado.",
        data: upd,
      });
    } catch (error) {
      console.error("Error Menu update:", error);

      res.status(500).json({
        ok: false,
        msg: "Error al actualizar menú.",
      });
    }
  }

  static async delete(req, res) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          ok: false,
          msg: "ID inválido.",
        });
      }

      const existe = await prisma.menu.findUnique({
        where: { id_menu: id },
        include: { children: true },
      });

      if (!existe) {
        return res.status(404).json({
          ok: false,
          msg: "Menú no encontrado.",
        });
      }

      if (existe.children.length > 0) {
        return res.status(400).json({
          ok: false,
          msg: "No se puede eliminar un menú que tiene submenús.",
        });
      }

      await prisma.menu.delete({
        where: { id_menu: id },
      });

      res.json({
        ok: true,
        msg: "Menú eliminado correctamente.",
      });
    } catch (error) {
      console.error("Error Menu delete:", error);

      res.status(500).json({
        ok: false,
        msg: "Error al eliminar menú.",
      });
    }
  }

  static async getTree(_req, res) {
    try {
      const data = await prisma.menu.findMany({
        where: {
          estado: true,
          show: true,
        },
        include: {
          children: {
            where: {
              estado: true,
              show: true,
            },
            orderBy: {
              id_menu: "asc",
            },
          },
        },
        orderBy: {
          id_menu: "asc",
        },
      });

      const tree = data
        .filter((m) => !m.id_menu_parent)
        .map((parent) => ({
          ...parent,
          children: data.filter(
            (m) => m.id_menu_parent === parent.id_menu
          ),
        }));

      res.json({
        ok: true,
        data: tree,
      });
    } catch (error) {
      console.error("Error Menu getTree:", error);

      res.status(500).json({
        ok: false,
        msg: "Error al construir árbol.",
      });
    }
  }

  static async getMenuByUser(req, res) {
    try {
      const usuario_id = Number(req.params.usuario_id);

      if (Number.isNaN(usuario_id)) {
        return res.status(400).json({
          ok: false,
          msg: "ID de usuario inválido.",
        });
      }

      const permisos = await prisma.permisos.findMany({
        where: {
          usuario_id,
          fecha_eliminacion: null,
        },
        include: {
          menu: true,
        },
      });

      const menus = permisos
        .map((p) => p.menu)
        .filter((m) => m && m.estado === true && m.show === true);

      const tree = menus
        .filter((m) => !m.id_menu_parent)
        .map((parent) => ({
          ...parent,
          children: menus.filter(
            (m) => m.id_menu_parent === parent.id_menu
          ),
        }));

      res.json({
        ok: true,
        data: tree,
      });
    } catch (error) {
      console.error("Error Menu getMenuByUser:", error);

      res.status(500).json({
        ok: false,
        msg: "Error al obtener menú del usuario.",
      });
    }
  }
}