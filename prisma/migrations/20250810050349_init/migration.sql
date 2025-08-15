-- CreateTable
CREATE TABLE "leaders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "full_name" TEXT NOT NULL,
    "residence" TEXT,
    "phone" TEXT,
    "workplace" TEXT,
    "center_info" TEXT,
    "station_number" TEXT,
    "votes_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "persons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leader_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "residence" TEXT,
    "phone" TEXT,
    "workplace" TEXT,
    "center_info" TEXT,
    "station_number" TEXT,
    "votes_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "idx_persons_leader_name" ON "persons"("leader_name");

-- CreateIndex
CREATE INDEX "idx_persons_phone" ON "persons"("phone");

-- CreateIndex
CREATE INDEX "idx_persons_station_number" ON "persons"("station_number");

-- CreateIndex
CREATE INDEX "idx_persons_created_at" ON "persons"("created_at");

-- CreateIndex
CREATE INDEX "idx_persons_leader_name_id" ON "persons"("leader_name", "id");

-- CreateIndex
CREATE INDEX "phone_idx" ON "persons"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
