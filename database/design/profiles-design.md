# Profiles表设计文档

## 概述

`profiles`表是AI工具目录项目的核心用户数据表，用于存储用户的基本资料信息。该表与Supabase的`auth.users`表紧密集成，提供用户认证后的扩展信息存储。

## 表结构

### 基本信息
- **表名**: `profiles`
- **主键**: `id` (UUID)
- **外键**: `id` → `auth.users(id)`
- **索引**: 昵称索引、邮箱索引
- **RLS**: 启用行级安全策略

### 字段定义

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | - | 用户唯一标识符，关联认证系统 |
| `nickname` | VARCHAR(50) | UNIQUE NOT NULL | - | 用户昵称，全局唯一 |
| `email` | VARCHAR(255) | NOT NULL | - | 用户邮箱地址 |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | 记录创建时间 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | 记录最后更新时间 |

## 安全策略 (RLS)

### 策略概述
- **启用状态**: 已启用行级安全策略
- **访问原则**: 用户只能访问自己的资料数据
- **管理权限**: 管理员可以查看所有用户资料

### 具体策略

#### 1. 查看权限
```sql
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
```
- **适用操作**: SELECT
- **权限范围**: 用户只能查看自己的资料

#### 2. 更新权限
```sql
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```
- **适用操作**: UPDATE
- **权限范围**: 用户只能修改自己的资料

#### 3. 插入权限
```sql
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```
- **适用操作**: INSERT
- **权限范围**: 用户只能创建自己的资料记录

## 性能优化

### 索引策略

#### 1. 昵称索引
```sql
CREATE INDEX idx_profiles_nickname ON profiles(nickname);
```
- **用途**: 昵称唯一性检查和搜索
- **查询类型**: 精确匹配、唯一性验证

#### 2. 邮箱索引
```sql
CREATE INDEX idx_profiles_email ON profiles(email);
```
- **用途**: 邮箱查询和验证
- **查询类型**: 精确匹配、用户查找

### 触发器

#### 自动更新时间戳
```sql
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```
- **功能**: 自动更新`updated_at`字段
- **触发时机**: 每次UPDATE操作前

## 核心业务逻辑

### UPSERT功能

#### 主要函数
```sql
upsert_profile(user_email VARCHAR(255), user_id UUID, user_nickname VARCHAR(50))
```

**功能特性**:
- 创建新用户资料或更新现有资料
- 处理昵称冲突和数据验证
- 返回标准化的资料信息
- 支持事务安全操作

**返回字段**:
- `profile_id`: 用户ID
- `profile_nickname`: 用户昵称
- `profile_email`: 用户邮箱
- `profile_created_at`: 创建时间
- `profile_updated_at`: 更新时间

### 辅助函数

#### 1. 获取用户资料
```sql
get_user_profile(user_id UUID)
```
- **功能**: 获取指定用户的完整资料信息
- **权限**: 需要认证用户权限
- **返回**: 标准化的用户资料数据

#### 2. 昵称可用性检查
```sql
is_nickname_available(check_nickname VARCHAR(50), exclude_user_id UUID)
```
- **功能**: 检查昵称是否可用
- **参数**: 待检查昵称、排除的用户ID（可选）
- **返回**: 布尔值表示可用性

## 数据流程

### 用户注册流程
1. **认证系统**: 用户在`auth.users`中创建账户
2. **资料创建**: 调用`upsert_profile`函数创建用户资料
3. **数据验证**: 检查昵称唯一性和邮箱格式
4. **权限设置**: 自动应用RLS策略

### 资料更新流程
1. **身份验证**: 确认用户身份和权限
2. **数据验证**: 验证新数据的有效性
3. **冲突处理**: 处理昵称重复等冲突
4. **时间戳更新**: 自动更新`updated_at`字段

## 前端集成

### Supabase客户端调用

#### 创建/更新资料
```javascript
const { data, error } = await supabase.rpc('upsert_profile', {
  user_email: 'user@example.com',
  user_id: 'uuid-from-auth',
  user_nickname: 'username'
});
```

#### 获取用户资料
```javascript
const { data, error } = await supabase.rpc('get_user_profile', {
  user_id: 'uuid-from-auth'
});
```

#### 检查昵称可用性
```javascript
const { data, error } = await supabase.rpc('is_nickname_available', {
  check_nickname: 'desired_nickname',
  exclude_user_id: 'current_user_uuid' // 可选
});
```

#### 直接查询
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
```

## 常见查询

### 基础查询
```sql
-- 获取用户资料
SELECT * FROM profiles WHERE id = $1;

-- 检查昵称是否存在
SELECT EXISTS(SELECT 1 FROM profiles WHERE nickname = $1);

-- 获取用户统计
SELECT COUNT(*) as total_users FROM profiles;
```

### 管理查询
```sql
-- 最近注册的用户
SELECT nickname, email, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 昵称重复检查
SELECT nickname, COUNT(*) 
FROM profiles 
GROUP BY nickname 
HAVING COUNT(*) > 1;
```

## 使用示例

### 用户注册场景
```sql
-- 1. 用户在auth.users中注册
-- 2. 创建用户资料
SELECT * FROM upsert_profile(
  'user@example.com',
  '550e8400-e29b-41d4-a716-446655440000',
  'john_doe'
);
```

### 资料更新场景
```sql
-- 更新用户昵称
SELECT * FROM upsert_profile(
  'user@example.com',
  '550e8400-e29b-41d4-a716-446655440000',
  'new_nickname'
);
```

### 昵称验证场景
```sql
-- 检查昵称是否可用
SELECT is_nickname_available('desired_name');

-- 更新时排除自己
SELECT is_nickname_available('new_name', '550e8400-e29b-41d4-a716-446655440000');
```

## 维护指南

### 数据清理
```sql
-- 清理重复数据（谨慎使用）
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
  FROM profiles
)
DELETE FROM profiles WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

### 性能监控
```sql
-- 检查索引使用情况
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'profiles';

-- 检查表统计信息
SELECT n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
FROM pg_stat_user_tables 
WHERE relname = 'profiles';
```

### 备份建议
- 定期备份用户资料数据
- 监控数据一致性
- 检查外键约束完整性
- 验证RLS策略有效性

## 扩展建议

### 功能扩展
1. **用户头像**: 添加`avatar_url`字段存储头像链接
2. **用户偏好**: 添加`preferences`JSONB字段存储用户设置
3. **用户等级**: 添加`level`和`experience`字段
4. **社交信息**: 添加社交媒体链接字段
5. **地理位置**: 添加`location`和`timezone`字段

### 性能优化
1. **分区策略**: 按创建时间分区大表
2. **缓存策略**: 实现用户资料缓存
3. **索引优化**: 根据查询模式调整索引
4. **连接池**: 优化数据库连接管理

### 安全增强
1. **数据加密**: 敏感字段加密存储
2. **审计日志**: 记录资料修改历史
3. **访问控制**: 更细粒度的权限控制
4. **数据脱敏**: 开发环境数据脱敏

## 注意事项

### 重要约束
- `user_id`必须是`auth.users`表中存在的有效UUID
- `nickname`必须全局唯一，违反约束会返回错误
- 函数返回的列名带有`profile_`前缀避免歧义
- RLS策略确保用户只能访问自己的数据

### 常见问题
1. **列引用歧义**: 已通过CTE和明确列别名解决
2. **返回类型冲突**: 已通过DROP FUNCTION解决
3. **外键约束**: 确保user_id在auth.users中存在
4. **重复键值**: 已通过ON CONFLICT处理
5. **权限拒绝**: 检查RLS策略和函数权限

### 最佳实践
- 使用函数进行数据操作而非直接SQL
- 定期检查数据一致性
- 监控函数执行性能
- 及时处理数据冲突
- 保持代码和文档同步

## 相关文档

- [Categories表设计](./categories-design.md)
- [Tools表设计](./tools-design.md)
- [Submissions表设计](./submissions-design.md)
- [存储桶设计](./storage-design.md)
- [数据库概览](./README.md)