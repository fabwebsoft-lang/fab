CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`deviceLabel` varchar(160) NOT NULL,
	`userAgent` text,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`role` enum('owner','worker') NOT NULL DEFAULT 'worker',
	`pinHash` varchar(128),
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `orderNumber` varchar(60) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `customerType` enum('Normal','Premium') DEFAULT 'Normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `address` varchar(320);--> statement-breakpoint
ALTER TABLE `customers` ADD `alternatePhone` varchar(40);--> statement-breakpoint
ALTER TABLE `customers` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `storedClothesCode` varchar(40) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `customerType` enum('Normal','Premium') DEFAULT 'Normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `advanceOption` enum('full','half','none','custom') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryType` enum('Shop Collection','Home Delivery');--> statement-breakpoint
ALTER TABLE `shops` ADD `shopCode` varchar(10) DEFAULT 'FC01' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_shop_code_idx` UNIQUE(`shopId`,`storedClothesCode`);--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_shopId_shops_id_fk` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workers` ADD CONSTRAINT `workers_shopId_shops_id_fk` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE no action ON UPDATE no action;