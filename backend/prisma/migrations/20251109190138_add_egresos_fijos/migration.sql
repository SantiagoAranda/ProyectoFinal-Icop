/*
  Warnings:

  - A unique constraint covering the columns `[categoria,mes,anio]` on the table `EgresoFijo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EgresoFijo_categoria_mes_anio_key" ON "EgresoFijo"("categoria", "mes", "anio");
