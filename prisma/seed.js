import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/* ============================================================
   FUNCIÓN AUXILIAR PARA CREAR O ACTUALIZAR MENÚS
============================================================ */

async function upsertMenuPorNombre({
  nombre,
  es_submenu,
  url,
  id_menu_parent,
  estado = true,
  show = true,
}) {
  const menuExistente = await prisma.menu.findFirst({
    where: { nombre },
  });

  if (menuExistente) {
    return await prisma.menu.update({
      where: {
        id_menu: menuExistente.id_menu,
      },
      data: {
        es_submenu,
        url,
        id_menu_parent,
        estado,
        show,
      },
    });
  }

  return await prisma.menu.create({
    data: {
      nombre,
      es_submenu,
      url,
      id_menu_parent,
      estado,
      show,
    },
  });
}

/* ============================================================
   FUNCIÓN AUXILIAR PARA CREAR PERMISOS SIN DUPLICAR
============================================================ */

async function crearPermisoSiNoExiste(usuario_id, id_menu) {
  const permisoExistente = await prisma.permisos.findFirst({
    where: {
      usuario_id,
      id_menu,
    },
  });

  if (permisoExistente) {
    return await prisma.permisos.update({
      where: {
        permiso_id: permisoExistente.permiso_id,
      },
      data: {
        estado: true,
      },
    });
  }

  return await prisma.permisos.create({
    data: {
      usuario_id,
      id_menu,
      estado: true,
    },
  });
}

async function main() {
  console.log("Iniciando inserción de datos iniciales...");

  /* ============================================================
     1. ROLES
  ============================================================ */

  await prisma.roles.createMany({
    data: [
      {
        cargo: "Administrador General",
        descripcion:
          "Responsable de la gestión total del sistema, con acceso completo a todos los módulos.",
      },
      {
        cargo: "Administrador",
        descripcion: "Acceso total al sistema.",
      },
      {
        cargo: "Ingeniero Civil",
        descripcion: "Encargado de proyectos.",
      },
      {
        cargo: "Contador",
        descripcion: "Gestión financiera y compras.",
      },
      {
        cargo: "Supervisor",
        descripcion: "Supervisión de obras.",
      },
      {
        cargo: "Operador de Maquinaria",
        descripcion: "Manejo de maquinaria pesada.",
      },
      {
        cargo: "Chofer",
        descripcion: "Transporte de personal y materiales.",
      },
    ],
    skipDuplicates: true,
  });

  /* ============================================================
     2. CATEGORÍAS DE MATERIALES
  ============================================================ */

  await prisma.categorias.createMany({
    data: [
      {
        nombre_categoria: "Materiales de Construcción",
        descripcion: "Cemento, arena, hierro, etc.",
      },
      {
        nombre_categoria: "Herramientas",
        descripcion: "Taladros, sierras y martillos.",
      },
      {
        nombre_categoria: "Pinturas",
        descripcion: "Pinturas, brochas y selladores.",
      },
      {
        nombre_categoria: "Tuberías",
        descripcion: "PVC, cobre y conexiones.",
      },
      {
        nombre_categoria: "Ferretería",
        descripcion: "Clavos, tornillos, adhesivos.",
      },
    ],
    skipDuplicates: true,
  });

  /* ============================================================
     3. CATEGORÍAS DE PROVEEDORES
  ============================================================ */

  await prisma.categorias_proveedor.createMany({
    data: [
      {
        nombre_categoria: "Materiales",
        descripcion: "Proveedores de materiales de construcción.",
      },
      {
        nombre_categoria: "Maquinaria",
        descripcion: "Proveedores de maquinaria pesada.",
      },
      {
        nombre_categoria: "Transporte",
        descripcion: "Proveedores de transporte y logística.",
      },
      {
        nombre_categoria: "Ferretería",
        descripcion: "Suministros de ferretería y herramientas.",
      },
      {
        nombre_categoria: "Pinturas",
        descripcion: "Proveedores de pinturas y acabados.",
      },
    ],
    skipDuplicates: true,
  });

  /* ============================================================
     4. EMPLEADO ADMINISTRADOR
  ============================================================ */

  const rolAdministradorGeneral = await prisma.roles.findFirst({
    where: {
      cargo: "Administrador General",
    },
  });

  if (!rolAdministradorGeneral) {
    throw new Error("No se encontró el rol Administrador General.");
  }

  const empleadoAdminExistente = await prisma.empleados.findFirst({
    where: {
      OR: [
        {
          cedula: "0000000000000A",
        },
        {
          correo: "admin@aconsa.com",
        },
      ],
    },
  });

  let empleadoAdmin;

  if (!empleadoAdminExistente) {
    empleadoAdmin = await prisma.empleados.create({
      data: {
        nombres: "Administrador",
        apellidos: "General",
        cedula: "0000000000000A",
        rol_id: rolAdministradorGeneral.rol_id,
        fecha_nacimiento: new Date("1998-01-01"),
        fecha_contratacion: new Date(),
        direccion: "San Carlos, Río San Juan",
        pais: "Nicaragua",
        telefono: "00000000",
        correo: "admin@aconsa.com",
        reportes: null,
      },
    });
  } else {
    empleadoAdmin = await prisma.empleados.update({
      where: {
        empleado_id: empleadoAdminExistente.empleado_id,
      },
      data: {
        nombres: "Administrador",
        apellidos: "General",
        cedula: "0000000000000A",
        rol_id: rolAdministradorGeneral.rol_id,
        direccion: "San Carlos, Río San Juan",
        pais: "Nicaragua",
        telefono: "00000000",
        correo: "admin@aconsa.com",
        reportes: null,
      },
    });
  }

  /* ============================================================
     5. USUARIO ADMINISTRADOR
     Usuario: admin
     Contraseña: Admin123*
  ============================================================ */

  const contrasenaHash = await bcrypt.hash("Admin123*", 10);

  const usuarioAdminExistente = await prisma.usuarios.findFirst({
    where: {
      usuario: "admin",
    },
  });

  let usuarioAdmin;

  if (!usuarioAdminExistente) {
    usuarioAdmin = await prisma.usuarios.create({
      data: {
        empleado_id: empleadoAdmin.empleado_id,
        usuario: "admin",
        contrasena: contrasenaHash,
      },
    });
  } else {
    usuarioAdmin = await prisma.usuarios.update({
      where: {
        usuario_id: usuarioAdminExistente.usuario_id,
      },
      data: {
        empleado_id: empleadoAdmin.empleado_id,
        contrasena: contrasenaHash,
      },
    });
  }

  /* ============================================================
     6. MENÚS PRINCIPALES
  ============================================================ */

  const menuInicio = await upsertMenuPorNombre({
    nombre: "Inicio",
    es_submenu: false,
    url: "/",
    id_menu_parent: null,
  });

  const menuDashboard = await upsertMenuPorNombre({
    nombre: "Dashboard",
    es_submenu: false,
    url: "/dashboard",
    id_menu_parent: null,
  });

  const menuRegistro = await upsertMenuPorNombre({
    nombre: "Registro",
    es_submenu: false,
    url: null,
    id_menu_parent: null,
  });

  const menuProyectos = await upsertMenuPorNombre({
    nombre: "Proyectos",
    es_submenu: false,
    url: "/proyectos",
    id_menu_parent: null,
  });

  const menuVehiculos = await upsertMenuPorNombre({
    nombre: "Vehículos",
    es_submenu: false,
    url: "/vehiculos",
    id_menu_parent: null,
  });

  const menuCompras = await upsertMenuPorNombre({
    nombre: "Compras",
    es_submenu: false,
    url: "/compras",
    id_menu_parent: null,
  });

  const menuMateriales = await upsertMenuPorNombre({
    nombre: "Materiales",
    es_submenu: false,
    url: "/materiales",
    id_menu_parent: null,
  });

  const menuServicios = await upsertMenuPorNombre({
    nombre: "Servicios",
    es_submenu: false,
    url: "/servicios",
    id_menu_parent: null,
  });

  const menuMenu = await upsertMenuPorNombre({
    nombre: "Menu",
    es_submenu: false,
    url: "/menus",
    id_menu_parent: null,
  });

  const menuAvaluo = await upsertMenuPorNombre({
    nombre: "Avaluo",
    es_submenu: false,
    url: "/avaluos",
    id_menu_parent: null,
  });

  const menuMovimientos = await upsertMenuPorNombre({
    nombre: "Movimientos",
    es_submenu: false,
    url: "/movimientos_inventario",
    id_menu_parent: null,
  });

  const menuNotificaciones = await upsertMenuPorNombre({
    nombre: "Notificaciones",
    es_submenu: false,
    url: "/notificaciones",
    id_menu_parent: null,
  });

  /* ============================================================
     7. SUBMENÚS DENTRO DE REGISTRO
  ============================================================ */

  const submenuEmpleados = await upsertMenuPorNombre({
    nombre: "Empleados",
    es_submenu: true,
    url: "/empleados",
    id_menu_parent: menuRegistro.id_menu,
  });

  const submenuClientes = await upsertMenuPorNombre({
    nombre: "Clientes",
    es_submenu: true,
    url: "/clientes",
    id_menu_parent: menuRegistro.id_menu,
  });

  const submenuProveedores = await upsertMenuPorNombre({
    nombre: "Proveedores",
    es_submenu: true,
    url: "/proveedores",
    id_menu_parent: menuRegistro.id_menu,
  });

  const submenuPermisos = await upsertMenuPorNombre({
    nombre: "Permisos",
    es_submenu: true,
    url: "/permisos",
    id_menu_parent: menuRegistro.id_menu,
  });

  const submenuUsuarios = await upsertMenuPorNombre({
    nombre: "Usuarios",
    es_submenu: true,
    url: "/usuarios",
    id_menu_parent: menuRegistro.id_menu,
  });

  /* ============================================================
     8. PERMISOS COMPLETOS PARA EL ADMINISTRADOR
  ============================================================ */

  const menusDelSistema = [
    menuInicio,
    menuDashboard,
    menuRegistro,
    menuProyectos,
    menuVehiculos,
    menuCompras,
    menuMateriales,
    menuServicios,
    menuMenu,
    menuAvaluo,
    menuMovimientos,
    menuNotificaciones,
    submenuEmpleados,
    submenuClientes,
    submenuProveedores,
    submenuPermisos,
    submenuUsuarios,
  ];

  for (const menu of menusDelSistema) {
    await crearPermisoSiNoExiste(usuarioAdmin.usuario_id, menu.id_menu);
  }

  await prisma.permisos.updateMany({
    where: {
      usuario_id: usuarioAdmin.usuario_id,
    },
    data: {
      estado: true,
    },
  });

  console.log("Datos iniciales insertados correctamente.");
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });