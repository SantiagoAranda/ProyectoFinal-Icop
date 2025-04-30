/*
  Warnings:

  - Added the required column `nombre` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "especialidad" TEXT,
ADD COLUMN     "nombre" TEXT NOT NULL;
