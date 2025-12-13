-- Add columns to existing projects table
-- Run this SQL to add project_detail_file_url, rules_file_url, and updated_at columns

ALTER TABLE projects 
ADD COLUMN project_detail_file_url VARCHAR(500) DEFAULT NULL COMMENT 'URL to project detail PDF file' AFTER common_fee_info,
ADD COLUMN rules_file_url VARCHAR(500) DEFAULT NULL COMMENT 'URL to project rules PDF file' AFTER project_detail_file_url,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER rules_file_url;
