//Falta
import prisma from "../database.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

// pdfmake — FUNCIONA EN NODE SÓLO ASÍ
import PdfPrinter from "pdfmake";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class ReportesController {

  // =======================================================
  // 1. HISTORIAL
  // =======================================================
  static async getAll(_req, res) {
    try {
      const data = await prisma.reportes_generados.findMany({
        where: { fecha_eliminacion: null },
        include: { usuario: true },
        orderBy: { reporte_id: "desc" },
      });

      res.json({ ok: true, data });
    } catch (error) {
      console.error("❌ Error getAll:", error);
      res.status(500).json({ ok: false, msg: "Error al obtener historial." });
    }
  }

  // =======================================================
  // 2. REGISTRAR REPORTE
  // =======================================================
  static async create(req, res) {
    try {
      const { usuario_id, nombre_reporte, tipo_reporte, descripcion } = req.body;

      if (!usuario_id || !nombre_reporte || !tipo_reporte)
        return res.status(400).json({
          ok: false,
          msg: "usuario_id, nombre_reporte y tipo_reporte son obligatorios.",
        });

      if (!req.file)
        return res.status(400).json({ ok: false, msg: "Debe adjuntar un archivo." });

      const archivo_url = `/reportes/${req.file.filename}`;

      const nuevo = await prisma.reportes_generados.create({
        data: {
          usuario_id: Number(usuario_id),
          nombre_reporte: nombre_reporte.trim(),
          tipo_reporte,
          descripcion: descripcion?.trim() || null,
          archivo_url,
          ip_generacion: req.socket.remoteAddress,
        },
      });

      res.json({ ok: true, data: nuevo });
    } catch (error) {
      console.error("❌ Error create:", error);
      res.status(500).json({ ok: false, msg: "Error al registrar reporte." });
    }
  }

  // =======================================================
  // 3. OBTENER POR ID
  // =======================================================
  static async getById(req, res) {
    try {
      const id = Number(req.params.id);

      const r = await prisma.reportes_generados.findFirst({
        where: { reporte_id: id, fecha_eliminacion: null },
      });

      if (!r) return res.status(404).json({ ok: false, msg: "No encontrado." });

      res.json({ ok: true, data: r });
    } catch (error) {
      console.error("❌ Error getById:", error);
      res.status(500).json({ ok: false, msg: "Error interno." });
    }
  }

  // =======================================================
  // 4. DESCARGAR ARCHIVO
  // =======================================================
  static async download(req, res) {
    try {
      const id = Number(req.params.id);

      const reporte = await prisma.reportes_generados.findFirst({
        where: { reporte_id: id, fecha_eliminacion: null },
      });

      if (!reporte)
        return res.status(404).json({ ok: false, msg: "No encontrado." });

      const ruta = path.join(
        __dirname,
        "..",
        "public",
        "reportes",
        path.basename(reporte.archivo_url)
      );

      res.download(ruta);
    } catch (error) {
      console.error("❌ Error download:", error);
      res.status(500).json({ ok: false, msg: "Error al descargar archivo." });
    }
  }

  // =======================================================
  // 5. ELIMINAR
  // =======================================================
  static async delete(req, res) {
    try {
      const id = Number(req.params.id);

      const existe = await prisma.reportes_generados.findFirst({
        where: { reporte_id: id, fecha_eliminacion: null },
      });

      if (!existe)
        return res.status(404).json({ ok: false, msg: "No encontrado." });

      await prisma.reportes_generados.update({
        where: { reporte_id: id },
        data: { fecha_eliminacion: new Date() },
      });

      res.json({ ok: true, msg: "Eliminado correctamente." });
    } catch (error) {
      console.error("❌ Error delete:", error);
      res.status(500).json({ ok: false, msg: "Error al eliminar." });
    }
  }
static async generarAvaluos(req, res) {
  try {
    const { avaluo_id } = req.body;

    if (!avaluo_id)
      return res.status(400).json({ ok: false, msg: "avaluo_id requerido" });

    // --------------------------------------------------------
    // 1) CONSULTA
    // --------------------------------------------------------
    const avaluo = await prisma.avaluos.findFirst({
      where: { avaluo_id: Number(avaluo_id) },
      include: {
        proyectos: true,
        detalles_avaluos: {
          where: { fecha_eliminacion: null },
          include: { Servicios: true }
        }
      }
    });

    if (!avaluo)
      return res.status(404).json({ ok: false, msg: "Avalúo no encontrado." });

    // --------------------------------------------------------
    // 2) RUTAS Y LOGO
    // --------------------------------------------------------
    const dir = path.join(process.cwd(), "public", "reportes");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const logoPath = path.join(process.cwd(), "public", "logo.png");

    // --------------------------------------------------------
    // 3) EXCEL (DISEÑO COMPLETO)
    // --------------------------------------------------------
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Avalúo Detallado");

    sheet.pageSetup.orientation = "landscape";
    sheet.pageSetup.paperSize = 9;

    // colores
    const fillHeader = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E1F2" } };
    const fillSubtotal = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2CC" } };
    const fillTotal = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD966" } };

    const border = {
      top: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
      bottom: { style: "thin" }
    };

    sheet.columns = [
      { width: 10 },
      { width: 45 },
      { width: 12 },
      { width: 12 },
      { width: 18 },
      { width: 18 },
      { width: 18 }
    ];

    // logo
    if (fs.existsSync(logoPath)) {
      const img = workbook.addImage({
        filename: logoPath,
        extension: "png"
      });

      sheet.addImage(img, {
        tl: { col: 6.4, row: 0.2 },
        ext: { width: 130, height: 55 }
      });
    }

    // títulos
    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = "ASESORÍA & CONSTRUCCIÓN S.A.";
    sheet.getCell("A1").font = { bold: true, size: 16 };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.mergeCells("A2:G2");
    sheet.getCell("A2").value = "OFERTA ECONÓMICA DETALLADA";
    sheet.getCell("A2").font = { bold: true, size: 13 };
    sheet.getCell("A2").alignment = { horizontal: "center" };

    sheet.getCell("A4").value = `Proyecto: ${avaluo.proyectos.nombre_proyecto}`;
    sheet.getCell("A5").value = `Ubicación: ${avaluo.proyectos.ubicacion}`;
    sheet.getCell("A6").value = `Fecha: ${new Date(avaluo.fecha_inicio).toLocaleDateString()}`;

    // encabezado
    let row = 8;
    const headers = [
      "ITEM", "ALCANCE DEL SERVICIO", "U/M", "CANT.",
      "C. DIRECTO", "C. INDIRECTO", "C. VENTA"
    ];

    sheet.getRow(row).values = headers;
    sheet.getRow(row).eachCell(c => {
      c.font = { bold: true };
      c.fill = fillHeader;
      c.border = border;
      c.alignment = { horizontal: "center" };
    });

    row++;

    let num = 1;
    let subtotalDirecto = 0;
    let subtotalIndirecto = 0;

    // detalles
    for (const d of avaluo.detalles_avaluos) {
      const cd = Number(d.Servicios.total_costo_directo);
      const ci = Number(d.Servicios.total_costo_indirecto);
      const totalLinea = cd + ci;

      subtotalDirecto += cd;
      subtotalIndirecto += ci;

      sheet.getRow(row).values = [
        num++,
        d.actividad,
        d.unidad_de_medida,
        d.cantidad,
        cd.toFixed(2),
        ci.toFixed(2),
        totalLinea.toFixed(2)
      ];

      sheet.getRow(row).eachCell((cell, col) => {
        cell.border = border;
        cell.alignment = { horizontal: col === 2 ? "left" : "center" };
      });

      row++;
    }

    // totales
    const subtotalVenta = subtotalDirecto + subtotalIndirecto;
    const iva = subtotalVenta * 0.15;
    const total = subtotalVenta + iva;

    // subtotal
    sheet.mergeCells(`A${row + 1}:F${row + 1}`);
    sheet.getCell(`A${row + 1}`).value = "SUBTOTAL C$";
    sheet.getCell(`G${row + 1}`).value = subtotalVenta.toFixed(2);

    sheet.getRow(row + 1).eachCell(cell => {
      cell.fill = fillSubtotal;
      cell.border = border;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
    });

    // iva
    sheet.mergeCells(`A${row + 2}:F${row + 2}`);
    sheet.getCell(`A${row + 2}`).value = "IVA 15%";
    sheet.getCell(`G${row + 2}`).value = iva.toFixed(2);

    sheet.getRow(row + 2).eachCell(cell => {
      cell.fill = fillSubtotal;
      cell.border = border;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
    });

    // total
    sheet.mergeCells(`A${row + 3}:F${row + 3}`);
    sheet.getCell(`A${row + 3}`).value = "TOTAL C$";
    sheet.getCell(`G${row + 3}`).value = total.toFixed(2);

    sheet.getRow(row + 3).eachCell(cell => {
      cell.fill = fillTotal;
      cell.border = border;
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: "center" };
    });

    const excelName = `avaluo_detallado_${avaluo_id}_${Date.now()}.xlsx`;
    const excelPath = path.join(dir, excelName);
    await workbook.xlsx.writeFile(excelPath);

    // --------------------------------------------------------
    // 4) PDF IGUAL AL EXCEL (COLORES, BORDES, TODO)
    // --------------------------------------------------------
    const PdfPrinter = (await import("pdfmake")).default;

    const fonts = {
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique"
      }
    };

    const printer = new PdfPrinter(fonts);

    // cuerpo de tabla PDF con colores como el excel
    const tableBody = [
      headers.map(h => ({
        text: h,
        bold: true,
        fillColor: "#D9E1F2",
        alignment: "center"
      }))
    ];

    let i = 1;
    for (const d of avaluo.detalles_avaluos) {
      const cd = Number(d.Servicios.total_costo_directo);
      const ci = Number(d.Servicios.total_costo_indirecto);
      const cv = cd + ci;

      tableBody.push([
        { text: i++, alignment: "center" },
        { text: d.actividad, alignment: "left" },
        { text: d.unidad_de_medida, alignment: "center" },
        { text: d.cantidad.toString(), alignment: "center" },
        { text: cd.toFixed(2), alignment: "center" },
        { text: ci.toFixed(2), alignment: "center" },
        { text: cv.toFixed(2), alignment: "center" }
      ]);
    }

    // subtotales con colores
    tableBody.push([
      { text: "", colSpan: 5, border: [false, false, false, false] }, {}, {}, {}, {},
      { text: "SUBTOTAL C$", bold: true, fillColor: "#FFF2CC", alignment: "center" },
      { text: subtotalVenta.toFixed(2), bold: true, fillColor: "#FFF2CC", alignment: "center" }
    ]);

    tableBody.push([
      { text: "", colSpan: 5, border: [false, false, false, false] }, {}, {}, {}, {},
      { text: "IVA 15%", bold: true, fillColor: "#FFF2CC", alignment: "center" },
      { text: iva.toFixed(2), bold: true, fillColor: "#FFF2CC", alignment: "center" }
    ]);

    tableBody.push([
      { text: "", colSpan: 5, border: [false, false, false, false] }, {}, {}, {}, {},
      { text: "TOTAL C$", bold: true, fillColor: "#FFD966", alignment: "center" },
      { text: total.toFixed(2), bold: true, fillColor: "#FFD966", alignment: "center" }
    ]);

    const docDefinition = {
      pageOrientation: "landscape",
      defaultStyle: { font: "Helvetica" },
      pageMargins: [40, 40, 40, 40],
      content: [
        {
          columns: [
            { text: "ASESORÍA & CONSTRUCCIÓN S.A.", style: "title", width: "*" },
            fs.existsSync(logoPath) ? { image: logoPath, width: 120 } : {}
          ]
        },
        { text: "OFERTA ECONÓMICA DETALLADA\n\n", style: "subtitle" },

        `Proyecto: ${avaluo.proyectos.nombre_proyecto}`,
        `Ubicación: ${avaluo.proyectos.ubicacion}`,
        `Fecha: ${new Date(avaluo.fecha_inicio).toLocaleDateString()}\n\n`,

        {
          table: {
            widths: [40, "*", 40, 40, 70, 70, 70],
            body: tableBody
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1
          }
        }
      ],
      styles: {
        title: { fontSize: 18, bold: true, alignment: "center" },
        subtitle: { fontSize: 14, bold: true, alignment: "center" }
      }
    };

    const pdfName = `avaluo_detallado_${avaluo_id}_${Date.now()}.pdf`;
    const pdfPath = path.join(dir, pdfName);

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const stream = fs.createWriteStream(pdfPath);

    pdfDoc.pipe(stream);
    pdfDoc.end();

    // --------------------------------------------------------
    // 5) GUARDAR EN BD
    // --------------------------------------------------------
    await prisma.reportes_generados.create({
      data: {
        usuario_id: 1,
        nombre_reporte: "Avalúo Detallado Excel",
        tipo_reporte: "EXCEL",
        archivo_url: `/reportes/${excelName}`
      }
    });

    await prisma.reportes_generados.create({
      data: {
        usuario_id: 1,
        nombre_reporte: "Avalúo Detallado PDF",
        tipo_reporte: "PDF",
        archivo_url: `/reportes/${pdfName}`
      }
    });

    stream.on("finish", () => {
      res.json({
        ok: true,
        msg: "Excel y PDF generados correctamente.",
        excel: `/reportes/${excelName}`,
        pdf: `/reportes/${pdfName}`
      });
    });

  } catch (error) {
    console.error("❌ Error generarAvaluos:", error);
    res.status(500).json({ ok: false, msg: "Error al generar reporte." });
  }
}


  // =======================================================
  // 7. REPORTE DE SERVICIOS
  // =======================================================
  static async generarServicios(req, res) {
    try {
      const usuario_id = Number(req.body.usuario_id);
      if (!usuario_id)
        return res.status(400).json({ ok: false, msg: "usuario_id requerido" });

      const servicios = await prisma.servicios.findMany({
        where: { fecha_eliminacion: null },
        orderBy: { servicio_id: "asc" },
      });

      const fileName = `reporte_servicios_${Date.now()}.xlsx`;
      const reportesPath = path.join(process.cwd(), "public", "reportes");

      if (!fs.existsSync(reportesPath))
        fs.mkdirSync(reportesPath, { recursive: true });

      const filePath = path.join(reportesPath, fileName);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Servicios");

      sheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Servicio", key: "nombre", width: 30 },
        { header: "Descripción", key: "desc", width: 40 },
        { header: "Costo Directo", key: "directo", width: 15 },
        { header: "Costo Indirecto", key: "indirecto", width: 15 },
        { header: "Costo Venta", key: "venta", width: 15 },
      ];

      servicios.forEach((s) => {
        sheet.addRow({
          id: s.servicio_id,
          nombre: s.nombre_servicio,
          desc: s.descripcion,
          directo: s.total_costo_directo,
          indirecto: s.total_costo_indirecto,
          venta: Number(s.total_costo_directo) + Number(s.total_costo_indirecto),
        });
      });

      await workbook.xlsx.writeFile(filePath);

      await prisma.reportes_generados.create({
        data: {
          usuario_id,
          nombre_reporte: "Reporte de Servicios",
          tipo_reporte: "EXCEL",
          archivo_url: `/reportes/${fileName}`,
          descripcion: "Reporte general de servicios",
          ip_generacion: req.socket.remoteAddress,
        },
      });

      res.json({ ok: true, msg: "Excel generado", url: `/reportes/${fileName}` });
    } catch (error) {
      console.error("❌ Error generarServicios:", error);
      res.status(500).json({ ok: false, msg: "Error al generar Excel." });
    }
  }

}
