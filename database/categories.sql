-- =====================================================
-- AI工具目录项目 - 分类表创建脚本
-- =====================================================
-- 版本: 1.0
-- 创建时间: 2024年
-- 数据库: Supabase PostgreSQL
-- 
-- 功能说明:
-- 1. 存储AI工具的分类信息（如AI写作、图像生成等）
-- 2. 支持分类的层级结构
-- 3. 包含分类图标和排序功能
-- 4. 实现RLS行级安全策略
-- =====================================================

-- =====================================================
-- 第一步: 清理现有资源 (避免冲突)
-- =====================================================

-- 删除可能存在的旧触发器和函数
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP FUNCTION IF EXISTS update_categories_updated_at_column();

-- =====================================================
-- 第二步: 创建分类表结构
-- =====================================================

-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
  -- 主键ID，使用UUID
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 分类标识符，用于URL和代码中引用
  slug VARCHAR(50) UNIQUE NOT NULL,
  
  -- 分类名称
  name VARCHAR(100) NOT NULL,
  
  -- 分类描述
  description TEXT,
  
  -- 分类图标（可以是emoji或图标类名）
  icon VARCHAR(50),
  
  -- 分类颜色（用于UI显示）
  color VARCHAR(20) DEFAULT '#6366f1',
  
  -- 父分类ID（支持层级分类）
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- 排序权重（数字越小越靠前）
  sort_order INTEGER DEFAULT 0,
  
  -- 是否启用
  is_active BOOLEAN DEFAULT true,
  
  -- 是否在首页显示
  show_on_homepage BOOLEAN DEFAULT true,
  
  -- 分类下的工具数量（冗余字段，用于性能优化）
  tools_count INTEGER DEFAULT 0,
  
  -- 创建时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 更新时间
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 创建者ID
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- 第三步: 创建索引
-- =====================================================

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_show_on_homepage ON categories(show_on_homepage);
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(created_at);

-- =====================================================
-- 第四步: 配置RLS安全策略
-- =====================================================

-- 启用行级安全策略
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 策略1: 所有用户都可以查看启用的分类
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

-- 策略2: 管理员可以查看所有分类
CREATE POLICY "Admins can view all categories" ON categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 策略3: 管理员可以插入分类
CREATE POLICY "Admins can insert categories" ON categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 策略4: 管理员可以更新分类
CREATE POLICY "Admins can update categories" ON categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 策略5: 管理员可以删除分类
CREATE POLICY "Admins can delete categories" ON categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 第五步: 创建触发器和函数
-- =====================================================

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION update_categories_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories
  FOR EACH ROW 
  EXECUTE FUNCTION update_categories_updated_at_column();

-- =====================================================
-- 第六步: 插入初始数据
-- =====================================================

-- 插入默认分类数据
INSERT INTO categories (slug, name, description, icon, sort_order, show_on_homepage) VALUES
  ('writing', 'AI写作', 'AI驱动的写作和文本生成工具', '✍️', 1, true),
  ('image', '图像生成', 'AI图像创作和编辑工具', '🖼️', 2, true),
  ('video', '视频制作', 'AI视频生成和编辑工具', '🎬', 3, true),
  ('audio', '语音处理', 'AI语音合成和处理工具', '🎵', 4, true),
  ('coding', '代码开发', 'AI编程和开发辅助工具', '💻', 5, true),
  ('design', '设计工具', 'AI设计和创意工具', '🎨', 6, true),
  ('productivity', '效率工具', 'AI效率和办公工具', '⚡', 7, true),
  ('education', '教育学习', 'AI教育和学习工具', '📚', 8, true),
  ('business', '商业应用', 'AI商业和企业应用', '💼', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 第七步: 创建视图和函数
-- =====================================================

-- 创建分类统计视图
CREATE OR REPLACE VIEW categories_with_stats AS
SELECT 
  c.*,
  COALESCE(t.tools_count, 0) as actual_tools_count
FROM categories c
LEFT JOIN (
  SELECT 
    category_id,
    COUNT(*) as tools_count
  FROM tools 
  WHERE status = 'published'
  GROUP BY category_id
) t ON c.id = t.category_id
WHERE c.is_active = true
ORDER BY c.sort_order;

-- 创建获取分类层级的函数
CREATE OR REPLACE FUNCTION get_category_hierarchy(category_uuid UUID)
RETURNS TABLE (
  id UUID,
  slug VARCHAR,
  name VARCHAR,
  level INTEGER
) AS $$
WITH RECURSIVE category_tree AS (
  -- 基础查询：选择指定的分类
  SELECT 
    c.id,
    c.slug,
    c.name,
    0 as level,
    c.parent_id
  FROM categories c
  WHERE c.id = category_uuid
  
  UNION ALL
  
  -- 递归查询：查找父分类
  SELECT 
    c.id,
    c.slug,
    c.name,
    ct.level + 1,
    c.parent_id
  FROM categories c
  INNER JOIN category_tree ct ON c.id = ct.parent_id
)
SELECT 
  ct.id,
  ct.slug,
  ct.name,
  ct.level
FROM category_tree ct
ORDER BY ct.level DESC;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- 完成提示
-- =====================================================

-- 添加注释
COMMENT ON TABLE categories IS 'AI工具分类表，存储工具的分类信息';
COMMENT ON COLUMN categories.slug IS '分类标识符，用于URL';
COMMENT ON COLUMN categories.name IS '分类显示名称';
COMMENT ON COLUMN categories.parent_id IS '父分类ID，支持层级分类';
COMMENT ON COLUMN categories.sort_order IS '排序权重，数字越小越靠前';
COMMENT ON COLUMN categories.tools_count IS '分类下的工具数量（冗余字段）';

-- 输出创建完成信息
DO $$
BEGIN
  RAISE NOTICE '=== 分类表创建完成 ===';
  RAISE NOTICE '表名: categories';
  RAISE NOTICE '功能: 存储AI工具分类信息';
  RAISE NOTICE '安全: 已启用RLS策略';
  RAISE NOTICE '数据: 已插入9个默认分类';
END $$;