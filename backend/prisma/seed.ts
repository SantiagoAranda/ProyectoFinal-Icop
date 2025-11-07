import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log(' Iniciando carga de datos...')

  // --- Contraseñas ---
  const passwordHash = await bcrypt.hash('123456', 10)
  const adminHash = await bcrypt.hash('admin', 10)
  const tesoreroHash = await bcrypt.hash('tesorero', 10)
  const clienteHash = await bcrypt.hash('cliente', 10)

  // --- Usuarios ---
  const users = [
    { email: 'empleado1@hotmail.com', nombre: 'Valentina Ríos', role: 'EMPLEADO', especialidad: 'Peluquero', password: passwordHash },
    { email: 'empleado2@hotmail.com', nombre: 'Camila Ortega', role: 'EMPLEADO', especialidad: 'Peluquero', password: passwordHash },
    { email: 'empleado3@hotmail.com', nombre: 'Lucía Navarro', role: 'EMPLEADO', especialidad: 'Peluquero', password: passwordHash },
    { email: 'empleado4@hotmail.com', nombre: 'Ana Martínez', role: 'EMPLEADO', especialidad: 'Uñas', password: passwordHash },
    { email: 'empleado5@hotmail.com', nombre: 'Isabella Cortés', role: 'EMPLEADO', especialidad: 'Uñas', password: passwordHash },
    { email: 'empleado6@hotmail.com', nombre: 'Laura Gómez', role: 'EMPLEADO', especialidad: 'Masajista', password: passwordHash },
    { email: 'empleado7@hotmail.com', nombre: 'Sofía Mendoza', role: 'EMPLEADO', especialidad: 'Depiladora', password: passwordHash },
    { email: 'empleado8@hotmail.com', nombre: 'Sofía López', role: 'EMPLEADO', especialidad: 'Masajista', password: passwordHash },
    { email: 'empleado9@hotmail.com', nombre: 'Paula Aguirre', role: 'EMPLEADO', especialidad: 'Uñas', password: passwordHash },
    { email: 'empleado10@hotmail.com', nombre: 'Valentina Ruiz', role: 'EMPLEADO', especialidad: 'Peluquero', password: passwordHash },
    { email: 'admin@admin.com', nombre: 'Administrador', role: 'ADMIN', password: adminHash },
    { email: 'tesorero@tesorero.com', nombre: 'Tesorero Oficial', role: 'TESORERO', password: tesoreroHash },
    { email: 'cliente@cliente.com', nombre: 'Marta López', role: 'CLIENTE', password: clienteHash },
  ]
  await prisma.user.createMany({ data: users, skipDuplicates: true })

  // --- Servicios ---
  const servicios = [
    { nombre: 'Corte de cabello unisex', descripcion: 'Corte personalizado según estilo y tendencia', precio: 12000, duracion: 1, especialidad: 'Peluquero' },
    { nombre: 'Coloración', descripcion: 'Tinte completo con productos profesionales', precio: 40000, duracion: 2, especialidad: 'Peluquero' },
    { nombre: 'Reflejos / Mechas', descripcion: 'Técnicas de iluminación y balayage', precio: 50000, duracion: 2, especialidad: 'Peluquero' },
    { nombre: 'Peinados eventos', descripcion: 'Peinados para bodas, fiestas y eventos especiales', precio: 70000, duracion: 3, especialidad: 'Peluquero' },
    { nombre: 'Tratamientos capilares', descripcion: 'Hidratación profunda y reparación de cabello', precio: 25000, duracion: 2, especialidad: 'Peluquero' },
    { nombre: 'Manicura', descripcion: 'Esmaltado clásico o en gel', precio: 25000, duracion: 2, especialidad: 'Uñas' },
    { nombre: 'Pedicura estética/spa', descripcion: 'Cuidado y estética de pies', precio: 30000, duracion: 2, especialidad: 'Uñas' },
    { nombre: 'Masaje relajante', descripcion: 'Relaja músculos y reduce el estrés', precio: 50000, duracion: 1, especialidad: 'Masajista' },
    { nombre: 'Depilación cera/láser', descripcion: 'Depilación facial o corporal', precio: 23000, duracion: 1, especialidad: 'Depiladora' },
  ]
  await prisma.servicio.createMany({ data: servicios, skipDuplicates: true })

  // --- Productos ---
  const productos = [
    { nombre: 'Shampoo Reparador', descripcion: 'Shampoo nutritivo y reparador. Marca: L’Oréal Professionnel.', precio: 25000, stock: 19, marca: 'L’Oréal Professionnel' },
    { nombre: 'Acondicionador Hidratante', descripcion: 'Acondicionador hidratante para cabello seco. Marca: Kérastase.', precio: 27000, stock: 12, marca: 'Kérastase' },
    { nombre: 'Mascarilla Capilar', descripcion: 'Mascarilla intensiva para reparación profunda. Marca: Redken.', precio: 35000, stock: 9, marca: 'Redken' },
    { nombre: 'Aceite Capilar', descripcion: 'Aceite nutritivo para puntas y medios. Marca: Moroccanoil.', precio: 30000, stock: 15, marca: 'Moroccanoil' },
    { nombre: 'Laca Fijadora', descripcion: 'Spray fijador de larga duración. Marca: Schwarzkopf.', precio: 22000, stock: 12, marca: 'Schwarzkopf' },
    { nombre: 'Serum Antifrizz', descripcion: 'Suero anti frizz y protector térmico. Marca: L’Oréal Professionnel.', precio: 28000, stock: 15, marca: 'L’Oréal Professionnel' },
    { nombre: 'Tintura Permanente', descripcion: 'Tintura profesional varios tonos. Marca: Wella Koleston.', precio: 32000, stock: 24, marca: 'Wella Koleston' },
    { nombre: 'Crema para peinar', descripcion: 'Crema nutritiva para peinar y definir rizos. Marca: Sedal.', precio: 18000, stock: 20, marca: 'Sedal' },
    { nombre: 'Shampoo Matizador', descripcion: 'Shampoo violeta para cabellos rubios/platinados. Marca: Alfaparf.', precio: 26000, stock: 14, marca: 'Alfaparf' },
    { nombre: 'Ampollas Capilares', descripcion: 'Tratamiento capilar intensivo en ampollas. Marca: L’Oréal.', precio: 40000, stock: 8, marca: 'L’Oréal' },
  ]

  // Añadimos costoCompra (60% del precio)
  const productosConCosto = productos.map(p => ({
    ...p,
    costoCompra: p.precio * 0.6
  }))
  await prisma.producto.createMany({ data: productosConCosto, skipDuplicates: true })

  // --- Proveedores ---
  const proveedores = await prisma.proveedor.createMany({
    data: [
      { nombre: 'Belleza Integral', email: 'ventas@bellezaintegral.com', telefono: '1122334455' },
      { nombre: 'Distribuidora Capilar SRL', email: 'contacto@capilar.com', telefono: '1145678901' },
      { nombre: 'Estilo & Glamour', email: 'info@estiloglamour.com', telefono: '1133445566' },
    ],
  })

  const listaProductos = await prisma.producto.findMany()
  const proveedoresList = await prisma.proveedor.findMany()

  // Dividimos productos entre los 3 proveedores (sin orden)
  for (let i = 0; i < proveedoresList.length; i++) {
    const proveedor = proveedoresList[i]
    const productosAsignados = listaProductos.filter((_, idx) => idx % 3 === i)

    const detalles = productosAsignados.map(p => ({
      productoId: p.id,
      cantidad: Math.floor(Math.random() * 10) + 5,
      subtotal: p.costoCompra! * (Math.floor(Math.random() * 10) + 5)
    }))

    const totalCompra = detalles.reduce((acc, d) => acc + d.subtotal, 0)

    await prisma.compra.create({
      data: {
        proveedorId: proveedor.id,
        total: totalCompra,
        detalles: { create: detalles }
      }
    })
  }

  console.log('✅ Seed completado correctamente con proveedores y compras.')
}

main()
  .catch(e => {
    console.error('❌ Error al ejecutar seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
