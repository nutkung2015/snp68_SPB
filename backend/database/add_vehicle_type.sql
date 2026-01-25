-- Migration: Add vehicle type column to project_vehicles table
-- Vehicle types: 'car' (รถยนต์), 'motorcycle' (มอไซค์)
-- Run this SQL to add the type column

ALTER TABLE project_vehicles 
ADD COLUMN type ENUM('car', 'motorcycle') DEFAULT 'car' COMMENT 'ประเภทรถ: car=รถยนต์, motorcycle=มอไซค์' AFTER plate_number;

-- Update existing records to have default type if needed
-- UPDATE project_vehicles SET type = 'car' WHERE type IS NULL;
