import express from "express";
import ReportesController from "../controllers/ReportesController.js";
import multer from "multer";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "public", "reportes"));
  },
  filename: (_req, file, cb) => {
    const fileName = Date.now() + "_" + file.originalname.replace(/\s+/g, "_");
    cb(null, fileName);
  }
});


const upload = multer({ storage });

router.get("/", ReportesController.getAll);
router.get("/:id", ReportesController.getById);
router.get("/descargar/:id", ReportesController.download);

router.post("/", upload.single("archivo"), ReportesController.create);

router.post("/generar/avaluos", ReportesController.generarAvaluos);
router.post("/generar/servicios", ReportesController.generarServicios);

router.delete("/:id", ReportesController.delete);

export default router;
