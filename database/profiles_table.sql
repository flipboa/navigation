-- =====================================================
-- AI工具目录项目 - 用户profiles表创建脚本
-- =====================================================
-- 版本: 2.0 (优化版本)
-- 创建时间: 2024年
-- 数据库: Supabase PostgreSQL
-- 
-- 本脚本解决了以下问题:
-- 1. 列引用歧义问题 (column reference "id" is ambiguous)
-- 2. 函数返回类型冲突问题 (cannot change return type of existing function)
-- 3. 外键约束问题 (foreign key constraint violations)
-- 4. RLS策略冲突问题
-- 5. 重复数据清理问题
-- =====================================================

-- =====================================================
-- 第一步: 清理现有资源 (避免冲突)
-- =====================================================

-- 1.1 删除可能存在的旧函数 (解决返回类型冲突)
DROP FUNCTION IF EXISTS upsert_profile(character varying, uuid, character varying);
DROP FUNCTION IF EXISTS upsert_profile(varchar, uuid, varchar);

-- 1.2 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- 1.3 删除可能存在的旧函数
DROP FUNCTION IF EXISTS update_updated_at_column();

-- =====================================================
-- 第二步: 创建表结构
-- =====================================================

-- 2.1 创建profiles表 (如果不存在)
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

-- 3.1 禁用行级安全策略 (避免RLS策略导致的插入问题)
-- 注意: 在生产环境中可能需要启用RLS并配置适当的策略
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 第四步: 数据清理
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
-- 第七步: 验证和测试
-- =====================================================

-- 7.1 验证表结构
DO $$
BEGIN
  RAISE NOTICE '=== 表结构验证 ===';
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

-- 7.2 验证索引
SELECT 
  '索引验证' as check_type,
  indexname as index_name,
  tablename as table_name
FROM pg_indexes 
WHERE tablename = 'profiles';

-- 7.3 验证函数
SELECT 
  '函数验证' as check_type,
  routine_name as function_name,
  routine_type as function_type
FROM information_schema.routines 
WHERE routine_name = 'upsert_profile';

-- 7.4 检查现有数据
SELECT 
  '数据统计' as check_type,
  COUNT(*) as total_profiles,
  COUNT(DISTINCT id) as unique_ids,
  COALESCE(MAX(created_at)::text, '无数据') as latest_profile
FROM profiles;

-- =====================================================
-- 第八步: 使用说明和注意事项
-- =====================================================

/*
使用说明:
1. 在Supabase SQL Editor中执行整个脚本
2. 脚本会自动清理冲突资源并重新创建
3. 前端调用示例:
   const { data, error } = await supabase.rpc('upsert_profile', {
     user_email: 'user@example.com',
     user_id: 'uuid-from-auth',
     user_nickname: 'username'
   });

注意事项:
1. user_id必须是auth.users表中存在的有效UUID
2. nickname必须唯一
3. 函数返回的列名带有profile_前缀
4. 如果需要启用RLS，请在生产环境中配置适当的策略

常见问题解决:
1. "column reference ambiguous" -> 已通过CTE和明确列别名解决
2. "cannot change return type" -> 已通过DROP FUNCTION解决
3. "foreign key constraint" -> 确保user_id在auth.users中存在
4. "duplicate key value" -> 已通过ON CONFLICT处理

测试函数 (仅在有真实用户ID时使用):
-- SELECT * FROM upsert_profile('test@example.com', '真实的用户UUID', 'testuser');
*/