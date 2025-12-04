/*
  Warnings:

  - Added the required column `updatedAt` to the `Proveedor` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "EgresoFijo_categoria_mes_anio_key";

-- AlterTable
ALTER TABLE "EgresoFijo" ADD COLUMN     "nota" TEXT,
ADD COLUMN     "subcategoria" TEXT;

-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "existe" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
