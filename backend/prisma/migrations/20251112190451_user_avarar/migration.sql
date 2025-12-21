-- AlterTable
ALTER TABLE `User` ADD COLUMN `customAvatar` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `customAvatarUrl` VARCHAR(191) NULL;
