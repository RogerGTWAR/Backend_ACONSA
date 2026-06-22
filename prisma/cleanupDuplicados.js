import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando registros duplicados...");

  await prisma.$executeRawUnsafe(`
    UPDATE public.empleados e
    SET rol_id = r_min.rol_id_min
    FROM (
        SELECT cargo, MIN(rol_id) AS rol_id_min
        FROM public.roles
        GROUP BY cargo
    ) r_min
    JOIN public.roles r_dup
    ON r_dup.cargo = r_min.cargo
    WHERE e.rol_id = r_dup.rol_id
    AND r_dup.rol_id <> r_min.rol_id_min;
  `);

  await prisma.$executeRawUnsafe(`
    DELETE FROM public.roles r
    USING public.roles r2
    WHERE r.rol_id > r2.rol_id
    AND r.cargo = r2.cargo;
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE public.materiales m
    SET categoria_id = c_min.categoria_id_min
    FROM (
        SELECT nombre_categoria, MIN(categoria_id) AS categoria_id_min
        FROM public.categorias
        GROUP BY nombre_categoria
    ) c_min
    JOIN public.categorias c_dup
    ON c_dup.nombre_categoria = c_min.nombre_categoria
    WHERE m.categoria_id = c_dup.categoria_id
    AND c_dup.categoria_id <> c_min.categoria_id_min;
  `);

  await prisma.$executeRawUnsafe(`
    DELETE FROM public.categorias c
    USING public.categorias c2
    WHERE c.categoria_id > c2.categoria_id
    AND c.nombre_categoria = c2.nombre_categoria;
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE public.proveedores p
    SET categoria_proveedor_id = cp_min.categoria_proveedor_id_min
    FROM (
        SELECT nombre_categoria, MIN(categoria_proveedor_id) AS categoria_proveedor_id_min
        FROM public.categorias_proveedor
        GROUP BY nombre_categoria
    ) cp_min
    JOIN public.categorias_proveedor cp_dup
    ON cp_dup.nombre_categoria = cp_min.nombre_categoria
    WHERE p.categoria_proveedor_id = cp_dup.categoria_proveedor_id
    AND cp_dup.categoria_proveedor_id <> cp_min.categoria_proveedor_id_min;
  `);

  await prisma.$executeRawUnsafe(`
    DELETE FROM public.categorias_proveedor cp
    USING public.categorias_proveedor cp2
    WHERE cp.categoria_proveedor_id > cp2.categoria_proveedor_id
    AND cp.nombre_categoria = cp2.nombre_categoria;
  `);

  console.log("Duplicados eliminados correctamente.");
}

main()
  .catch((error) => {
    console.error("Error limpiando duplicados:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });