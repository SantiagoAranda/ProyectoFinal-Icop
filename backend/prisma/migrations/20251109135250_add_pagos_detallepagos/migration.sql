-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT NOT NULL DEFAULT 'Efectivo',
    "tipo" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "turnoId" INTEGER,
    "compraId" INTEGER,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetallePago" (
    "id" SERIAL NOT NULL,
    "pagoId" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetallePago_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DetallePago" ADD CONSTRAINT "DetallePago_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
