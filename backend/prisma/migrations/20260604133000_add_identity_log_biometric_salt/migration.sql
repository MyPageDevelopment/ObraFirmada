-- AlterTable
ALTER TABLE `IdentityLog` ADD COLUMN `biometricSalt` CHAR(32) NOT NULL DEFAULT '' AFTER `encryptedBiometricVector`;