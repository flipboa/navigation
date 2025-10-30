-- =====================================================
-- 设置管理员用户脚本
-- =====================================================
-- 功能: 将 king(flipboa@163.com) 设置为管理员账户
-- 创建时间: 2024年
-- =====================================================

-- 更新 king 用户为管理员角色
UPDATE profiles 
SET 
  role = 'admin',
  updated_at = NOW()
WHERE 
  email = 'flipboa@163.com' 
  AND nickname = 'king';

-- 验证更新结果
SELECT 
  id,
  nickname,
  email,
  role,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'flipboa@163.com';

-- 如果用户不存在，显示错误信息
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'flipboa@163.com') THEN
    RAISE NOTICE '错误: 用户 flipboa@163.com 不存在于 profiles 表中';
  ELSE
    RAISE NOTICE '成功: 用户 king(flipboa@163.com) 已设置为管理员';
  END IF;
END $$;