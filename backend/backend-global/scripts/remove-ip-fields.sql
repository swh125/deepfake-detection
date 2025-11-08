-- 删除 ip_records 表中不需要的字段
-- 执行此脚本前，请确保代码中已经不再使用这些字段

-- 删除 region_name 字段
ALTER TABLE ip_records
DROP COLUMN IF EXISTS region_name;

-- 删除 city 字段
ALTER TABLE ip_records
DROP COLUMN IF EXISTS city;

-- 删除 latitude 字段
ALTER TABLE ip_records
DROP COLUMN IF EXISTS latitude;

-- 删除 longitude 字段
ALTER TABLE ip_records
DROP COLUMN IF EXISTS longitude;

-- 验证：查看表结构（可选）
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'ip_records';







