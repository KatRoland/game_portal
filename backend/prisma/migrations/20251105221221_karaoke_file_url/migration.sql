/*
  Warnings:

  - Added the required column `fileUrl` to the `KaraokeSongSegment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `KaraokeSongSegment` ADD COLUMN `fileUrl` VARCHAR(191) NOT NULL;
