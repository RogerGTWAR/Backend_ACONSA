/*import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando inserción de datos iniciales...");

  // ============================================================
  // 1. ROLES
  // ============================================================

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

  // ============================================================
  // 2. CATEGORÍAS DE MATERIALES
  // ============================================================

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

  // ============================================================
  // 3. CATEGORÍAS DE PROVEEDORES
  // ============================================================

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

  // ============================================================
  // 4. EMPLEADO ADMINISTRADOR
  // Teléfono solo números
  // Cédula sin guiones
  // ============================================================

  const rolAdministradorGeneral = await prisma.roles.findFirst({
    where: {
      cargo: "Administrador General",
    },
  });

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

  let empleadoAdmin = empleadoAdminExistente;

  if (!empleadoAdmin) {
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
        empleado_id: empleadoAdmin.empleado_id,
      },
      data: {
        cedula: "0000000000000A",
        telefono: "00000000",
        correo: "admin@aconsa.com",
        rol_id: rolAdministradorGeneral.rol_id,
      },
    });
  }

  // ============================================================
  // 5. USUARIO ADMINISTRADOR
  // Usuario: admin
  // Contraseña: Admin123*
  // Nota: aquí se guarda la contraseña directa.
  // Si usas bcrypt en tu backend, cámbiala por el hash generado.
  // ============================================================

  const usuarioAdminExistente = await prisma.usuarios.findFirst({
    where: {
      usuario: "admin",
    },
  });

  let usuarioAdmin = usuarioAdminExistente;

  if (!usuarioAdmin) {
    usuarioAdmin = await prisma.usuarios.create({
      data: {
        empleado_id: empleadoAdmin.empleado_id,
        usuario: "admin",
        contrasena: "Admin123*",
      },
    });
  } else {
    usuarioAdmin = await prisma.usuarios.update({
      where: {
        usuario_id: usuarioAdmin.usuario_id,
      },
      data: {
        empleado_id: empleadoAdmin.empleado_id,
      },
    });
  }

  // ============================================================
  // 6. MENÚS PRINCIPALES
  // ============================================================

  await prisma.menu.createMany({
    data: [
      {
        nombre: "Inicio",
        es_submenu: false,
        url: "/",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Dashboard",
        es_submenu: false,
        url: "/dashboard",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Registro",
        es_submenu: false,
        url: null,
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Proyectos",
        es_submenu: false,
        url: "/proyectos",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Vehículos",
        es_submenu: false,
        url: "/vehiculos",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Compras",
        es_submenu: false,
        url: "/compras",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Materiales",
        es_submenu: false,
        url: "/materiales",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Servicios",
        es_submenu: false,
        url: "/servicios",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Menu",
        es_submenu: false,
        url: "/menus",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Avaluo",
        es_submenu: false,
        url: "/avaluos",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Movimientos",
        es_submenu: false,
        url: "/movimientos_inventario",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
      {
        nombre: "Notificaciones",
        es_submenu: false,
        url: "/notificaciones",
        id_menu_parent: null,
        estado: true,
        show: true,
      },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // 7. CORREGIR MENÚS PRINCIPALES SI YA EXISTÍAN
  // ============================================================

  await prisma.menu.updateMany({
    where: {
      nombre: "Inicio",
    },
    data: {
      es_submenu: false,
      url: "/",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Dashboard",
    },
    data: {
      es_submenu: false,
      url: "/dashboard",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Registro",
    },
    data: {
      es_submenu: false,
      url: null,
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Proyectos",
    },
    data: {
      es_submenu: false,
      url: "/proyectos",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Vehículos",
    },
    data: {
      es_submenu: false,
      url: "/vehiculos",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Compras",
    },
    data: {
      es_submenu: false,
      url: "/compras",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Materiales",
    },
    data: {
      es_submenu: false,
      url: "/materiales",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Servicios",
    },
    data: {
      es_submenu: false,
      url: "/servicios",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Menu",
    },
    data: {
      es_submenu: false,
      url: "/menus",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Avaluo",
    },
    data: {
      es_submenu: false,
      url: "/avaluos",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Movimientos",
    },
    data: {
      es_submenu: false,
      url: "/movimientos_inventario",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Notificaciones",
    },
    data: {
      es_submenu: false,
      url: "/notificaciones",
      id_menu_parent: null,
      estado: true,
      show: true,
    },
  });

  // ============================================================
  // 8. SUBMENÚS DENTRO DE REGISTRO
  // ============================================================

  const menuRegistro = await prisma.menu.findFirst({
    where: {
      nombre: "Registro",
    },
  });

  await prisma.menu.createMany({
    data: [
      {
        nombre: "Empleados",
        es_submenu: true,
        url: "/empleados",
        id_menu_parent: menuRegistro.id_menu,
        estado: true,
        show: true,
      },
      {
        nombre: "Clientes",
        es_submenu: true,
        url: "/clientes",
        id_menu_parent: menuRegistro.id_menu,
        estado: true,
        show: true,
      },
      {
        nombre: "Proveedores",
        es_submenu: true,
        url: "/proveedores",
        id_menu_parent: menuRegistro.id_menu,
        estado: true,
        show: true,
      },
      {
        nombre: "Permisos",
        es_submenu: true,
        url: "/permisos",
        id_menu_parent: menuRegistro.id_menu,
        estado: true,
        show: true,
      },
      {
        nombre: "Usuarios",
        es_submenu: true,
        url: "/usuarios",
        id_menu_parent: menuRegistro.id_menu,
        estado: true,
        show: true,
      },
    ],
    skipDuplicates: true,
  });

  // ============================================================
  // 9. CORREGIR SUBMENÚS SI YA EXISTÍAN
  // ============================================================

  await prisma.menu.updateMany({
    where: {
      nombre: "Empleados",
    },
    data: {
      es_submenu: true,
      url: "/empleados",
      id_menu_parent: menuRegistro.id_menu,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Clientes",
    },
    data: {
      es_submenu: true,
      url: "/clientes",
      id_menu_parent: menuRegistro.id_menu,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Proveedores",
    },
    data: {
      es_submenu: true,
      url: "/proveedores",
      id_menu_parent: menuRegistro.id_menu,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Permisos",
    },
    data: {
      es_submenu: true,
      url: "/permisos",
      id_menu_parent: menuRegistro.id_menu,
      estado: true,
      show: true,
    },
  });

  await prisma.menu.updateMany({
    where: {
      nombre: "Usuarios",
    },
    data: {
      es_submenu: true,
      url: "/usuarios",
      id_menu_parent: menuRegistro.id_menu,
      estado: true,
      show: true,
    },
  });

  // ============================================================
  // 10. PERMISOS COMPLETOS PARA EL ADMINISTRADOR
  // ============================================================

  const menusActivos = await prisma.menu.findMany({
    where: {
      estado: true,
    },
    select: {
      id_menu: true,
    },
  });

  const permisosAdmin = menusActivos.map((menu) => ({
    usuario_id: usuarioAdmin.usuario_id,
    id_menu: menu.id_menu,
    estado: true,
  }));

  await prisma.permisos.createMany({
    data: permisosAdmin,
    skipDuplicates: true,
  });

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
*/