# 删除 Supabase 数据库字段说明

## 需要删除的字段

- `region_name` (省份/州)
- `city` (城市)
- `latitude` (纬度)
- `longitude` (经度)

## 执行步骤

### 方法1：在 Supabase Dashboard 中执行

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目
3. 点击左侧菜单的 **SQL Editor**
4. 点击 **New query**
5. 复制 `remove-ip-fields.sql` 文件中的内容
6. 粘贴到 SQL Editor 中
7. 点击 **Run** 执行

### 方法2：使用 Supabase CLI

```bash
# 安装 Supabase CLI（如果还没有）
npm install -g supabase

# 登录
supabase login

# 链接到项目
supabase link --project-ref your-project-ref

# 执行SQL脚本
supabase db execute -f scripts/remove-ip-fields.sql
```

## SQL 脚本内容

```sql
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
```

## 验证

执行后，可以在 Supabase Dashboard 的 **Table Editor** 中查看 `ip_records` 表，确认这些字段已被删除。

或者执行以下SQL查询表结构：

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ip_records'
ORDER BY ordinal_position;
```

## 注意事项

⚠️ **删除字段是不可逆的操作！** 执行前请确保：
1. 代码中已经不再使用这些字段
2. 已经备份了重要数据（如果需要）
3. 确认这些字段确实不再需要

## 执行后的表结构

`ip_records` 表应该只包含以下字段：
- `id` (主键)
- `ip_address` (IP地址)
- `country` (国家代码)
- `is_china` (是否为中国)
- `detected_at` (检测时间)
- `source` (来源)
- `created_at` (创建时间，如果存在)







