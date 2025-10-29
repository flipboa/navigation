# 分类表 (categories) 设计方案

## 📋 表概述

分类表用于存储AI工具的分类信息，支持左侧导航栏显示和工具分类管理。

## 🏗️ 表结构

### 基本信息
- **表名**: `categories`
- **主键**: `id` (UUID)
- **外键**: `parent_id` → `categories(id)`, `created_by` → `auth.users(id)`
- **索引**: 多个性能优化索引
- **RLS**: 启用行级安全策略

### 字段定义

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  color VARCHAR(7),
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_on_homepage BOOLEAN DEFAULT true,
  tools_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

## 📊 字段详解

### 核心字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 分类唯一标识符 |
| `slug` | VARCHAR(100) | UNIQUE NOT NULL | URL友好的标识符，用于路由 |
| `name` | VARCHAR(100) | NOT NULL | 分类显示名称 |
| `description` | TEXT | - | 分类详细描述 |

### 显示相关字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `icon` | VARCHAR(100) | - | 分类图标名称或路径 |
| `color` | VARCHAR(7) | - | 分类主题色（HEX格式） |
| `sort_order` | INTEGER | DEFAULT 0 | 显示排序权重 |
| `show_on_homepage` | BOOLEAN | DEFAULT true | 是否在首页显示 |

### 层级结构字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `parent_id` | UUID | FK → categories(id) | 父分类ID，支持层级结构 |

### 状态和统计字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `is_active` | BOOLEAN | DEFAULT true | 分类是否激活 |
| `tools_count` | INTEGER | DEFAULT 0 | 分类下的工具数量 |

### 审计字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 创建时间 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 最后更新时间 |
| `created_by` | UUID | FK → auth.users(id) | 创建者用户ID |

## 🔒 安全策略 (RLS)

### 查看策略
```sql
-- 所有用户可查看激活的分类
CREATE POLICY "categories_select_policy" ON categories
FOR SELECT USING (is_active = true);

-- 管理员可查看所有分类
CREATE POLICY "categories_admin_select_policy" ON categories
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role = 'admin'
  )
);
```

### 插入策略
```sql
-- 只有管理员可以创建分类
CREATE POLICY "categories_insert_policy" ON categories
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role = 'admin'
  )
);
```

### 更新策略
```sql
-- 只有管理员可以更新分类
CREATE POLICY "categories_update_policy" ON categories
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role = 'admin'
  )
);
```

### 删除策略
```sql
-- 只有管理员可以删除分类
CREATE POLICY "categories_delete_policy" ON categories
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
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_show_on_homepage ON categories(show_on_homepage);

-- 复合索引
CREATE INDEX idx_categories_active_sort ON categories(is_active, sort_order);
CREATE INDEX idx_categories_homepage_sort ON categories(show_on_homepage, sort_order);
```

### 触发器
```sql
-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at 
BEFORE UPDATE ON categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔄 业务逻辑

### 工具数量统计
```sql
-- 自动更新工具数量的触发器函数
CREATE OR REPLACE FUNCTION update_category_tools_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新旧分类的工具数量
    IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
        UPDATE categories 
        SET tools_count = (
            SELECT COUNT(*) FROM tools 
            WHERE category_id = OLD.category_id 
            AND status = 'published'
        )
        WHERE id = OLD.category_id;
    END IF;
    
    -- 更新新分类的工具数量
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        UPDATE categories 
        SET tools_count = (
            SELECT COUNT(*) FROM tools 
            WHERE category_id = NEW.category_id 
            AND status = 'published'
        )
        WHERE id = NEW.category_id;
    END IF;
    
    -- 删除时更新分类工具数量
    IF TG_OP = 'DELETE' THEN
        UPDATE categories 
        SET tools_count = (
            SELECT COUNT(*) FROM tools 
            WHERE category_id = OLD.category_id 
            AND status = 'published'
        )
        WHERE id = OLD.category_id;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 📊 视图和函数

### 分类统计视图
```sql
CREATE VIEW category_stats AS
SELECT 
    c.*,
    COUNT(t.id) as actual_tools_count,
    COUNT(CASE WHEN t.is_hot = true THEN 1 END) as hot_tools_count,
    COUNT(CASE WHEN t.is_new = true THEN 1 END) as new_tools_count,
    AVG(t.rating) as avg_rating
FROM categories c
LEFT JOIN tools t ON c.id = t.category_id AND t.status = 'published'
WHERE c.is_active = true
GROUP BY c.id;
```

### 分类层级视图
```sql
CREATE VIEW category_hierarchy AS
WITH RECURSIVE category_tree AS (
    -- 根分类
    SELECT 
        id, name, slug, parent_id, 
        0 as level,
        ARRAY[name] as path,
        name as root_name
    FROM categories 
    WHERE parent_id IS NULL AND is_active = true
    
    UNION ALL
    
    -- 子分类
    SELECT 
        c.id, c.name, c.slug, c.parent_id,
        ct.level + 1,
        ct.path || c.name,
        ct.root_name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = true
)
SELECT * FROM category_tree
ORDER BY path;
```

## 🛠️ 常用查询

### 获取首页分类
```sql
SELECT * FROM categories 
WHERE is_active = true 
AND show_on_homepage = true 
ORDER BY sort_order, name;
```

### 获取分类及工具数量
```sql
SELECT 
    c.*,
    COUNT(t.id) as actual_tools_count
FROM categories c
LEFT JOIN tools t ON c.id = t.category_id AND t.status = 'published'
WHERE c.is_active = true
GROUP BY c.id
ORDER BY c.sort_order, c.name;
```

### 获取分类层级结构
```sql
SELECT * FROM category_hierarchy
WHERE level <= 2  -- 限制层级深度
ORDER BY path;
```

## 📝 使用示例

### 创建分类
```sql
INSERT INTO categories (slug, name, description, icon, color, sort_order)
VALUES (
    'ai-writing',
    'AI写作',
    '人工智能写作工具，包括文案生成、内容创作等',
    'edit',
    '#3B82F6',
    1
);
```

### 更新分类
```sql
UPDATE categories 
SET 
    name = '智能写作',
    description = '更新后的描述',
    updated_at = NOW()
WHERE slug = 'ai-writing';
```

### 删除分类（软删除）
```sql
UPDATE categories 
SET is_active = false, updated_at = NOW()
WHERE slug = 'ai-writing';
```

## 🔄 数据迁移

### 初始数据
```sql
INSERT INTO categories (slug, name, description, icon, color, sort_order, show_on_homepage) VALUES
('ai-writing', 'AI写作', '人工智能写作工具', 'edit', '#3B82F6', 1, true),
('image-generation', '图像生成', 'AI图像生成和编辑工具', 'image', '#10B981', 2, true),
('code-assistant', '代码助手', '编程和开发辅助工具', 'code', '#8B5CF6', 3, true),
('data-analysis', '数据分析', '数据处理和分析工具', 'chart-bar', '#F59E0B', 4, true),
('productivity', '效率工具', '提升工作效率的AI工具', 'lightning-bolt', '#EF4444', 5, true);
```

## 🚀 扩展建议

### 短期扩展
1. 添加分类图标上传功能
2. 支持分类标签系统
3. 添加分类访问统计
4. 支持分类推荐权重

### 长期扩展
1. 多语言分类名称支持
2. 分类个性化推荐
3. 分类热度算法
4. 分类关联分析

## 📋 维护指南

### 定期维护任务
1. 检查工具数量统计准确性
2. 清理无效的分类
3. 优化分类层级结构
4. 更新分类描述和图标

### 监控指标
- 分类下工具数量变化
- 分类访问频率
- 分类层级深度
- 无工具的空分类

---

**相关文件**: `../categories.sql`  
**版本**: 1.0  
**维护者**: AI工具目录开发团队