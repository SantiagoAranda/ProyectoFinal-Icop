-- DropIndex
DROP INDEX "EstadisticaTesoreria_turnoId_key";

-- CreateIndex
CREATE INDEX "EstadisticaTesoreria_turnoId_idx" ON "EstadisticaTesoreria"("turnoId");
