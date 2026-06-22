import transporter from "../config/email.js";

export default class Mailer {
  static async sendMail({ to, subject, html, text }) {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("[MAIL ERROR]: Faltan SMTP_USER o SMTP_PASS en .env");
        return false;
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: text || "",
        html,
      });

      return true;
    } catch (error) {
      console.error("[MAIL ERROR]:", error);
      return false;
    }
  }

  static async sendVerifyEmailMail(token, to) {
    const link = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/api/users/verify_email?token=${token}`;

    return await this.sendMail({
      to,
      subject: "Verifica tu correo",
      text: "Por favor confirma tu correo.",
      html: `
        <h1>Bienvenido a ACONSA</h1>
        <p>Confirma tu correo dando clic en el siguiente enlace:</p>
        <a href="${link}">Confirmar correo</a>
      `,
    });
  }
}