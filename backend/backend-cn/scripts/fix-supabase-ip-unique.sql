-- 为Supabase的ip_records表添加UNIQUE约束
-- 这样upsert才能正常工作

-- 先删除可能的重复记录（保留最新的）
DELETE FROM ip_records
WHERE id NOT IN (
    SELECT MAX(id)
    FROM ip_records
    GROUP BY ip_address
);

-- 添加UNIQUE约束
ALTER TABLE ip_records
ADD CONSTRAINT ip_records_ip_address_unique UNIQUE (ip_address);

-- 如果添加约束失败（可能已存在），则忽略错误
-- 或者先检查是否存在：
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'ip_records' AND constraint_name = 'ip_records_ip_address_unique';















