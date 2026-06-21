import prisma from "../database.js";

export async function registrarAlerta({
  usuario_id = null,
  tipo,
  titulo,
  mensaje,
  modulo = null,
  referencia_id = null,
  prioridad = "Media",
}) {
  try {
    await prisma.historial_alertas.create({
      data: {
        usuario_id: usuario_id ? Number(usuario_id) : null,
        tipo: String(tipo ?? "General").trim(),
        titulo: String(titulo ?? "Notificación").trim(),
        mensaje: String(mensaje ?? "").trim(),
        modulo: modulo ? String(modulo).trim() : null,
        referencia_id: referencia_id != null ? Number(referencia_id) : null,
        prioridad: String(prioridad ?? "Media").trim(),
      },
    });
  } catch (error) {
    console.error("Error al registrar alerta:", error);
  }
}