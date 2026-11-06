CREATE TABLE `ai_access_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`password_version` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_access_expiry_idx` ON `ai_access_sessions` (`expires_at`);