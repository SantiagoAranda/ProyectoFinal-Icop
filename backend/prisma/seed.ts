import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando carga de datos...')

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
    { email: 'cliente@cliente.com', nombre: 'marta', role: 'CLIENTE', password: clienteHash },
  ]
  await prisma.user.createMany({ data: users })

  // --- Servicios ---
  const servicios = [
    { nombre: 'Corte de cabello unisex', descripcion: 'Corte personalizado según estilo y tendencia', precio: 12000, duracion: 1, especialidad: 'Peluquero' },
    { nombre: 'Coloración', descripcion: 'Tinte completo con productos profesionales', precio: 40000, duracion: 2, especialidad: 'Peluquero' },
    { nombre: 'Reflejos / Mechas', descripcion: 'Técnicas de iluminación y balayage', precio: 50000, duracion: 2, especialidad: 'Peluquero' },
    { nombre: 'Peinados eventos', descripcion: 'Peinados para bodas, fiestas y eventos especiales', precio: 70000, duracion: 3, especialidad: 'Peluquero' },
    { nombre: 'Tratamientos capilares', descripcion: 'Hidratación profunda y reparación de cabello', precio: 25000, duracion: 2, especialidad: 'Peluqueros' },
    { nombre: 'Alisado / Permanente', descripcion: 'Alisado de keratina o rizado permanente', precio: 50000, duracion: 3, especialidad: 'Peluquero' },
    { nombre: 'Manicura', descripcion: 'Esmaltado clásico o en gel', precio: 25000, duracion: 2, especialidad: 'Uñas' },
    { nombre: 'Pedicura estética/spa', descripcion: 'Cuidado y estética de pies', precio: 30000, duracion: 2, especialidad: 'Uñas' },
    { nombre: 'Uñas esculpidas', descripcion: 'Acrílico o gel con diseños personalizados', precio: 27000, duracion: 2, especialidad: 'Uñas' },
    { nombre: 'Depilación cera/láser', descripcion: 'Depilación de cejas o corporal completa', precio: 23000, duracion: 1, especialidad: 'Depiladora' },
  ]
  await prisma.servicio.createMany({ data: servicios })

  // --- Productos ---
  const productos = [
    { nombre: 'Shampoo Reparador', descripcion: 'Shampoo nutritivo y reparador. Marca: L’Oréal Professionnel.', precio: 25000, stock: 19 },
    { nombre: 'Acondicionador Hidratante', descripcion: 'Acondicionador hidratante para cabello seco. Marca: Kérastase.', precio: 27000, stock: 12 },
    { nombre: 'Mascarilla Capilar', descripcion: 'Mascarilla intensiva para reparación profunda. Marca: Redken.', precio: 35000, stock: 9 },
    { nombre: 'Aceite Capilar', descripcion: 'Aceite nutritivo para puntas y medios. Marca: Moroccanoil.', precio: 30000, stock: 15 },
    { nombre: 'Laca Fijadora', descripcion: 'Spray fijador de larga duración. Marca: Schwarzkopf.', precio: 22000, stock: 12 },
    { nombre: 'Serum Antifrizz', descripcion: 'Suero anti frizz y protector térmico. Marca: L’Oréal Professionnel.', precio: 28000, stock: 15 },
    { nombre: 'Tintura Permanente', descripcion: 'Tintura profesional varios tonos. Marca: Wella Koleston.', precio: 32000, stock: 24 },
    { nombre: 'Crema para peinar', descripcion: 'Crema nutritiva para peinar y definir rizos. Marca: Sedal.', precio: 18000, stock: 20 },
    { nombre: 'Shampoo Matizador', descripcion: 'Shampoo violeta para cabellos rubios/platinados. Marca: Alfaparf.', precio: 26000, stock: 14 },
    { nombre: 'Ampollas Capilares', descripcion: 'Tratamiento capilar intensivo en ampollas. Marca: L’Oréal.', precio: 40000, stock: 8 },
  ]
  await prisma.producto.createMany({ data: productos })

  // --- Turnos ---
  const turnos = [
    { fechaHora: new Date('2025-10-25T13:00:00.000Z'), estado: 'cancelado', clienteId: 13, empleadoId: 5, servicioId: 10 },
    { fechaHora: new Date('2025-10-24T14:00:00.000Z'), estado: 'completado', clienteId: 13, empleadoId: 2, servicioId: 1 },
    { fechaHora: new Date('2025-10-31T20:00:00.000Z'), estado: 'reservado', clienteId: 13, empleadoId: 5, servicioId: 8 },
    { fechaHora: new Date('2025-10-30T17:00:00.000Z'), estado: 'reservado', clienteId: 13, empleadoId: 9, servicioId: 7 },
    { fechaHora: new Date('2025-10-24T15:00:00.000Z'), estado: 'reservado', clienteId: 13, empleadoId: 2, servicioId: 4 },
    { fechaHora: new Date('2025-10-31T12:00:00.000Z'), estado: 'reservado', clienteId: 13, empleadoId: 2, servicioId: 6 },
    { fechaHora: new Date('2025-10-22T13:00:00.000Z'), estado: 'cancelado', clienteId: 13, empleadoId: 5, servicioId: 7 },
    { fechaHora: new Date('2025-10-24T14:00:00.000Z'), estado: 'cancelado', clienteId: 13, empleadoId: 10, servicioId: 4 },
    { fechaHora: new Date('2025-10-25T13:00:00.000Z'), estado: 'reservado', clienteId: 13, empleadoId: 10, servicioId: 2 },
  ]
  await prisma.turno.createMany({ data: turnos })

  // --- TurnoProductos ---
  const turnoProductos = [
    { turnoId: 8, productoId: 2, cantidad: 1 },
    { turnoId: 2, productoId: 7, cantidad: 1 },
    { turnoId: 2, productoId: 2, cantidad: 2 },
    { turnoId: 5, productoId: 3, cantidad: 1 },
    { turnoId: 6, productoId: 4, cantidad: 2 },
    { turnoId: 9, productoId: 1, cantidad: 1 },
    { turnoId: 9, productoId: 4, cantidad: 1 },
  ]
  await prisma.turnoProducto.createMany({ data: turnoProductos })

  const estadisticas = [
  { ingreso: 120000, egreso: 50000, total: 70000, turnoId: 2 },
  { ingreso: 70000, egreso: 30000, total: 40000, turnoId: 4 },
  { ingreso: 50000, egreso: 15000, total: 35000, turnoId: 5 },
]
await prisma.estadisticaTesoreria.createMany({ data: estadisticas })

  console.log('✅ Datos cargados correctamente')
}

main()
  .catch((e) => console.error('Error al ejecutar seed:', e))
  .finally(async () => await prisma.$disconnect())
