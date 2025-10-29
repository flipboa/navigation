-- =====================================================
-- 初始化缺失的数据库函数
-- =====================================================
-- 此脚本专门用于创建可能缺失的 get_user_profile 函数
-- 请在 Supabase SQL 编辑器中执行此脚本

-- 删除可能存在的旧函数（避免冲突）
DROP FUNCTION IF EXISTS get_user_profile(UUID);

-- 创建 get_user_profile 函数
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE(
  profile_id UUID,
  profile_nickname VARCHAR(50),
  profile_email VARCHAR(255),
  profile_role VARCHAR(20),
  profile_created_at TIMESTAMPTZ,
  profile_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.nickname as profile_nickname,
    p.email as profile_email,
    p.role as profile_role,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at
  FROM profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予认证用户执行函数的权限
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- 验证函数是否创建成功
SELECT 
  'get_user_profile 函数验证' as check_type,
  routine_name as function_name,
  routine_type as function_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'get_user_profile';

-- 显示成功消息
DO $$
BEGIN
  RAISE NOTICE 'get_user_profile 函数已成功创建！';
END $$;