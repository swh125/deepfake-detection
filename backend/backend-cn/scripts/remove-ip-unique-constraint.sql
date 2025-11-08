-- 移除ip_records表的UNIQUE约束，允许保存历史记录
-- 适用于Supabase (PostgreSQL)

-- 检查并移除UNIQUE约束
DO $$
BEGIN
    -- 检查约束是否存在
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'ip_records' 
        AND constraint_name = 'ip_records_ip_address_unique'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- 移除UNIQUE约束
        ALTER TABLE ip_records
        DROP CONSTRAINT ip_records_ip_address_unique;
        
        RAISE NOTICE '✅ 已移除UNIQUE约束: ip_records_ip_address_unique';
    ELSE
        RAISE NOTICE 'ℹ️ UNIQUE约束不存在，无需移除';
    END IF;
END $$;

-- 验证约束已移除
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'ip_records' 
AND constraint_type = 'UNIQUE';







