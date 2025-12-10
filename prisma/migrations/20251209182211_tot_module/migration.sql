-- CreateEnum
CREATE TYPE "TotAgreementStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'active', 'expired');

-- CreateTable
CREATE TABLE "tot_agreements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "type" "TotTemplateType" NOT NULL,
    "status" "TotAgreementStatus" NOT NULL DEFAULT 'draft',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "parameters" JSONB NOT NULL,
    "createdBy" UUID NOT NULL,
    "approvedBy" UUID,
    "rejectedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tot_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tot_agreement_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agreementId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tot_agreement_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tot_agreements_tenantId_idx" ON "tot_agreements"("tenantId");

-- CreateIndex
CREATE INDEX "tot_agreements_tenantId_status_idx" ON "tot_agreements"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tot_agreements_tenantId_brandId_idx" ON "tot_agreements"("tenantId", "brandId");

-- CreateIndex
CREATE INDEX "tot_agreements_tenantId_templateId_idx" ON "tot_agreements"("tenantId", "templateId");

-- CreateIndex
CREATE INDEX "tot_agreements_status_idx" ON "tot_agreements"("status");

-- CreateIndex
CREATE INDEX "tot_agreements_startDate_endDate_idx" ON "tot_agreements"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "tot_agreement_categories_agreementId_idx" ON "tot_agreement_categories"("agreementId");

-- CreateIndex
CREATE INDEX "tot_agreement_categories_categoryId_idx" ON "tot_agreement_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "tot_agreement_categories_agreementId_categoryId_key" ON "tot_agreement_categories"("agreementId", "categoryId");

-- AddForeignKey
ALTER TABLE "tot_agreements" ADD CONSTRAINT "tot_agreements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_agreements" ADD CONSTRAINT "tot_agreements_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_agreements" ADD CONSTRAINT "tot_agreements_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "tot_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_agreements" ADD CONSTRAINT "tot_agreements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_agreements" ADD CONSTRAINT "tot_agreements_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_agreements" ADD CONSTRAINT "tot_agreements_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_agreement_categories" ADD CONSTRAINT "tot_agreement_categories_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "tot_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_agreement_categories" ADD CONSTRAINT "tot_agreement_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
