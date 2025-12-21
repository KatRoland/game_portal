-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `discordId` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `discriminator` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_token_key`(`token`),
    UNIQUE INDEX `Session_refreshToken_key`(`refreshToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameModePlaylist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `musicQuizPlaylistId` INTEGER NULL,

    UNIQUE INDEX `GameModePlaylist_name_key`(`name`),
    UNIQUE INDEX `GameModePlaylist_musicQuizPlaylistId_key`(`musicQuizPlaylistId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MusicQuizTrack` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MusicQuizPlaylist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `MusicQuizPlaylist_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MusicQuizPlaylistTrack` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `playlistId` INTEGER NOT NULL,
    `trackId` INTEGER NOT NULL,

    UNIQUE INDEX `MusicQuizPlaylistTrack_playlistId_trackId_key`(`playlistId`, `trackId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GameModePlaylist` ADD CONSTRAINT `GameModePlaylist_musicQuizPlaylistId_fkey` FOREIGN KEY (`musicQuizPlaylistId`) REFERENCES `MusicQuizPlaylist`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MusicQuizPlaylistTrack` ADD CONSTRAINT `MusicQuizPlaylistTrack_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `MusicQuizPlaylist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MusicQuizPlaylistTrack` ADD CONSTRAINT `MusicQuizPlaylistTrack_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `MusicQuizTrack`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
