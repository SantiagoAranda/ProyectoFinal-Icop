import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  console.log("📦 Exportando datos actuales...");

  const data = {
    users: await prisma.user.findMany(),
    servicios: await prisma.servicio.findMany(),
    productos: await prisma.producto.findMany(),
    turnos: await prisma.turno.findMany(),
    turnoProductos: await prisma.turnoProducto.findMany(),
  };

  fs.writeFileSync("export.json", JSON.stringify(data, null, 2));

  console.log("✅ Datos exportados a export.json");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
