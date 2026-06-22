import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";

import AvaluoRoutes from "./routes/AvaluoRoutes.js";
import DetalleAvaloRoutes from "./routes/DetalleAvaluoRoutes.js";
import CategoriaRoutes from "./routes/CategoriaRoutes.js";
import CategoriasProveedorRoutes from "./routes/CategoriasProveedorRoutes.js";
import ClienteRoutes from "./routes/ClienteRoutes.js";
import CompraRoutes from "./routes/CompraRoutes.js";
import DetalleCompraRoutes from "./routes/DetalleCompraRoutes.js";
import DetalleEmpleadoRoutes from "./routes/DetalleEmpleadoRoutes.js";
import DetalleMaquinariaRoutes from "./routes/DetalleMaquinariaRoutes.js";
import DetalleServicioRoutes from "./routes/DetalleServicioRoutes.js";
import DetalleVehiculoRoutes from "./routes/DetalleVehiculoRoutes.js";
import EmpleadoRoutes from "./routes/EmpleadoRoutes.js";
import MaquinariaRoutes from "./routes/MaquinariaRoutes.js";
import MaterialRoutes from "./routes/MaterialRoutes.js";
import MovimientosInventarioRoutes from "./routes/MovimientosInventarioRoutes.js";
import AlertasInventarioRoutes from "./routes/AlertasInventarioRoutes.js";
import ProveedorRoutes from "./routes/ProveedorRoutes.js";
import ProyectoRoutes from "./routes/ProyectoRoutes.js";
import RolRoutes from "./routes/RolRoutes.js";
import ServicioRoutes from "./routes/ServicioRoutes.js";
import VehiculoRoutes from "./routes/VehiculoRoutes.js";
import CostosDirectosRoutes from "./routes/CostosDirectosRoutes.js";
import CostosIndirectosRoutes from "./routes/CostosIndirectosRoutes.js";
import PermisosRoutes from "./routes/PermisoRoutes.js";
import AuthRoutes from "./routes/AuthRoutes.js";
import MenuRoutes from "./routes/MenuRoutes.js";
import ReportesRouter from "./routes/reportesRoutes.js";
import HistorialAlertasRoutes from "./routes/HistorialAlertasRoutes.js";

dotenv.config();

const app = express();

/* ============================================================
   MIDDLEWARES GENERALES
============================================================ */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* ============================================================
   CONFIGURACIÓN DE CORS
============================================================ */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:4000",
  "http://localhost:3000",

  // Producción en Vercel
  "https://frontend-aconsa.vercel.app",

  // Variable de entorno
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite herramientas como Postman, Thunder Client o requests sin Origin
      if (!origin) {
        return callback(null, true);
      }

      // Permite cualquier puerto local para desarrollo
      const isLocalhost =
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:");

      if (allowedOrigins.includes(origin) || isLocalhost) {
        return callback(null, true);
      }

      console.warn("Bloqueado por CORS:", origin);
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* ============================================================
   ARCHIVOS ESTÁTICOS
============================================================ */

app.use(express.static("public"));

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public", "uploads"))
);

/* ============================================================
   RUTAS BASE
============================================================ */

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    msg: "Backend activo"
  });
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    msg: "API funcionando correctamente"
  });
});

/* ============================================================
   RUTAS DE LA API
============================================================ */

app.use("/api/avaluos", AvaluoRoutes);
app.use("/api/detalle_avaluos", DetalleAvaloRoutes);
app.use("/api/categorias", CategoriaRoutes);
app.use("/api/categorias_proveedores", CategoriasProveedorRoutes);
app.use("/api/clientes", ClienteRoutes);
app.use("/api/compras", CompraRoutes);
app.use("/api/detalle_compras", DetalleCompraRoutes);
app.use("/api/detalle_empleados", DetalleEmpleadoRoutes);
app.use("/api/detalle_maquinarias", DetalleMaquinariaRoutes);
app.use("/api/detalle_servicios", DetalleServicioRoutes);
app.use("/api/detalle_vehiculos", DetalleVehiculoRoutes);
app.use("/api/empleados", EmpleadoRoutes);
app.use("/api/maquinarias", MaquinariaRoutes);
app.use("/api/materiales", MaterialRoutes);
app.use("/api/movimientos_inventario", MovimientosInventarioRoutes);
app.use("/api/alertas_inventario", AlertasInventarioRoutes);
app.use("/api/proveedores", ProveedorRoutes);
app.use("/api/proyectos", ProyectoRoutes);
app.use("/api/roles", RolRoutes);
app.use("/api/servicios", ServicioRoutes);
app.use("/api/vehiculos", VehiculoRoutes);
app.use("/api/costos_directos", CostosDirectosRoutes);
app.use("/api/costos_indirectos", CostosIndirectosRoutes);
app.use("/api/permisos", PermisosRoutes);
app.use("/api/auth", AuthRoutes);
app.use("/api/menus", MenuRoutes);
app.use("/api/reportes", ReportesRouter);
app.use("/api/historial_alertas", HistorialAlertasRoutes);

/* ============================================================
   RUTA NO ENCONTRADA
============================================================ */

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    msg: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

/* ============================================================
   MANEJO GLOBAL DE ERRORES
============================================================ */

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);

  res.status(500).json({
    ok: false,
    msg: "Error interno del servidor"
  });
});

export default app;