/*
  Warnings:

  - A unique constraint covering the columns `[turnoId]` on the table `Pago` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[compraId]` on the table `Pago` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "proveedorId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Pago_turnoId_key" ON "Pago"("turnoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_compraId_key" ON "Pago"("compraId");

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
