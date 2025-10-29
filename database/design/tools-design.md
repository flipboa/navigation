# AI工具表 (tools) 设计方案

## 📋 表概述

AI工具表是系统的核心表，存储所有AI工具的详细信息，支持右侧工具展示、搜索、分类浏览等功能。

## 🏗️ 表结构

### 基本信息
- **表名**: `tools`
- **主键**: `id` (UUID)
- **外键**: `category_id` → `categories(id)`, `submitted_by` → `auth.users(id)`, `reviewed_by` → `auth.users(id)`
- **索引**: 多个性能优化索引
- **RLS**: 启用行级安全策略

### 字段定义

```sql
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  content TEXT,
  website_url VARCHAR(500) NOT NULL,
  logo_url VARCHAR(500),
  screenshots JSONB DEFAULT '[]',
  category_id UUID NOT NULL REFERENCES categories(id),
  tags JSONB DEFAULT '[]',
  status tool_status DEFAULT 'pending',
  tool_type tool_type DEFAULT 'free',
  pricing_info JSONB DEFAULT '{}',
  is_hot BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  rating DECIMAL(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  seo_title VARCHAR(200),
  seo_description VARCHAR(300),
  seo_keywords VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT
);
```

## 📊 字段详解

### 核心信息字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 工具唯一标识符 |
| `name` | VARCHAR(200) | NOT NULL | 工具名称 |
| `slug` | VARCHAR(200) | UNIQUE NOT NULL | URL友好标识符 |
| `description` | TEXT | NOT NULL | 工具简短描述 |
| `content` | TEXT | - | 工具详细内容/介绍 |
| `website_url` | VARCHAR(500) | NOT NULL | 工具官网地址 |

### 媒体资源字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `logo_url` | VARCHAR(500) | - | 工具Logo图片地址 |
| `screenshots` | JSONB | DEFAULT '[]' | 工具截图数组 |

### 分类和标签字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `category_id` | UUID | NOT NULL, FK | 所属分类ID |
| `tags` | JSONB | DEFAULT '[]' | 工具标签数组 |

### 状态和类型字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `status` | tool_status | DEFAULT 'pending' | 工具发布状态 |
| `tool_type` | tool_type | DEFAULT 'free' | 工具类型（免费/付费等） |
| `pricing_info` | JSONB | DEFAULT '{}' | 价格信息对象 |

### 特殊标记字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `is_hot` | BOOLEAN | DEFAULT false | 是否为热门工具 |
| `is_new` | BOOLEAN | DEFAULT false | 是否为新工具 |
| `is_featured` | BOOLEAN | DEFAULT false | 是否为推荐工具 |

### 统计字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `rating` | DECIMAL(2,1) | DEFAULT 0.0 | 工具评分（1-5分） |
| `rating_count` | INTEGER | DEFAULT 0 | 评分人数 |
| `view_count` | INTEGER | DEFAULT 0 | 浏览次数 |
| `click_count` | INTEGER | DEFAULT 0 | 点击次数 |
| `favorite_count` | INTEGER | DEFAULT 0 | 收藏次数 |

### SEO字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `seo_title` | VARCHAR(200) | - | SEO标题 |
| `seo_description` | VARCHAR(300) | - | SEO描述 |
| `seo_keywords` | VARCHAR(500) | - | SEO关键词 |

### 排序和时间字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `sort_order` | INTEGER | DEFAULT 0 | 排序权重 |
| `published_at` | TIMESTAMP WITH TIME ZONE | - | 发布时间 |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 创建时间 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新时间 |

### 审核字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `submitted_by` | UUID | FK → auth.users(id) | 提交者用户ID |
| `reviewed_by` | UUID | FK → auth.users(id) | 审核者用户ID |
| `reviewed_at` | TIMESTAMP WITH TIME ZONE | - | 审核时间 |
| `review_notes` | TEXT | - | 审核备注 |

## 🏷️ 枚举类型

### 工具状态 (tool_status)
```sql
CREATE TYPE tool_status AS ENUM (
  'draft',      -- 草稿
  'pending',    -- 待审核
  'published',  -- 已发布
  'rejected',   -- 已拒绝
  'archived'    -- 已归档
);
```

### 工具类型 (tool_type)
```sql
CREATE TYPE tool_type AS ENUM (
  'free',        -- 免费
  'freemium',    -- 免费增值
  'paid',        -- 付费
  'open_source'  -- 开源
);
```

## 🔒 安全策略 (RLS)

### 查看策略
```sql
-- 所有用户可查看已发布的工具
CREATE POLICY "tools_public_select_policy" ON tools
FOR SELECT USING (status = 'published');

-- 用户可查看自己提交的工具
CREATE POLICY "tools_owner_select_policy" ON tools
FOR SELECT USING (submitted_by = auth.uid());

-- 管理员可查看所有工具
CREATE POLICY "tools_admin_select_policy" ON tools
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role IN ('admin', 'moderator')
  )
);
```

### 插入策略
```sql
-- 认证用户可提交工具
CREATE POLICY "tools_insert_policy" ON tools
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND submitted_by = auth.uid()
);
```

### 更新策略
```sql
-- 用户可更新自己的草稿工具
CREATE POLICY "tools_owner_update_policy" ON tools
FOR UPDATE USING (
  submitted_by = auth.uid() 
  AND status = 'draft'
);

-- 管理员可更新所有工具
CREATE POLICY "tools_admin_update_policy" ON tools
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role IN ('admin', 'moderator')
  )
);
```

### 删除策略
```sql
-- 只有管理员可删除工具
CREATE POLICY "tools_delete_policy" ON tools
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role = 'admin'
  )
);
```

## 📈 性能优化

### 索引设计
```sql
-- 基础索引
CREATE INDEX idx_tools_slug ON tools(slug);
CREATE INDEX idx_tools_category_id ON tools(category_id);
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_tools_submitted_by ON tools(submitted_by);

-- 特殊标记索引
CREATE INDEX idx_tools_is_hot ON tools(is_hot) WHERE is_hot = true;
CREATE INDEX idx_tools_is_new ON tools(is_new) WHERE is_new = true;
CREATE INDEX idx_tools_is_featured ON tools(is_featured) WHERE is_featured = true;

-- 复合索引
CREATE INDEX idx_tools_status_category ON tools(status, category_id);
CREATE INDEX idx_tools_published_sort ON tools(status, sort_order) WHERE status = 'published';
CREATE INDEX idx_tools_published_rating ON tools(status, rating DESC) WHERE status = 'published';

-- JSON字段索引
CREATE INDEX idx_tools_tags ON tools USING GIN(tags);
CREATE INDEX idx_tools_screenshots ON tools USING GIN(screenshots);
CREATE INDEX idx_tools_pricing_info ON tools USING GIN(pricing_info);

-- 全文搜索索引
CREATE INDEX idx_tools_search ON tools USING GIN(
  to_tsvector('chinese', name || ' ' || description || ' ' || COALESCE(content, ''))
);
```

### 触发器
```sql
-- 自动更新 updated_at
CREATE TRIGGER update_tools_updated_at 
BEFORE UPDATE ON tools 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动生成 slug
CREATE OR REPLACE FUNCTION generate_tool_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9\u4e00-\u9fa5]+', '-', 'g'));
        NEW.slug = trim(NEW.slug, '-');
        
        -- 确保唯一性
        WHILE EXISTS (SELECT 1 FROM tools WHERE slug = NEW.slug AND id != COALESCE(NEW.id, gen_random_uuid())) LOOP
            NEW.slug = NEW.slug || '-' || extract(epoch from now())::integer;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_tools_slug 
BEFORE INSERT OR UPDATE ON tools 
FOR EACH ROW EXECUTE FUNCTION generate_tool_slug();
```

## 📊 视图和函数

### 已发布工具视图
```sql
CREATE VIEW published_tools AS
SELECT * FROM tools 
WHERE status = 'published'
ORDER BY sort_order DESC, created_at DESC;
```

### 热门工具视图
```sql
CREATE VIEW hot_tools AS
SELECT * FROM tools 
WHERE status = 'published' AND is_hot = true
ORDER BY sort_order DESC, rating DESC, view_count DESC;
```

### 新工具视图
```sql
CREATE VIEW new_tools AS
SELECT * FROM tools 
WHERE status = 'published' AND is_new = true
ORDER BY published_at DESC;
```

### 推荐工具视图
```sql
CREATE VIEW featured_tools AS
SELECT * FROM tools 
WHERE status = 'published' AND is_featured = true
ORDER BY sort_order DESC, rating DESC;
```

### 工具搜索函数
```sql
CREATE OR REPLACE FUNCTION search_tools(
    search_query TEXT DEFAULT NULL,
    category_filter UUID DEFAULT NULL,
    tool_type_filter tool_type DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(200),
    slug VARCHAR(200),
    description TEXT,
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    category_id UUID,
    tags JSONB,
    tool_type tool_type,
    rating DECIMAL(2,1),
    rating_count INTEGER,
    view_count INTEGER,
    is_hot BOOLEAN,
    is_new BOOLEAN,
    is_featured BOOLEAN,
    published_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.name, t.slug, t.description, t.website_url, t.logo_url,
        t.category_id, t.tags, t.tool_type, t.rating, t.rating_count,
        t.view_count, t.is_hot, t.is_new, t.is_featured, t.published_at
    FROM tools t
    WHERE t.status = 'published'
        AND (search_query IS NULL OR 
             to_tsvector('chinese', t.name || ' ' || t.description || ' ' || COALESCE(t.content, '')) 
             @@ plainto_tsquery('chinese', search_query))
        AND (category_filter IS NULL OR t.category_id = category_filter)
        AND (tool_type_filter IS NULL OR t.tool_type = tool_type_filter)
    ORDER BY 
        CASE WHEN search_query IS NOT NULL THEN
            ts_rank(to_tsvector('chinese', t.name || ' ' || t.description), plainto_tsquery('chinese', search_query))
        ELSE 0 END DESC,
        t.sort_order DESC,
        t.rating DESC,
        t.view_count DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;
```

### 统计更新函数
```sql
-- 增加浏览量
CREATE OR REPLACE FUNCTION increment_view_count(tool_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE tools 
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = tool_id AND status = 'published';
END;
$$ LANGUAGE plpgsql;

-- 增加点击量
CREATE OR REPLACE FUNCTION increment_click_count(tool_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE tools 
    SET click_count = click_count + 1,
        updated_at = NOW()
    WHERE id = tool_id AND status = 'published';
END;
$$ LANGUAGE plpgsql;
```

## 🛠️ 常用查询

### 获取分类下的工具
```sql
SELECT * FROM tools 
WHERE category_id = $1 AND status = 'published'
ORDER BY sort_order DESC, rating DESC
LIMIT 20;
```

### 获取热门工具
```sql
SELECT * FROM hot_tools LIMIT 10;
```

### 搜索工具
```sql
SELECT * FROM search_tools('AI写作', NULL, NULL, 10, 0);
```

### 获取工具详情
```sql
SELECT t.*, c.name as category_name
FROM tools t
JOIN categories c ON t.category_id = c.id
WHERE t.slug = $1 AND t.status = 'published';
```

## 📝 使用示例

### 创建工具
```sql
INSERT INTO tools (
    name, description, website_url, category_id, 
    tool_type, tags, submitted_by
) VALUES (
    'ChatGPT',
    'OpenAI开发的AI对话助手',
    'https://chat.openai.com',
    'category-uuid',
    'freemium',
    '["对话", "AI助手", "文本生成"]',
    'user-uuid'
);
```

### 发布工具
```sql
UPDATE tools 
SET 
    status = 'published',
    published_at = NOW(),
    reviewed_by = 'admin-uuid',
    reviewed_at = NOW(),
    review_notes = '工具质量很好，批准发布'
WHERE id = 'tool-uuid';
```

### 设置热门工具
```sql
UPDATE tools 
SET is_hot = true, sort_order = 100
WHERE id = 'tool-uuid';
```

## 🔄 数据迁移

### 初始数据示例
```sql
INSERT INTO tools (name, slug, description, website_url, category_id, status, tool_type, is_hot, rating, published_at) VALUES
('ChatGPT', 'chatgpt', 'OpenAI开发的AI对话助手', 'https://chat.openai.com', 'ai-writing-category-id', 'published', 'freemium', true, 4.8, NOW()),
('Midjourney', 'midjourney', 'AI图像生成工具', 'https://midjourney.com', 'image-generation-category-id', 'published', 'paid', true, 4.7, NOW()),
('GitHub Copilot', 'github-copilot', 'AI代码助手', 'https://github.com/features/copilot', 'code-assistant-category-id', 'published', 'paid', true, 4.6, NOW());
```

## 🚀 扩展建议

### 短期扩展
1. 工具评论系统
2. 用户收藏功能
3. 工具比较功能
4. 高级筛选选项

### 长期扩展
1. 工具使用统计分析
2. 个性化推荐算法
3. 工具API集成
4. 多语言支持

## 📋 维护指南

### 定期维护任务
1. 清理草稿状态的过期工具
2. 更新工具统计数据
3. 检查工具链接有效性
4. 优化搜索索引

### 监控指标
- 工具发布数量趋势
- 用户提交活跃度
- 工具浏览和点击统计
- 搜索查询性能

---

**相关文件**: `../tools.sql`  
**版本**: 1.0  
**维护者**: AI工具目录开发团队