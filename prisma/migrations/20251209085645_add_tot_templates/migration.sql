-- CreateEnum
CREATE TYPE "TotTemplateStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "TotTemplateType" AS ENUM ('VOLUME_BASED', 'SEASONAL', 'LAUNCH_SUPPORT', 'CLEARANCE');

-- CreateEnum
CREATE TYPE "TotTemplateParameterType" AS ENUM ('text', 'number', 'date', 'boolean', 'currency', 'percentage');

-- CreateTable
CREATE TABLE "tot_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TotTemplateType" NOT NULL,
    "status" "TotTemplateStatus" NOT NULL DEFAULT 'draft',
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tot_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tot_template_parameters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TotTemplateParameterType" NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tot_template_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tot_template_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "status" "TotTemplateStatus" NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeNotes" TEXT,

    CONSTRAINT "tot_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tot_templates_tenantId_idx" ON "tot_templates"("tenantId");

-- CreateIndex
CREATE INDEX "tot_templates_tenantId_type_idx" ON "tot_templates"("tenantId", "type");

-- CreateIndex
CREATE INDEX "tot_templates_tenantId_status_idx" ON "tot_templates"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tot_templates_tenantId_name_idx" ON "tot_templates"("tenantId", "name");

-- CreateIndex
CREATE INDEX "tot_template_parameters_templateId_idx" ON "tot_template_parameters"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "tot_template_parameters_templateId_name_key" ON "tot_template_parameters"("templateId", "name");

-- CreateIndex
CREATE INDEX "tot_template_versions_templateId_idx" ON "tot_template_versions"("templateId");

-- CreateIndex
CREATE INDEX "tot_template_versions_templateId_version_idx" ON "tot_template_versions"("templateId", "version");

-- AddForeignKey
ALTER TABLE "tot_templates" ADD CONSTRAINT "tot_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_templates" ADD CONSTRAINT "tot_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_templates" ADD CONSTRAINT "tot_templates_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_template_parameters" ADD CONSTRAINT "tot_template_parameters_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "tot_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_template_versions" ADD CONSTRAINT "tot_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "tot_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tot_template_versions" ADD CONSTRAINT "tot_template_versions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
