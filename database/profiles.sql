-- =====================================================
-- AI工具目录项目 - 用户profiles表完整设计脚本
-- =====================================================
-- 版本: 3.0 (统一合并版本)
-- 创建时间: 2024年
-- 数据库: Supabase PostgreSQL
-- 
-- 本脚本合并了schema.sql和profiles_table.sql的内容
-- 提供了完整的profiles表设计方案，包括：
-- 1. 表结构创建
-- 2. 索引优化
-- 3. 安全策略配置
-- 4. 触发器和函数
-- 5. UPSERT功能
-- 6. 数据清理和验证
-- =====================================================

-- =====================================================
-- 第一步: 清理现有资源 (避免冲突)
-- =====================================================

-- 1.1 删除可能存在的旧函数 (解决返回类型冲突)
DROP FUNCTION IF EXISTS upsert_profile(character varying, uuid, character varying);
DROP FUNCTION IF EXISTS upsert_profile(varchar, uuid, varchar);

-- 1.2 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- 1.3 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 1.4 删除可能存在的旧函数
DROP FUNCTION IF EXISTS update_updated_at_column();

-- =====================================================
-- 第二步: 创建表结构
-- =====================================================

-- 2.1 创建profiles表 (如果不存在)
-- 存储用户的基本信息，包括昵称、邮箱等
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =====================================================
-- 第三步: 配置安全策略
-- =====================================================

-- 3.1 启用行级安全策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3.2 创建RLS策略
-- 用户只能查看自己的profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 用户只能修改自己的profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 允许插入profile数据（注册时使用）
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 第四步: 数据清理 (生产环境谨慎使用)
-- =====================================================

-- 4.1 清理可能存在的重复数据
-- 删除重复的profile记录，只保留最新的
DO $$
BEGIN
  -- 检查表是否存在数据
  IF EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    WITH duplicates AS (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
      FROM profiles
    )
    DELETE FROM profiles 
    WHERE id IN (
      SELECT id FROM duplicates WHERE rn > 1
    );
    
    RAISE NOTICE '重复数据清理完成';
  ELSE
    RAISE NOTICE '表中无数据，跳过清理步骤';
  END IF;
END $$;

-- =====================================================
-- 第五步: 创建触发器函数
-- =====================================================

-- 5.1 创建自动更新updated_at字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 创建触发器
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 第六步: 创建UPSERT函数 (核心功能)
-- =====================================================

-- 6.1 创建upsert_profile函数
-- 重要说明:
-- - 参数顺序: user_email, user_id, user_nickname (与前端调用顺序一致)
-- - 返回列名使用profile_前缀避免歧义
-- - 使用CTE避免列引用冲突
-- - 明确指定表别名避免歧义
CREATE OR REPLACE FUNCTION upsert_profile(
  user_email VARCHAR(255),    -- 参数1: 用户邮箱
  user_id UUID,              -- 参数2: 用户ID (来自auth.users)
  user_nickname VARCHAR(50)   -- 参数3: 用户昵称
)
RETURNS TABLE(
  profile_id UUID, 
  profile_nickname VARCHAR(50), 
  profile_email VARCHAR(255), 
  profile_created_at TIMESTAMPTZ, 
  profile_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- 使用CTE和明确的列别名避免歧义
  RETURN QUERY
  WITH upsert_result AS (
    INSERT INTO profiles (id, nickname, email)
    VALUES (user_id, user_nickname, user_email)
    ON CONFLICT (id) 
    DO UPDATE SET 
      nickname = EXCLUDED.nickname,
      email = EXCLUDED.email,
      updated_at = NOW()
    RETURNING 
      profiles.id, 
      profiles.nickname, 
      profiles.email, 
      profiles.created_at, 
      profiles.updated_at
  )
  SELECT 
    upsert_result.id as profile_id,
    upsert_result.nickname as profile_nickname,
    upsert_result.email as profile_email,
    upsert_result.created_at as profile_created_at,
    upsert_result.updated_at as profile_updated_at
  FROM upsert_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 第七步: 创建查询辅助函数
-- =====================================================

-- 7.1 获取用户profile信息的函数
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE(
  profile_id UUID,
  profile_nickname VARCHAR(50),
  profile_email VARCHAR(255),
  profile_created_at TIMESTAMPTZ,
  profile_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.nickname as profile_nickname,
    p.email as profile_email,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at
  FROM profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 检查昵称是否可用的函数
CREATE OR REPLACE FUNCTION is_nickname_available(check_nickname VARCHAR(50), exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE nickname = check_nickname 
    AND (exclude_user_id IS NULL OR id != exclude_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 第八步: 权限设置
-- =====================================================

-- 8.1 授予认证用户执行函数的权限
GRANT EXECUTE ON FUNCTION upsert_profile(VARCHAR(255), UUID, VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_nickname_available(VARCHAR(50), UUID) TO authenticated;

-- 8.2 授予更新触发器函数的权限
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- =====================================================
-- 第九步: 验证和测试
-- =====================================================

-- 9.1 验证表结构
DO $$
BEGIN
  RAISE NOTICE '=== Profiles表结构验证 ===';
END $$;

SELECT 
  '表结构验证' as check_type,
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 9.2 验证索引
SELECT 
  '索引验证' as check_type,
  indexname as index_name,
  tablename as table_name
FROM pg_indexes 
WHERE tablename = 'profiles';

-- 9.3 验证函数
SELECT 
  '函数验证' as check_type,
  routine_name as function_name,
  routine_type as function_type
FROM information_schema.routines 
WHERE routine_name IN ('upsert_profile', 'get_user_profile', 'is_nickname_available');

-- 9.4 验证RLS策略
SELECT 
  '安全策略验证' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 9.5 检查现有数据
SELECT 
  '数据统计' as check_type,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT id) as unique_ids,
  COALESCE(MAX(created_at)::text, '无数据') as latest_profile
FROM profiles;

-- =====================================================
-- 第十步: 注释和使用说明
-- =====================================================

COMMENT ON TABLE profiles IS 'AI工具目录用户资料表，存储用户基本信息';
COMMENT ON COLUMN profiles.id IS '用户ID，关联auth.users表';
COMMENT ON COLUMN profiles.nickname IS '用户昵称，全局唯一';
COMMENT ON COLUMN profiles.email IS '用户邮箱地址';
COMMENT ON COLUMN profiles.created_at IS '创建时间';
COMMENT ON COLUMN profiles.updated_at IS '最后更新时间';

COMMENT ON FUNCTION upsert_profile(VARCHAR(255), UUID, VARCHAR(50)) IS '创建或更新用户资料信息';
COMMENT ON FUNCTION get_user_profile(UUID) IS '获取指定用户的资料信息';
COMMENT ON FUNCTION is_nickname_available(VARCHAR(50), UUID) IS '检查昵称是否可用';
COMMENT ON FUNCTION update_updated_at_column() IS '自动更新updated_at字段的触发器函数';

-- =====================================================
-- 使用说明和示例
-- =====================================================

/*
=== 前端调用示例 ===

1. 创建或更新用户资料:
const { data, error } = await supabase.rpc('upsert_profile', {
  user_email: 'user@example.com',
  user_id: 'uuid-from-auth',
  user_nickname: 'username'
});

2. 获取用户资料:
const { data, error } = await supabase.rpc('get_user_profile', {
  user_id: 'uuid-from-auth'
});

3. 检查昵称是否可用:
const { data, error } = await supabase.rpc('is_nickname_available', {
  check_nickname: 'desired_nickname',
  exclude_user_id: 'current_user_uuid' // 可选，用于更新时排除自己
});

4. 直接查询（需要RLS权限）:
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

=== 注意事项 ===

1. user_id必须是auth.users表中存在的有效UUID
2. nickname必须唯一，违反约束会返回错误
3. 函数返回的列名带有profile_前缀避免歧义
4. RLS策略确保用户只能访问自己的数据
5. 所有时间字段使用TIMESTAMPTZ类型支持时区

=== 常见问题解决 ===

1. "column reference ambiguous" -> 已通过CTE和明确列别名解决
2. "cannot change return type" -> 已通过DROP FUNCTION解决
3. "foreign key constraint" -> 确保user_id在auth.users中存在
4. "duplicate key value" -> 已通过ON CONFLICT处理
5. "permission denied" -> 检查RLS策略和函数权限

=== 维护建议 ===

1. 定期检查数据一致性
2. 监控函数执行性能
3. 根据需要调整索引策略
4. 备份重要的用户数据
5. 定期更新安全策略

=== 扩展建议 ===

1. 添加用户头像字段
2. 添加用户偏好设置
3. 添加用户等级系统
4. 添加用户活动日志
5. 集成第三方认证
*/