CREATE TABLE `custom_capabilities` (
	`id` text PRIMARY KEY NOT NULL,
	`module` text NOT NULL,
	`label_key` text NOT NULL,
	`scope_dim` text,
	`tenant` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `downtime_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`line_id` integer,
	`stop_code_id` integer,
	`duration_minutes` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`line_id`) REFERENCES `production_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stop_code_id`) REFERENCES `stop_codes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `energy_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`electricity_kwh` real,
	`gas_m3` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `energy_logs_date_unique` ON `energy_logs` (`date`);--> statement-breakpoint
CREATE TABLE `permission_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event` text NOT NULL,
	`tenant` text NOT NULL,
	`user_email` text NOT NULL,
	`capability_id` text NOT NULL,
	`scope_dim` text,
	`scope_value` text,
	`actor_email` text NOT NULL,
	`occurred_at` text DEFAULT (CURRENT_TIMESTAMP),
	`details` text
);
--> statement-breakpoint
CREATE TABLE `permission_audit_dryrun` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant` text NOT NULL,
	`user_email` text NOT NULL,
	`capability_id` text NOT NULL,
	`scope_dim` text,
	`scope_value` text,
	`action_name` text NOT NULL,
	`occurred_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `production_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer
);
--> statement-breakpoint
CREATE TABLE `production_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`shift` text,
	`line_id` integer,
	`product_id` integer,
	`actual_output` integer NOT NULL,
	`total_hours` real NOT NULL,
	`planned_stop_hours` real DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`line_id`) REFERENCES `production_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`unit` text,
	`nominal_speed` integer NOT NULL,
	`weight_kg` real,
	`pieces_per_box` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);--> statement-breakpoint
CREATE TABLE `role_template_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` text NOT NULL,
	`capability_id` text NOT NULL,
	`default_scope_dim` text NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `role_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `role_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `stop_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name_uz` text NOT NULL,
	`category` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stop_codes_code_unique` ON `stop_codes` (`code`);--> statement-breakpoint
CREATE TABLE `user_capabilities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant` text NOT NULL,
	`user_email` text NOT NULL,
	`capability_id` text NOT NULL,
	`scope_dim` text NOT NULL,
	`scope_value` text NOT NULL,
	`granted_by` text NOT NULL,
	`granted_at` text DEFAULT (CURRENT_TIMESTAMP)
);
