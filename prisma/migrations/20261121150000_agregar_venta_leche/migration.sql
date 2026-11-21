-- CreateTable
CREATE TABLE "ventas_leche" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "nota" TEXT,
    "registrado_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_leche_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ventas_leche_fecha_idx" ON "ventas_leche"("fecha");

-- AddForeignKey
ALTER TABLE "ventas_leche" ADD CONSTRAINT "ventas_leche_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
