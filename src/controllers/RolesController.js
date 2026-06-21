//Listo
import prisma from "../database.js";

export default class RolesController {
  static async getAll(_req, res) {
    try {
      const roles = await prisma.roles.findMany({
        where: { fecha_eliminacion: null },
        orderBy: { rol_id: "asc" }
      });
      res.json({ ok: true, data: roles });
    } catch (e) {
      console.log(e);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }

  static async getById(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) return res.status(400).json({ ok: false, msg: "El id de rol debe ser un número" });

    try {
      const rol = await prisma.roles.findFirst({
        where: { AND: [{ rol_id: idNum }, { fecha_eliminacion: null }] }
      });
      if (!rol) return res.status(404).json({ ok: false, msg: `No se encontró el rol con id: ${idNum}` });
      res.json({ ok: true, data: rol });
    } catch (e) {
      console.log(e);
      res.status(500).json({ ok: false, msg: "Server Error, something went wrong" });
    }
  }

  static async create(req, res) {
    const { cargo, descripcion } = req.body;
    if (!cargo || cargo.trim() === "") {
      return res.status(400).json({ ok: false, msg: "El campo 'cargo' es obligatorio" });
    }

    try {
      const dup = await prisma.roles.findFirst({
        where: { AND: [{ cargo: cargo.trim() }, { fecha_eliminacion: null }] }
      });
      if (dup) return res.status(409).json({ ok: false, msg: "Ya existe un rol activo con ese cargo" });

      const rol = await prisma.roles.create({
        data: { cargo: cargo.trim(), descripcion: descripcion ?? null }
      });
      res.status(201).json({ ok: true, msg: "Rol creado correctamente", data: rol });
    } catch (e) {
      console.log(e);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }

  static async update(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) return res.status(400).json({ ok: false, msg: "El id de rol debe ser un número" });

    const old = await prisma.roles.findUnique({ where: { rol_id: idNum } });
    if (!old || old.fecha_eliminacion !== null) {
      return res.status(404).json({ ok: false, msg: "No se encontró el rol que se desea modificar" });
    }

    const { cargo, descripcion } = req.body;

    try {
      if (cargo && cargo.trim() !== "") {
        const dup = await prisma.roles.findFirst({
          where: { AND: [{ cargo: cargo.trim() }, { fecha_eliminacion: null }, { rol_id: { not: idNum } }] }
        });
        if (dup) return res.status(409).json({ ok: false, msg: "Ya existe otro rol activo con ese cargo" });
      }

      const rol = await prisma.roles.update({
        where: { rol_id: idNum },
        data: {
          cargo: cargo?.trim() ?? old.cargo,
          descripcion: descripcion ?? old.descripcion,
          fecha_actualizacion: new Date()
        }
      });

      res.json({ ok: true, msg: "Rol actualizado correctamente", data: rol });
    } catch (e) {
      console.log(e);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }

  static async delete(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) return res.status(400).json({ ok: false, msg: "El id de rol debe ser un número" });

    const existe = await prisma.roles.findFirst({
      where: { AND: [{ rol_id: idNum }, { fecha_eliminacion: null }] }
    });
    if (!existe) return res.status(404).json({ ok: false, msg: "No se encontró el rol que se desea eliminar" });

    try {
      const { rol_id } = await prisma.roles.update({
        where: { rol_id: idNum },
        data: { fecha_eliminacion: new Date() }
      });
      res.json({ ok: true, msg: "Se eliminó el rol correctamente", id: rol_id });
    } catch (e) {
      console.log(e);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }
}
