ALTER TABLE `shops` ADD `customerNotifications` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `pricingTier` varchar(80) DEFAULT 'Normal + Premium' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `lastBackupAt` timestamp;