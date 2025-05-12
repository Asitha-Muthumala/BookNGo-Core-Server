-- CreateTable
CREATE TABLE `Tourist` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- CreateTable
CREATE TABLE `TouristEventBooking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `touristId` INTEGER NOT NULL,
    `eventId` INTEGER NOT NULL,
    `priceCategoryId` INTEGER NOT NULL,
    `paymentAmount` DOUBLE NOT NULL,
    `ticketCount` INTEGER NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isRefunded` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tourist` ADD CONSTRAINT `Tourist_id_fkey` FOREIGN KEY (`id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TouristEventBooking` ADD CONSTRAINT `TouristEventBooking_touristId_fkey` FOREIGN KEY (`touristId`) REFERENCES `Tourist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TouristEventBooking` ADD CONSTRAINT `TouristEventBooking_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TouristEventBooking` ADD CONSTRAINT `TouristEventBooking_priceCategoryId_fkey` FOREIGN KEY (`priceCategoryId`) REFERENCES `PriceCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;



