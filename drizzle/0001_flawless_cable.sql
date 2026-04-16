CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_code` text NOT NULL,
	`name` text NOT NULL,
	`model` text,
	`serial_number` text,
	`category` text,
	`purchase_date` text NOT NULL,
	`supplier` text,
	`purchase_cost` real NOT NULL,
	`location` text,
	`workstation` text,
	`power_kw` real,
	`capacity` text,
	`technical_specs` text,
	`useful_life_years` integer NOT NULL,
	`salvage_value` real DEFAULT 0,
	`depreciation_method` text DEFAULT 'straight_line',
	`warranty_until` text,
	`status` text DEFAULT 'operational',
	`qr_code` text,
	`notes` text,
	`photo_url` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_asset_code_unique` ON `assets` (`asset_code`);--> statement-breakpoint
CREATE TABLE `downtime_work_order_impact` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`maintenance_log_id` integer,
	`work_order` text NOT NULL,
	`delayed_by_hours` real,
	`qty_impact` real,
	FOREIGN KEY (`maintenance_log_id`) REFERENCES `maintenance_logs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `maintenance_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`duration_hours` real NOT NULL,
	`mechanic_id` text NOT NULL,
	`mechanic_name` text NOT NULL,
	`mechanic_hourly_rate` real,
	`mechanic_cost` real,
	`maintenance_type` text NOT NULL,
	`reason` text NOT NULL,
	`work_done` text,
	`resolution_status` text NOT NULL,
	`parts_cost` real DEFAULT 0,
	`total_cost` real NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`cost_classification` text DEFAULT 'operating_expense',
	`notes` text,
	`attachments` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `maintenance_parts_used` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`maintenance_log_id` integer,
	`part_name` text NOT NULL,
	`part_code` text,
	`qty` real NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`source_warehouse` text,
	`stock_entry_name` text,
	FOREIGN KEY (`maintenance_log_id`) REFERENCES `maintenance_logs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mechanics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` text NOT NULL,
	`employee_name` text NOT NULL,
	`hourly_rate` real NOT NULL,
	`specialization` text,
	`certifications` text,
	`active` integer DEFAULT 1,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mechanics_employee_id_unique` ON `mechanics` (`employee_id`);--> statement-breakpoint
CREATE TABLE `oee_measurements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer,
	`date` text NOT NULL,
	`planned_production_time_hours` real,
	`downtime_hours` real DEFAULT 0,
	`actual_qty` real,
	`capacity_per_hour` real,
	`good_qty` real,
	`total_qty` real,
	`availability_pct` real,
	`performance_pct` real,
	`quality_pct` real,
	`oee_pct` real,
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `preventive_maintenance_schedule` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer,
	`task_name` text NOT NULL,
	`task_description` text,
	`frequency_type` text NOT NULL,
	`frequency_value` integer NOT NULL,
	`estimated_duration_hours` real,
	`required_parts` text,
	`last_performed` text,
	`next_due` text NOT NULL,
	`assigned_mechanic` text,
	`active` integer DEFAULT 1,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `spare_parts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_code` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`compatible_assets` text,
	`current_stock` real DEFAULT 0,
	`min_stock` real DEFAULT 0,
	`reorder_qty` real,
	`last_purchase_price` real,
	`preferred_supplier` text,
	`storage_location` text,
	`active` integer DEFAULT 1,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spare_parts_part_code_unique` ON `spare_parts` (`part_code`);