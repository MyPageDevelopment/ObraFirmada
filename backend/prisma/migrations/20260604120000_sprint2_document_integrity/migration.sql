-- CreateTable
CREATE TABLE `EquipmentDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `rut` VARCHAR(12) NOT NULL,
    `workerFullName` VARCHAR(160) NOT NULL,
    `equipmentItems` JSON NOT NULL,
    `signatureBase64` LONGTEXT NOT NULL,
    `deliveredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `biometricValidatedAt` DATETIME(3) NULL,
    `signedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EquipmentDelivery_userId_idx`(`userId`),
    INDEX `EquipmentDelivery_rut_idx`(`rut`),
    INDEX `EquipmentDelivery_deliveredAt_idx`(`deliveredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentIntegrity` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentDeliveryId` VARCHAR(191) NOT NULL,
    `algorithm` VARCHAR(20) NOT NULL DEFAULT 'SHA-256',
    `sha256` CHAR(64) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DocumentIntegrity_equipmentDeliveryId_key`(`equipmentDeliveryId`),
    INDEX `DocumentIntegrity_sha256_idx`(`sha256`),
    INDEX `DocumentIntegrity_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EquipmentDelivery` ADD CONSTRAINT `EquipmentDelivery_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentIntegrity` ADD CONSTRAINT `DocumentIntegrity_equipmentDeliveryId_fkey` FOREIGN KEY (`equipmentDeliveryId`) REFERENCES `EquipmentDelivery`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;