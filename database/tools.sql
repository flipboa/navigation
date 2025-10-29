-- =====================================================
-- AI工具目录项目 - AI工具表创建脚本
-- =====================================================
-- 版本: 1.0
-- 创建时间: 2024年
-- 数据库: Supabase PostgreSQL
-- 
-- 功能说明:
-- 1. 存储AI工具的详细信息
-- 2. 支持工具的状态管理（草稿、审核中、已发布等）
-- 3. 包含SEO优化字段
-- 4. 支持标签和评分系统
-- 5. 实现RLS行级安全策略
-- =====================================================

-- =====================================================
-- 第一步: 清理现有资源 (避免冲突)
-- =====================================================

-- 删除可能存在的旧触发器和函数
DROP TRIGGER IF EXISTS update_tools_updated_at ON tools;
DROP TRIGGER IF EXISTS update_tools_slug ON tools;
DROP FUNCTION IF EXISTS update_tools_updated_at_column();
DROP FUNCTION IF EXISTS generate_tool_slug();

-- =====================================================
-- 第二步: 创建枚举类型
-- =====================================================

-- 创建工具状态枚举
DO $$ BEGIN
    CREATE TYPE tool_status AS ENUM ('draft', 'pending', 'published', 'rejected', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建工具类型枚举
DO $$ BEGIN
    CREATE TYPE tool_type AS ENUM ('free', 'freemium', 'paid', 'open_source');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 第三步: 创建AI工具表结构
-- =====================================================

-- 创建AI工具表
CREATE TABLE IF NOT EXISTS tools (
  -- 主键ID，使用UUID
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 工具名称
  name VARCHAR(200) NOT NULL,
  
  -- URL友好的标识符
  slug VARCHAR(200) UNIQUE NOT NULL,
  
  -- 工具简短描述
  description TEXT NOT NULL,
  
  -- 工具详细介绍
  content TEXT,
  
  -- 工具官网URL
  website_url VARCHAR(500) NOT NULL,
  
  -- 工具Logo URL
  logo_url VARCHAR(500),
  
  -- 工具截图URLs（JSON数组）
  screenshots JSONB DEFAULT '[]',
  
  -- 所属分类ID
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  
  -- 工具标签（JSON数组）
  tags JSONB DEFAULT '[]',
  
  -- 工具状态
  status tool_status DEFAULT 'pending',
  
  -- 工具类型（免费/付费等）
  tool_type tool_type DEFAULT 'free',
  
  -- 价格信息
  pricing_info JSONB DEFAULT '{}',
  
  -- 是否为热门工具
  is_hot BOOLEAN DEFAULT false,
  
  -- 是否为新工具
  is_new BOOLEAN DEFAULT false,
  
  -- 是否推荐
  is_featured BOOLEAN DEFAULT false,
  
  -- 工具评分（1-5分）
  rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  
  -- 评分人数
  rating_count INTEGER DEFAULT 0,
  
  -- 浏览次数
  view_count INTEGER DEFAULT 0,
  
  -- 点击次数
  click_count INTEGER DEFAULT 0,
  
  -- 收藏次数
  favorite_count INTEGER DEFAULT 0,
  
  -- SEO标题
  seo_title VARCHAR(200),
  
  -- SEO描述
  seo_description VARCHAR(300),
  
  -- SEO关键词
  seo_keywords VARCHAR(500),
  
  -- 排序权重
  sort_order INTEGER DEFAULT 0,
  
  -- 发布时间
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- 创建时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 更新时间
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 提交者ID
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 审核者ID
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 审核时间
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- 审核备注
  review_notes TEXT
);

-- =====================================================
-- 第四步: 创建索引
-- =====================================================

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);
CREATE INDEX IF NOT EXISTS idx_tools_category_id ON tools(category_id);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_tool_type ON tools(tool_type);
CREATE INDEX IF NOT EXISTS idx_tools_is_hot ON tools(is_hot);
CREATE INDEX IF NOT EXISTS idx_tools_is_new ON tools(is_new);
CREATE INDEX IF NOT EXISTS idx_tools_is_featured ON tools(is_featured);
CREATE INDEX IF NOT EXISTS idx_tools_rating ON tools(rating);
CREATE INDEX IF NOT EXISTS idx_tools_view_count ON tools(view_count);
CREATE INDEX IF NOT EXISTS idx_tools_published_at ON tools(published_at);
CREATE INDEX IF NOT EXISTS idx_tools_created_at ON tools(created_at);
CREATE INDEX IF NOT EXISTS idx_tools_submitted_by ON tools(submitted_by);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_tools_status_category ON tools(status, category_id);
CREATE INDEX IF NOT EXISTS idx_tools_status_published_at ON tools(status, published_at DESC);

-- 创建GIN索引用于JSON字段搜索
CREATE INDEX IF NOT EXISTS idx_tools_tags_gin ON tools USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_tools_screenshots_gin ON tools USING GIN (screenshots);

-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS idx_tools_search ON tools USING GIN (
  to_tsvector('chinese', name || ' ' || description || ' ' || COALESCE(content, ''))
);

-- =====================================================
-- 第五步: 配置RLS安全策略
-- =====================================================

-- 启用行级安全策略
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- 策略1: 所有用户都可以查看已发布的工具
CREATE POLICY "Anyone can view published tools" ON tools
  FOR SELECT USING (status = 'published');

-- 策略2: 用户可以查看自己提交的工具
CREATE POLICY "Users can view own tools" ON tools
  FOR SELECT USING (submitted_by = auth.uid());

-- 策略3: 管理员可以查看所有工具
CREATE POLICY "Admins can view all tools" ON tools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 策略4: 认证用户可以提交工具
CREATE POLICY "Authenticated users can submit tools" ON tools
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND submitted_by = auth.uid()
  );

-- 策略5: 用户可以更新自己提交的草稿工具
CREATE POLICY "Users can update own draft tools" ON tools
  FOR UPDATE USING (
    submitted_by = auth.uid() 
    AND status IN ('draft', 'rejected')
  );

-- 策略6: 管理员可以更新所有工具
CREATE POLICY "Admins can update all tools" ON tools
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 策略7: 管理员可以删除工具
CREATE POLICY "Admins can delete tools" ON tools
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 第六步: 创建触发器和函数
-- =====================================================

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION update_tools_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- 如果状态变为已发布，设置发布时间
    IF NEW.status = 'published' AND OLD.status != 'published' THEN
        NEW.published_at = NOW();
    END IF;
    
    -- 如果状态从已发布变为其他状态，清除发布时间
    IF NEW.status != 'published' AND OLD.status = 'published' THEN
        NEW.published_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建自动生成slug的函数
CREATE OR REPLACE FUNCTION generate_tool_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- 如果slug为空，则自动生成
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- 基于名称生成基础slug
        base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9\u4e00-\u9fa5]+', '-', 'g'));
        base_slug := trim(both '-' from base_slug);
        
        -- 确保slug唯一
        final_slug := base_slug;
        WHILE EXISTS (SELECT 1 FROM tools WHERE slug = final_slug AND id != COALESCE(NEW.id, gen_random_uuid())) LOOP
            counter := counter + 1;
            final_slug := base_slug || '-' || counter;
        END LOOP;
        
        NEW.slug := final_slug;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_tools_updated_at 
  BEFORE UPDATE ON tools
  FOR EACH ROW 
  EXECUTE FUNCTION update_tools_updated_at_column();

CREATE TRIGGER update_tools_slug 
  BEFORE INSERT OR UPDATE ON tools
  FOR EACH ROW 
  EXECUTE FUNCTION generate_tool_slug();

-- =====================================================
-- 第七步: 创建视图和函数
-- =====================================================

-- 创建已发布工具的视图
CREATE OR REPLACE VIEW published_tools AS
SELECT 
  t.*,
  c.name as category_name,
  c.slug as category_slug,
  c.icon as category_icon
FROM tools t
JOIN categories c ON t.category_id = c.id
WHERE t.status = 'published'
ORDER BY t.sort_order, t.published_at DESC;

-- 创建热门工具视图
CREATE OR REPLACE VIEW hot_tools AS
SELECT *
FROM published_tools
WHERE is_hot = true
ORDER BY sort_order, view_count DESC, published_at DESC;

-- 创建新工具视图
CREATE OR REPLACE VIEW new_tools AS
SELECT *
FROM published_tools
WHERE is_new = true
ORDER BY published_at DESC;

-- 创建推荐工具视图
CREATE OR REPLACE VIEW featured_tools AS
SELECT *
FROM published_tools
WHERE is_featured = true
ORDER BY sort_order, rating DESC, view_count DESC;

-- 创建工具搜索函数
CREATE OR REPLACE FUNCTION search_tools(
  search_query TEXT,
  category_filter UUID DEFAULT NULL,
  tool_type_filter tool_type DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  description TEXT,
  logo_url VARCHAR,
  category_name VARCHAR,
  rating DECIMAL,
  view_count INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.description,
    t.logo_url,
    c.name as category_name,
    t.rating,
    t.view_count,
    ts_rank(
      to_tsvector('chinese', t.name || ' ' || t.description || ' ' || COALESCE(t.content, '')),
      plainto_tsquery('chinese', search_query)
    ) as rank
  FROM tools t
  JOIN categories c ON t.category_id = c.id
  WHERE t.status = 'published'
    AND (category_filter IS NULL OR t.category_id = category_filter)
    AND (tool_type_filter IS NULL OR t.tool_type = tool_type_filter)
    AND (
      search_query IS NULL 
      OR search_query = '' 
      OR to_tsvector('chinese', t.name || ' ' || t.description || ' ' || COALESCE(t.content, '')) 
         @@ plainto_tsquery('chinese', search_query)
    )
  ORDER BY 
    CASE WHEN search_query IS NOT NULL AND search_query != '' THEN rank END DESC,
    t.is_featured DESC,
    t.rating DESC,
    t.view_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 创建增加浏览量的函数
CREATE OR REPLACE FUNCTION increment_tool_view_count(tool_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tools 
  SET view_count = view_count + 1 
  WHERE id = tool_id AND status = 'published';
END;
$$ LANGUAGE plpgsql;

-- 创建增加点击量的函数
CREATE OR REPLACE FUNCTION increment_tool_click_count(tool_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tools 
  SET click_count = click_count + 1 
  WHERE id = tool_id AND status = 'published';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 第八步: 插入示例数据
-- =====================================================

-- 插入示例工具数据（基于现有的data.ts）
INSERT INTO tools (
  name, slug, description, website_url, logo_url, category_id, 
  status, is_hot, is_new, rating, view_count
) 
SELECT 
  '豆包', 'doubao', '字节跳动推出的免费AI智能助手', 'https://www.doubao.com', 
  '/stylized-bean-logo.png', c.id, 'published', true, false, 4.5, 1250
FROM categories c WHERE c.slug = 'writing'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tools (
  name, slug, description, website_url, logo_url, category_id, 
  status, is_hot, is_new, rating, view_count
) 
SELECT 
  '吐司AI', 'trae', '专为视频创作者推出的免费AI编辑工具', 'https://www.trae.ai', 
  '/abstract-geometric-logo.png', c.id, 'published', true, false, 4.3, 980
FROM categories c WHERE c.slug = 'video'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tools (
  name, slug, description, website_url, logo_url, category_id, 
  status, is_hot, is_new, rating, view_count
) 
SELECT 
  'AIPPT', 'aippt', 'AI快速生成高质量PPT', 'https://www.aippt.cn', 
  '/abstract-network-logo.png', c.id, 'published', true, false, 4.4, 1100
FROM categories c WHERE c.slug = 'productivity'
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 完成提示
-- =====================================================

-- 添加注释
COMMENT ON TABLE tools IS 'AI工具表，存储工具的详细信息';
COMMENT ON COLUMN tools.slug IS 'URL友好的工具标识符';
COMMENT ON COLUMN tools.status IS '工具状态：draft(草稿), pending(待审核), published(已发布), rejected(已拒绝), archived(已归档)';
COMMENT ON COLUMN tools.tool_type IS '工具类型：free(免费), freemium(免费增值), paid(付费), open_source(开源)';
COMMENT ON COLUMN tools.tags IS 'JSON格式的标签数组';
COMMENT ON COLUMN tools.pricing_info IS 'JSON格式的价格信息';

-- 输出创建完成信息
DO $$
BEGIN
  RAISE NOTICE '=== AI工具表创建完成 ===';
  RAISE NOTICE '表名: tools';
  RAISE NOTICE '功能: 存储AI工具详细信息';
  RAISE NOTICE '安全: 已启用RLS策略';
  RAISE NOTICE '数据: 已插入3个示例工具';
  RAISE NOTICE '视图: published_tools, hot_tools, new_tools, featured_tools';
  RAISE NOTICE '函数: search_tools, increment_tool_view_count, increment_tool_click_count';
END $$;