CREATE TABLE `ai_ledger` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	CONSTRAINT "ai_ledger_singleton" CHECK("ai_ledger"."id" = 1)
);
