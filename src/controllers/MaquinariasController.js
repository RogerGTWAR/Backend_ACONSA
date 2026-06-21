//Falta-En Revision
import prisma from "../database.js";

export default class MaquinariasController {
  static async getAll(_req, res) {
    try {
      const maqs = await prisma.maquinarias.findMany({
        where: { fecha_eliminacion: null },
        include: {
          proveedores: { select: { proveedor_id: true, nombre_proveedor: true } } 
        },
        orderBy: { maquinaria_id: "asc" }
      });

      const data = maqs.map(m => ({
        ...m,
        proveedor: m.proveedores?.nombre_proveedor ?? null
      }));

      res.json({ ok: true, data });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error, something went wrong" });
    }
  }

  static async getById(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) {
      return res.status(400).json({ ok: false, msg: "El id de la maquinaria debe ser un número" });
    }

    try {
      const maq = await prisma.maquinarias.findFirst({
        where: { AND: [{ maquinaria_id: idNum }, { fecha_eliminacion: null }] },
        include: {
          proveedores: { select: { proveedor_id: true, nombre_proveedor: true } }
        }
      });

      if (!maq) {
        return res.status(404).json({ ok: false, msg: `No se encontró la maquinaria con id: ${idNum}` });
      }

      res.json({
        ok: true,
        data: { ...maq, proveedor: maq.proveedores?.nombre_proveedor ?? null }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server Error, something went wrong" });
    }
  }

  static async create(req, res) {
    const {
      proveedor_id,          
      nombre_maquinaria,
      marca,
      modelo,
      precio_por_hora,
      descripcion
    } = req.body;

    if (!nombre_maquinaria || precio_por_hora === undefined) {
      return res.status(400).json({ ok: false, msg: "Faltan campos obligatorios: nombre_maquinaria y precio_por_hora" });
    }

    const precio = Number(precio_por_hora);
    if (isNaN(precio) || precio < 0) {
      return res.status(400).json({ ok: false, msg: "precio_por_hora debe ser un número >= 0" });
    }

    let proveedorId = null;
    if (req.body.hasOwnProperty("proveedor_id")) {
      if (proveedor_id === null) {
        proveedorId = null;
      } else {
        const parsed = parseInt(proveedor_id);
        if (isNaN(parsed)) {
          return res.status(400).json({ ok: false, msg: "El id del proveedor debe ser un número" });
        }
        const provOk = await prisma.proveedores.findFirst({
          where: { AND: [{ proveedor_id: parsed }, { fecha_eliminacion: null }] }
        });
        if (!provOk) {
          return res.status(400).json({ ok: false, msg: "El proveedor no existe o fue dado de baja" });
        }
        proveedorId = parsed;
      }
    }

    try {
      const dup = await prisma.maquinarias.findFirst({
        where: {
          AND: [
            { nombre_maquinaria: nombre_maquinaria.trim() },
            { marca: (marca?.trim() ?? null) },
            { modelo: (modelo?.trim() ?? null) },
            { fecha_eliminacion: null }
          ]
        }
      });
      if (dup) {
        return res.status(400).json({ ok: false, msg: "Ya existe una maquinaria activa con el mismo nombre, marca y modelo" });
      }

      const nueva = await prisma.maquinarias.create({
        data: {
          proveedor_id: proveedorId, 
          nombre_maquinaria: nombre_maquinaria.trim(),
          marca: marca?.trim() ?? null,
          modelo: modelo?.trim() ?? null,
          precio_por_hora: precio,
          descripcion: descripcion?.trim() ?? null
        },
        include: {
          proveedores: { select: { proveedor_id: true, nombre_proveedor: true } }
        }
      });

      res.status(201).json({
        ok: true,
        msg: "Maquinaria creada correctamente",
        data: { ...nueva, proveedor: nueva.proveedores?.nombre_proveedor ?? null }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }

  static async update(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) {
      return res.status(400).json({ ok: false, msg: "El id de la maquinaria debe ser un número" });
    }

    try {
      const old = await prisma.maquinarias.findUnique({ where: { maquinaria_id: idNum } });
      if (!old || old.fecha_eliminacion !== null) {
        return res.status(404).json({ ok: false, msg: "No se encontró la maquinaria que se desea modificar" });
      }

      const {
        proveedor_id,
        nombre_maquinaria,
        marca,
        modelo,
        precio_por_hora,
        descripcion
      } = req.body;

      let proveedorId = old.proveedor_id;
      if (req.body.hasOwnProperty("proveedor_id")) {
        if (proveedor_id === null) {
          proveedorId = null;
        } else {
          const parsed = parseInt(proveedor_id);
          if (isNaN(parsed)) {
            return res.status(400).json({ ok: false, msg: "El id del proveedor debe ser un número" });
          }
          const provOk = await prisma.proveedores.findFirst({
            where: { AND: [{ proveedor_id: parsed }, { fecha_eliminacion: null }] }
          });
          if (!provOk) {
            return res.status(400).json({ ok: false, msg: "El proveedor no existe o fue dado de baja" });
          }
          proveedorId = parsed;
        }
      }

      let precio = old.precio_por_hora;
      if (precio_por_hora !== undefined) {
        const parsed = Number(precio_por_hora);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ ok: false, msg: "precio_por_hora debe ser un número >= 0" });
        }
        precio = parsed;
      }

      const nuevoNombre = nombre_maquinaria !== undefined ? nombre_maquinaria.trim() : old.nombre_maquinaria;
      const nuevaMarca = marca !== undefined ? (marca?.trim() ?? null) : old.marca;
      const nuevoModelo = modelo !== undefined ? (modelo?.trim() ?? null) : old.modelo;

      if (
        nuevoNombre !== old.nombre_maquinaria ||
        nuevaMarca !== old.marca ||
        nuevoModelo !== old.modelo
      ) {
        const dup = await prisma.maquinarias.findFirst({
          where: {
            AND: [
              { nombre_maquinaria: nuevoNombre },
              { marca: nuevaMarca },
              { modelo: nuevoModelo },
              { fecha_eliminacion: null },
              { maquinaria_id: { not: idNum } }
            ]
          }
        });
        if (dup) {
          return res.status(400).json({ ok: false, msg: "Ya existe otra maquinaria activa con el mismo nombre, marca y modelo" });
        }
      }

      const actualizada = await prisma.maquinarias.update({
        where: { maquinaria_id: idNum },
        data: {
          proveedor_id: proveedorId,
          nombre_maquinaria: nuevoNombre,
          marca: nuevaMarca,
          modelo: nuevoModelo,
          precio_por_hora: precio,
          descripcion: descripcion !== undefined ? (descripcion?.trim() ?? null) : old.descripcion,
          fecha_actualizacion: new Date()
        },
        include: {
          proveedores: { select: { proveedor_id: true, nombre_proveedor: true } }
        }
      });

      res.json({
        ok: true,
        msg: "Maquinaria actualizada correctamente",
        data: { ...actualizada, proveedor: actualizada.proveedores?.nombre_proveedor ?? null }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }

  static async delete(req, res) {
    const idNum = parseInt(req.params.id);
    if (isNaN(idNum)) {
      return res.status(400).json({ ok: false, msg: "El id de la maquinaria debe ser un número" });
    }

    try {
      const existe = await prisma.maquinarias.findFirst({
        where: { AND: [{ maquinaria_id: idNum }, { fecha_eliminacion: null }] }
      });
      if (!existe) {
        return res.status(404).json({ ok: false, msg: "No se encontró la maquinaria que se desea eliminar" });
      }

      const { maquinaria_id } = await prisma.maquinarias.update({
        where: { maquinaria_id: idNum },
        data: { fecha_eliminacion: new Date() }
      });

      res.json({ ok: true, msg: "Se eliminó la maquinaria correctamente", id: maquinaria_id });
    } catch (error) {
      console.log(error);
      res.status(500).json({ ok: false, msg: "Server error something went wrong" });
    }
  }
}
