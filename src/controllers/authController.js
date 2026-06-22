import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import Mailer from "../utils/Mailer.js";
import { signToken } from "../config/jwt.js";
import { registrarAlerta } from "../utils/registrarAlerta.js";

const SALT = 10;

/*
  Códigos temporales en memoria.
  No se guardan en SQL.
  Si reinicias el backend, los códigos se borran.
*/
const resetCodes = new Map();

const generarCodigo = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendError = (res, status, msg) =>
  res.status(status).json({ ok: false, msg });

const sanitizeUser = (u) => ({
  usuario_id: u.usuario_id,
  usuario: u.usuario,
  empleado_id: u.empleado_id,
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 1000 * 60 * 60 * 8,
};

export const login = async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return sendError(res, 400, "Usuario y contraseña son requeridos");
  }

  try {
    const query = `
      SELECT usuario_id, usuario, contrasena, empleado_id 
      FROM usuarios 
      WHERE usuario = $1 
        AND fecha_eliminacion IS NULL
    `;

    const result = await pool.query(query, [usuario.trim()]);

    if (result.rowCount === 0) {
      await registrarAlerta({
        tipo: "Login fallido",
        titulo: "Intento de inicio de sesión",
        mensaje: `Se intentó iniciar sesión con el usuario "${usuario}", pero no existe o está eliminado.`,
        modulo: "Autenticación",
        prioridad: "Alta",
      });

      return sendError(res, 401, "Credenciales incorrectas");
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);

    if (!isMatch) {
      await registrarAlerta({
        usuario_id: user.usuario_id,
        tipo: "Login fallido",
        titulo: "Contraseña incorrecta",
        mensaje: `El usuario "${user.usuario}" intentó iniciar sesión con una contraseña incorrecta.`,
        modulo: "Autenticación",
        referencia_id: user.usuario_id,
        prioridad: "Alta",
      });

      return sendError(res, 401, "Credenciales incorrectas");
    }

    const token = signToken({
      usuario_id: user.usuario_id,
      empleado_id: user.empleado_id,
      usuario: user.usuario,
    });

    res.cookie("token", token, cookieOptions);

    await registrarAlerta({
      usuario_id: user.usuario_id,
      tipo: "Inicio de sesión",
      titulo: "Inicio de sesión exitoso",
      mensaje: `El usuario "${user.usuario}" inició sesión correctamente.`,
      modulo: "Autenticación",
      referencia_id: user.usuario_id,
      prioridad: "Baja",
    });

    const userSafe = sanitizeUser(user);

    return res.json({
      ok: true,
      msg: "Login exitoso",
      token,
      user: userSafe,
      usuario: userSafe,
    });
  } catch (error) {
    console.error("[LOGIN ERROR]:", error);
    return sendError(res, 500, "Error interno");
  }
};

export const register = async (req, res) => {
  const { cedula, usuario, contrasena } = req.body;

  if (!cedula || !usuario || !contrasena) {
    return sendError(
      res,
      400,
      "cedula, usuario y contrasena son requeridos"
    );
  }

  try {
    const empCheck = await pool.query(
      `
      SELECT empleado_id, nombres, apellidos, cedula
      FROM empleados
      WHERE cedula = $1
        AND fecha_eliminacion IS NULL
      `,
      [cedula.trim()]
    );

    if (empCheck.rowCount === 0) {
      return sendError(res, 404, "No existe un empleado con esa cédula");
    }

    const empleado = empCheck.rows[0];

    const userByEmp = await pool.query(
      `
      SELECT 1
      FROM usuarios
      WHERE empleado_id = $1
        AND fecha_eliminacion IS NULL
      `,
      [empleado.empleado_id]
    );

    if (userByEmp.rowCount > 0) {
      return sendError(res, 400, "Ese empleado ya tiene usuario");
    }

    const userByName = await pool.query(
      `
      SELECT 1
      FROM usuarios
      WHERE LOWER(usuario) = LOWER($1)
        AND fecha_eliminacion IS NULL
      `,
      [usuario.trim()]
    );

    if (userByName.rowCount > 0) {
      return sendError(res, 400, "Ese nombre de usuario ya existe");
    }

    const hash = await bcrypt.hash(contrasena, SALT);

    const insert = await pool.query(
      `
      INSERT INTO usuarios (empleado_id, usuario, contrasena)
      VALUES ($1, $2, $3)
      RETURNING usuario_id, usuario, empleado_id, fecha_creacion
      `,
      [empleado.empleado_id, usuario.trim(), hash]
    );

    const nuevoUsuario = insert.rows[0];

    await registrarAlerta({
      usuario_id: nuevoUsuario.usuario_id,
      tipo: "Registro creado",
      titulo: "Nuevo usuario registrado",
      mensaje: `Se creó el usuario "${nuevoUsuario.usuario}" para el empleado ${empleado.nombres} ${empleado.apellidos}.`,
      modulo: "Usuarios",
      referencia_id: nuevoUsuario.usuario_id,
      prioridad: "Media",
    });

    return res.json({
      ok: true,
      msg: "Usuario creado correctamente",
      usuario: {
        ...nuevoUsuario,
        cedula: empleado.cedula,
        empleado: `${empleado.nombres} ${empleado.apellidos}`,
      },
    });
  } catch (error) {
    console.error("[REGISTER ERROR]:", error);
    return sendError(res, 500, "Error interno");
  }
};

export const autoRegister = async (req, res) => {
  const { cedula } = req.body;

  if (!cedula) {
    return sendError(res, 400, "cedula requerida");
  }

  try {
    const emp = await pool.query(
      `
      SELECT empleado_id, nombres, apellidos, correo, cedula
      FROM empleados
      WHERE cedula = $1
        AND fecha_eliminacion IS NULL
      `,
      [cedula.trim()]
    );

    if (emp.rowCount === 0) {
      return sendError(res, 404, "Empleado no encontrado");
    }

    const empleado = emp.rows[0];

    const exists = await pool.query(
      `
      SELECT 1
      FROM usuarios
      WHERE empleado_id = $1
        AND fecha_eliminacion IS NULL
      `,
      [empleado.empleado_id]
    );

    if (exists.rowCount > 0) {
      return sendError(res, 400, "El empleado ya tiene una cuenta");
    }

    const suggestedUser = empleado.correo
      ? empleado.correo.split("@")[0]
      : `${empleado.nombres.split(" ")[0].toLowerCase()}.${empleado.apellidos
          .split(" ")[0]
          .toLowerCase()}`;

    const randomPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(randomPassword, SALT);

    const nuevo = await pool.query(
      `
      INSERT INTO usuarios (empleado_id, usuario, contrasena)
      VALUES ($1, $2, $3)
      RETURNING usuario_id, usuario, empleado_id
      `,
      [empleado.empleado_id, suggestedUser, hash]
    );

    const nuevoUsuario = nuevo.rows[0];

    await registrarAlerta({
      usuario_id: nuevoUsuario.usuario_id,
      tipo: "Registro creado",
      titulo: "Cuenta creada automáticamente",
      mensaje: `Se creó automáticamente la cuenta "${nuevoUsuario.usuario}" para ${empleado.nombres} ${empleado.apellidos}.`,
      modulo: "Usuarios",
      referencia_id: nuevoUsuario.usuario_id,
      prioridad: "Media",
    });

    return res.json({
      ok: true,
      msg: "Cuenta creada automáticamente",
      usuario: {
        ...nuevoUsuario,
        cedula: empleado.cedula,
        empleado: `${empleado.nombres} ${empleado.apellidos}`,
      },
      password_generada: randomPassword,
    });
  } catch (error) {
    console.error("[AUTO_REGISTER ERROR]:", error);
    return sendError(res, 500, "Error interno");
  }
};

export const forgotPassword = async (req, res) => {
  const { usuario } = req.body;

  if (!usuario) {
    return sendError(res, 400, "usuario requerido");
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        u.usuario_id,
        u.usuario,
        e.correo,
        e.nombres,
        e.apellidos
      FROM usuarios u
      INNER JOIN empleados e ON e.empleado_id = u.empleado_id
      WHERE 
        u.fecha_eliminacion IS NULL
        AND e.fecha_eliminacion IS NULL
        AND (
          LOWER(u.usuario) = LOWER($1)
          OR LOWER(e.correo) = LOWER($1)
        )
      LIMIT 1
      `,
      [usuario.trim()]
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Usuario o correo no encontrado");
    }

    const user = result.rows[0];

    if (!user.correo) {
      return sendError(
        res,
        400,
        "El empleado vinculado a este usuario no tiene correo registrado"
      );
    }

    const codigo = generarCodigo();

    resetCodes.set(String(user.usuario_id), {
      codigo,
      usuario_id: user.usuario_id,
      usuario: user.usuario,
      expira: Date.now() + 10 * 60 * 1000,
    });

    const enviado = await Mailer.sendMail({
      to: user.correo,
      subject: "Código de recuperación - ACONSA",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Recuperación de contraseña</h2>

          <p>Hola ${user.nombres || ""} ${user.apellidos || ""},</p>

          <p>
            Se solicitó recuperar la contraseña del usuario 
            <strong>${user.usuario}</strong>.
          </p>

          <p>Tu código de verificación es:</p>

          <div style="
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 4px;
            background: #f1f5f9;
            padding: 14px 20px;
            border-radius: 10px;
            width: fit-content;
          ">
            ${codigo}
          </div>

          <p>Este código vence en 10 minutos.</p>
          <p>Si no solicitaste este cambio, ignora este mensaje.</p>
        </div>
      `,
      text: `Tu código de recuperación es: ${codigo}`,
    });

    if (!enviado) {
      resetCodes.delete(String(user.usuario_id));

      return sendError(
        res,
        500,
        "No se pudo enviar el correo de recuperación. Revise la configuración SMTP."
      );
    }

    try {
      await registrarAlerta({
        usuario_id: user.usuario_id,
        tipo: "Recuperación de contraseña",
        titulo: "Código de recuperación enviado",
        mensaje: `Se envió un código de recuperación al correo del usuario "${user.usuario}".`,
        modulo: "Autenticación",
        referencia_id: user.usuario_id,
        prioridad: "Media",
      });
    } catch (alertError) {
      console.error("[ALERTA FORGOT PASSWORD ERROR]:", alertError);
    }

    return res.json({
      ok: true,
      msg: "Código enviado al correo registrado",
    });
  } catch (error) {
    console.error("[FORGOT ERROR]:", error);

    return sendError(
      res,
      500,
      error.message || "Error interno al enviar el código"
    );
  }
};

export const resetPassword = async (req, res) => {
  const { usuario, codigo, contrasena } = req.body;

  if (!usuario || !codigo || !contrasena) {
    return sendError(res, 400, "usuario, codigo y contrasena son requeridos");
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        u.usuario_id,
        u.usuario
      FROM usuarios u
      INNER JOIN empleados e ON e.empleado_id = u.empleado_id
      WHERE 
        u.fecha_eliminacion IS NULL
        AND e.fecha_eliminacion IS NULL
        AND (
          LOWER(u.usuario) = LOWER($1)
          OR LOWER(e.correo) = LOWER($1)
        )
      LIMIT 1
      `,
      [usuario.trim()]
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Usuario o correo no encontrado");
    }

    const user = result.rows[0];
    const savedCode = resetCodes.get(String(user.usuario_id));

    if (!savedCode) {
      return sendError(res, 400, "No hay código activo para este usuario");
    }

    if (Date.now() > savedCode.expira) {
      resetCodes.delete(String(user.usuario_id));
      return sendError(res, 400, "El código ha expirado");
    }

    if (savedCode.codigo !== codigo.trim()) {
      return sendError(res, 400, "Código inválido");
    }

    const hash = await bcrypt.hash(contrasena, SALT);

    await pool.query(
      `
      UPDATE usuarios
      SET 
        contrasena = $1,
        fecha_actualizacion = NOW()
      WHERE usuario_id = $2
        AND fecha_eliminacion IS NULL
      `,
      [hash, user.usuario_id]
    );

    resetCodes.delete(String(user.usuario_id));

    await registrarAlerta({
      usuario_id: user.usuario_id,
      tipo: "Contraseña actualizada",
      titulo: "Contraseña restablecida",
      mensaje: `El usuario "${user.usuario}" restableció su contraseña con código de verificación.`,
      modulo: "Autenticación",
      referencia_id: user.usuario_id,
      prioridad: "Media",
    });

    return res.json({
      ok: true,
      msg: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]:", error);
    return sendError(res, 500, "Error interno");
  }
};

export const me = async (req, res) => {
  try {
    const usuarioId = req.user.usuario_id;

    const query = `
      SELECT 
        u.usuario_id,
        u.usuario,
        u.empleado_id,
        e.nombres,
        e.apellidos,
        e.rol_id,
        r.cargo
      FROM usuarios u
      INNER JOIN empleados e ON e.empleado_id = u.empleado_id
      INNER JOIN roles r ON r.rol_id = e.rol_id
      WHERE u.usuario_id = $1
        AND u.fecha_eliminacion IS NULL
    `;

    const result = await pool.query(query, [usuarioId]);

    if (result.rowCount === 0) {
      return sendError(res, 404, "Usuario no encontrado");
    }

    return res.json({
      ok: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("[ME ERROR]:", error);
    return res.status(500).json({ ok: false, msg: "Error interno" });
  }
};

export const logout = async (req, res) => {
  const usuarioId = req.user?.usuario_id ?? null;
  const usuario = req.user?.usuario ?? "Usuario";

  if (usuarioId) {
    await registrarAlerta({
      usuario_id: usuarioId,
      tipo: "Cierre de sesión",
      titulo: "Sesión cerrada",
      mensaje: `El usuario "${usuario}" cerró sesión.`,
      modulo: "Autenticación",
      referencia_id: usuarioId,
      prioridad: "Baja",
    });
  }

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.json({
    ok: true,
    msg: "Sesión cerrada",
  });
};

export const getAllUsuarios = async (_req, res) => {
  try {
    const query = `
      SELECT 
        u.usuario_id, 
        u.usuario, 
        u.empleado_id, 
        e.nombres, 
        e.apellidos, 
        e.rol_id,
        r.cargo
      FROM usuarios u
      INNER JOIN empleados e ON e.empleado_id = u.empleado_id
      INNER JOIN roles r ON r.rol_id = e.rol_id
      WHERE u.fecha_eliminacion IS NULL
      ORDER BY u.usuario_id DESC
    `;

    const result = await pool.query(query);

    return res.json({
      ok: true,
      usuarios: result.rows,
    });
  } catch (error) {
    console.error("[GET ALL ERROR]:", error);
    return sendError(res, 500, "Error interno");
  }
};

export const getUsuarioById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        u.usuario_id, 
        u.usuario, 
        u.empleado_id, 
        e.nombres, 
        e.apellidos, 
        e.rol_id,
        r.cargo
      FROM usuarios u
      INNER JOIN empleados e ON e.empleado_id = u.empleado_id
      INNER JOIN roles r ON r.rol_id = e.rol_id
      WHERE u.usuario_id = $1 
        AND u.fecha_eliminacion IS NULL
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return sendError(res, 404, "Usuario no encontrado");
    }

    return res.json({
      ok: true,
      usuario: result.rows[0],
    });
  } catch (error) {
    console.error("[GET BY ID ERROR]:", error);
    return sendError(res, 500, "Error interno");
  }
};

export const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { empleado_id, usuario, contrasena, rol_id } = req.body;

  try {
    const exists = await pool.query(
      `
      SELECT usuario_id, usuario, empleado_id
      FROM usuarios 
      WHERE usuario_id = $1
        AND fecha_eliminacion IS NULL
      `,
      [id]
    );

    if (exists.rowCount === 0) {
      return sendError(res, 404, "Usuario no encontrado");
    }

    const usuarioAnterior = exists.rows[0];

    if (empleado_id) {
      const emp = await pool.query(
        `
        SELECT empleado_id
        FROM empleados
        WHERE empleado_id = $1
          AND fecha_eliminacion IS NULL
        `,
        [empleado_id]
      );

      if (emp.rowCount === 0) {
        return sendError(res, 400, "El empleado no existe");
      }

      const empleadoOcupado = await pool.query(
        `
        SELECT usuario_id
        FROM usuarios
        WHERE empleado_id = $1
          AND usuario_id != $2
          AND fecha_eliminacion IS NULL
        `,
        [empleado_id, id]
      );

      if (empleadoOcupado.rowCount > 0) {
        return sendError(res, 400, "Ese empleado ya tiene otro usuario");
      }
    }

    if (usuario && usuario.trim() !== "") {
      const userExists = await pool.query(
        `
        SELECT usuario_id
        FROM usuarios 
        WHERE LOWER(usuario) = LOWER($1)
          AND usuario_id != $2 
          AND fecha_eliminacion IS NULL
        `,
        [usuario.trim(), id]
      );

      if (userExists.rowCount > 0) {
        return sendError(res, 400, "Ese nombre de usuario ya está en uso");
      }
    }

    let hash = null;

    if (contrasena && contrasena.trim() !== "") {
      hash = await bcrypt.hash(contrasena, SALT);
    }

    await pool.query(
      `
      UPDATE usuarios
      SET 
        empleado_id = COALESCE($1, empleado_id),
        usuario = COALESCE($2, usuario),
        contrasena = COALESCE($3, contrasena),
        fecha_actualizacion = NOW()
      WHERE usuario_id = $4
      `,
      [
        empleado_id ? Number(empleado_id) : null,
        usuario && usuario.trim() !== "" ? usuario.trim() : null,
        hash,
        id,
      ]
    );

    if (rol_id && empleado_id) {
      await pool.query(
        `
        UPDATE empleados
        SET 
          rol_id = $1,
          fecha_actualizacion = NOW()
        WHERE empleado_id = $2
        `,
        [Number(rol_id), Number(empleado_id)]
      );
    }

    const actualizado = await pool.query(
      `
      SELECT 
        u.usuario_id, 
        u.usuario, 
        u.empleado_id, 
        e.nombres, 
        e.apellidos, 
        e.rol_id,
        r.cargo
      FROM usuarios u
      INNER JOIN empleados e ON e.empleado_id = u.empleado_id
      INNER JOIN roles r ON r.rol_id = e.rol_id
      WHERE u.usuario_id = $1
        AND u.fecha_eliminacion IS NULL
      `,
      [id]
    );

    await registrarAlerta({
      usuario_id: Number(id),
      tipo: "Registro actualizado",
      titulo: "Usuario actualizado",
      mensaje: `Se actualizó el usuario "${usuarioAnterior.usuario}".`,
      modulo: "Usuarios",
      referencia_id: Number(id),
      prioridad: "Media",
    });

    return res.json({
      ok: true,
      msg: "Usuario actualizado correctamente",
      usuario: actualizado.rows[0],
    });
  } catch (error) {
    console.error("[UPDATE USER ERROR]:", error);
    return sendError(res, 500, "Error interno");
  }
};

export const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const old = await pool.query(
      `
      SELECT usuario_id, usuario
      FROM usuarios 
      WHERE usuario_id = $1
        AND fecha_eliminacion IS NULL
      `,
      [id]
    );

    if (old.rowCount === 0) {
      return sendError(res, 404, "Usuario no encontrado");
    }

    const usuarioEliminado = old.rows[0];

    await pool.query(
      `
      UPDATE usuarios 
      SET fecha_eliminacion = NOW()
      WHERE usuario_id = $1
      `,
      [id]
    );

    await registrarAlerta({
      usuario_id: Number(id),
      tipo: "Registro eliminado",
      titulo: "Usuario eliminado",
      mensaje: `Se eliminó el usuario "${usuarioEliminado.usuario}".`,
      modulo: "Usuarios",
      referencia_id: Number(id),
      prioridad: "Alta",
    });

    return res.json({
      ok: true,
      msg: "Usuario eliminado",
    });
  } catch (error) {
    console.error("[DELETE USER ERROR]:", error);
    return sendError(res, 500, "Error interno");
  }
};