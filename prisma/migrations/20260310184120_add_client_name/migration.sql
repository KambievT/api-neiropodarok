-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntriesByDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "clientName" TEXT,
    "contractorId" TEXT,
    "description" TEXT,
    "serviceType" TEXT DEFAULT 'individual',
    "amount" INTEGER NOT NULL,
    "cost" INTEGER,
    "duration" INTEGER,
    "completed" BOOLEAN DEFAULT false,

    CONSTRAINT "EntriesByDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Contractor_userId_idx" ON "Contractor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_userId_name_key" ON "Contractor"("userId", "name");

-- CreateIndex
CREATE INDEX "EntriesByDay_userId_dayKey_idx" ON "EntriesByDay"("userId", "dayKey");

-- AddForeignKey
ALTER TABLE "Contractor" ADD CONSTRAINT "Contractor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntriesByDay" ADD CONSTRAINT "EntriesByDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntriesByDay" ADD CONSTRAINT "EntriesByDay_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
