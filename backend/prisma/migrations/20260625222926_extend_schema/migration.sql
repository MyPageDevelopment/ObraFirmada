-- AlterTable
ALTER TABLE `EquipmentDelivery` ADD COLUMN `isException` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `notificationStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `witnessFullName` VARCHAR(160) NULL,
    ADD COLUMN `witnessRut` VARCHAR(12) NULL,
    ADD COLUMN `witnessSignatureBase64` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `GroupTalk` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `speakerName` VARCHAR(160) NOT NULL,
    `heldAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GroupTalk_heldAt_idx`(`heldAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupTalkAttendee` (
    `id` VARCHAR(191) NOT NULL,
    `groupTalkId` VARCHAR(191) NOT NULL,
    `rut` VARCHAR(12) NOT NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `validatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `biometricType` VARCHAR(20) NOT NULL,
    `isException` BOOLEAN NOT NULL DEFAULT false,
    `witnessRut` VARCHAR(12) NULL,
    `witnessFullName` VARCHAR(160) NULL,
    `witnessSignatureBase64` LONGTEXT NULL,

    INDEX `GroupTalkAttendee_groupTalkId_idx`(`groupTalkId`),
    INDEX `GroupTalkAttendee_rut_idx`(`rut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GroupTalkAttendee` ADD CONSTRAINT `GroupTalkAttendee_groupTalkId_fkey` FOREIGN KEY (`groupTalkId`) REFERENCES `GroupTalk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
