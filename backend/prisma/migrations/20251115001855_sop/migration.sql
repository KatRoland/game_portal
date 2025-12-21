-- CreateTable
CREATE TABLE `SopPlaylist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SopPlaylist_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SopPlaylistItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `playlistId` INTEGER NOT NULL,

    INDEX `SopPlaylistItem_playlistId_idx`(`playlistId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SopPlaylistItem` ADD CONSTRAINT `SopPlaylistItem_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `SopPlaylist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
