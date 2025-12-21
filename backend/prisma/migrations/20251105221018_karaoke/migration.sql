-- CreateTable
CREATE TABLE `KaraokePlaylist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KaraokeSong` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `playlistId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KaraokeSongSegment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `index` INTEGER NOT NULL,
    `songId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KaraokeSongLyrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `index` INTEGER NOT NULL,
    `lyrics` VARCHAR(191) NOT NULL,
    `time` INTEGER NOT NULL,
    `segmentId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KaraokeSong` ADD CONSTRAINT `KaraokeSong_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `KaraokePlaylist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KaraokeSongSegment` ADD CONSTRAINT `KaraokeSongSegment_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `KaraokeSong`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KaraokeSongLyrics` ADD CONSTRAINT `KaraokeSongLyrics_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `KaraokeSongSegment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
