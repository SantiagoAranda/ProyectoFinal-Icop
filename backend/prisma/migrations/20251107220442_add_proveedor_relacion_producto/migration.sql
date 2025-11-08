/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `imagen` on the `Producto` table. All the data in the column will be lost.
  - Added the required column `proveedorId` to the `Producto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "createdAt",
DROP COLUMN "imagen",
ADD COLUMN     "proveedorId" INTEGER NOT NULL,
ALTER COLUMN "stock" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
