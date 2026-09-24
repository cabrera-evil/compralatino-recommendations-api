-- CreateTable
CREATE TABLE "recommendations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendations_user_id_idx" ON "recommendations"("user_id");

-- CreateIndex
CREATE INDEX "recommendations_product_id_idx" ON "recommendations"("product_id");
