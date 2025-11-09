# 删除 CloudBase 中的 IP 记录字段

由于 CloudBase 是 NoSQL 数据库，无法直接删除字段。但代码已经不再保存这些字段，所以：

1. **新插入的记录**：不会包含 `region_name`、`city`、`latitude`、`longitude` 字段
2. **旧记录**：这些字段可能仍然存在，但会被忽略

如果需要清理旧记录，可以：
- 在 CloudBase 控制台手动删除包含这些字段的记录
- 或者保留旧记录（不影响功能）

## 当前保存的字段

- `_id` (自动生成)
- `ip_address`
- `country`
- `is_china`
- `detected_at`
- `source`

## 已移除的字段

- `region_name` ❌
- `city` ❌
- `latitude` ❌
- `longitude` ❌












