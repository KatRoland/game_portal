-- DropForeignKey
ALTER TABLE `KaraokeSong` DROP FOREIGN KEY `KaraokeSong_playlistId_fkey`;

-- DropForeignKey
ALTER TABLE `KaraokeSongLyrics` DROP FOREIGN KEY `KaraokeSongLyrics_segmentId_fkey`;

-- DropForeignKey
ALTER TABLE `KaraokeSongSegment` DROP FOREIGN KEY `KaraokeSongSegment_songId_fkey`;

-- AddForeignKey
ALTER TABLE `KaraokeSong` ADD CONSTRAINT `KaraokeSong_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `KaraokePlaylist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KaraokeSongSegment` ADD CONSTRAINT `KaraokeSongSegment_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `KaraokeSong`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KaraokeSongLyrics` ADD CONSTRAINT `KaraokeSongLyrics_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `KaraokeSongSegment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
