# AI工具目录 - 数据库设计方案

## 📋 概述

本文档详细描述了AI工具目录项目的数据库设计方案，包含3个核心表的结构设计、关系定义、安全策略和使用指南。

## 🏗️ 数据库架构

### 技术栈
- **数据库**: Supabase PostgreSQL
- **安全机制**: Row Level Security (RLS)
- **认证系统**: Supabase Auth
- **数据类型**: 支持JSON、UUID、枚举等现代数据类型

### 核心设计原则
1. **安全第一**: 所有表都启用RLS策略，确保数据访问安全
2. **性能优化**: 合理的索引设计，支持高效查询
3. **扩展性**: 灵活的JSON字段设计，支持未来功能扩展
4. **数据完整性**: 外键约束和检查约束确保数据一致性
5. **审计追踪**: 完整的时间戳和操作记录

## 📊 表结构设计

### 1. 分类表 (categories)

**用途**: 存储AI工具的分类信息，支持左侧导航栏显示

#### 表结构
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

#### 核心字段说明
- `slug`: URL友好的标识符，用于路由
- `parent_id`: 支持分类层级结构
- `tools_count`: 分类下的工具数量，通过触发器自动维护
- `color`: 分类主题色，用于UI展示

#### RLS策略
- 所有用户可查看激活的分类
- 管理员可进行所有操作
- 普通用户只能查看

### 2. AI工具表 (tools)

**用途**: 存储AI工具的详细信息，支持右侧工具展示

#### 表结构
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

#### 枚举类型
```sql
-- 工具状态
CREATE TYPE tool_status AS ENUM ('draft', 'pending', 'published', 'rejected', 'archived');

-- 工具类型
CREATE TYPE tool_type AS ENUM ('free', 'freemium', 'paid', 'open_source');
```

#### 核心字段说明
- `status`: 工具发布状态，只有published状态的工具对外可见
- `screenshots`: JSON数组存储工具截图URLs
- `tags`: JSON数组存储工具标签
- `pricing_info`: JSON对象存储价格信息
- `rating`: 工具评分（1-5分制）
- 统计字段: `view_count`, `click_count`, `favorite_count`

#### RLS策略
- 所有用户可查看已发布的工具
- 用户可查看自己提交的工具
- 管理员可查看和操作所有工具
- 认证用户可提交工具

### 3. 提交记录表 (submissions)

**用途**: 管理工具提交和审核流程，只有审核通过的提交才会创建工具记录

#### 表结构
```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name VARCHAR(200) NOT NULL,
  tool_description TEXT NOT NULL,
  tool_content TEXT,
  tool_website_url VARCHAR(500) NOT NULL,
  tool_logo_url VARCHAR(500),
  tool_screenshots JSONB DEFAULT '[]',
  category_id UUID NOT NULL REFERENCES categories(id),
  tool_tags JSONB DEFAULT '[]',
  tool_type tool_type DEFAULT 'free',
  pricing_info JSONB DEFAULT '{}',
  status submission_status DEFAULT 'draft',
  submitter_email VARCHAR(255),
  submitter_name VARCHAR(100),
  submission_notes TEXT,
  review_priority INTEGER DEFAULT 3,
  review_deadline TIMESTAMP WITH TIME ZONE,
  review_started_at TIMESTAMP WITH TIME ZONE,
  review_completed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  rejection_reason TEXT,
  changes_requested TEXT,
  tool_id UUID REFERENCES tools(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1,
  parent_submission_id UUID REFERENCES submissions(id),
  is_latest_version BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);
```

#### 审核历史表 (submission_reviews)
```sql
CREATE TABLE submission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id),
  action review_action NOT NULL,
  notes TEXT,
  reviewer_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  previous_status submission_status,
  new_status submission_status,
  metadata JSONB DEFAULT '{}'
);
```

#### 枚举类型
```sql
-- 提交状态
CREATE TYPE submission_status AS ENUM (
  'draft', 'submitted', 'reviewing', 'approved', 
  'rejected', 'changes_requested', 'withdrawn'
);

-- 审核动作
CREATE TYPE review_action AS ENUM (
  'submit', 'start_review', 'approve', 'reject', 
  'request_changes', 'withdraw'
);
```

#### 核心功能
- **版本控制**: 支持提交修改和版本追踪
- **审核流程**: 完整的状态流转和审核历史
- **自动创建**: 审核通过后自动创建工具记录
- **优先级管理**: 支持审核优先级设置

## 🔗 表关系图

```
categories (1) ←→ (N) tools
categories (1) ←→ (N) submissions
submissions (1) ←→ (1) tools (审核通过后)
submissions (1) ←→ (N) submission_reviews
auth.users (1) ←→ (N) tools
auth.users (1) ←→ (N) submissions
auth.users (1) ←→ (N) submission_reviews
```

## 🔒 安全策略 (RLS)

### 权限角色
- **游客**: 只能查看已发布的工具和分类
- **普通用户**: 可提交工具，查看自己的提交
- **审核员**: 可审核提交，查看待审核内容
- **管理员**: 拥有所有权限

### 安全特性
1. **行级安全**: 每个表都启用RLS策略
2. **角色权限**: 基于用户角色的细粒度权限控制
3. **数据隔离**: 用户只能访问自己的数据
4. **审核流程**: 严格的提交审核机制

## 📈 性能优化

### 索引策略
1. **主键索引**: 所有表的UUID主键
2. **外键索引**: 所有外键字段
3. **查询索引**: 基于常用查询字段
4. **复合索引**: 多字段组合查询
5. **JSON索引**: GIN索引支持JSON字段搜索
6. **全文搜索**: 支持中文全文搜索

### 查询优化
- 预定义视图减少复杂查询
- 统计字段通过触发器维护
- 分页查询支持
- 缓存友好的数据结构

## 🛠️ 核心功能

### 1. 工具展示
- 分类浏览
- 热门工具
- 新工具推荐
- 搜索功能
- 标签过滤

### 2. 用户系统
- 工具提交
- 提交历史
- 个人收藏
- 评分评论

### 3. 管理系统
- 提交审核
- 内容管理
- 用户管理
- 统计分析

### 4. 数据统计
- 浏览量统计
- 点击量统计
- 评分统计
- 分类统计

## 📝 使用指南

### 1. 数据库初始化
```bash
# 按顺序执行SQL文件
psql -f categories.sql
psql -f tools.sql
psql -f submissions.sql
```

### 2. 常用查询示例

#### 获取分类及工具数量
```sql
SELECT c.*, COUNT(t.id) as actual_tools_count
FROM categories c
LEFT JOIN tools t ON c.id = t.category_id AND t.status = 'published'
WHERE c.is_active = true
GROUP BY c.id
ORDER BY c.sort_order;
```

#### 搜索工具
```sql
SELECT * FROM search_tools('AI写作', NULL, NULL, 10, 0);
```

#### 获取待审核提交
```sql
SELECT * FROM pending_submissions
ORDER BY review_priority DESC, submitted_at ASC;
```

### 3. 管理操作

#### 审核提交
```sql
SELECT review_submission(
  'submission-uuid',
  'approve',
  '工具质量很好，批准发布'
);
```

#### 提交工具
```sql
SELECT submit_tool(
  'ChatGPT',
  'OpenAI开发的AI对话助手',
  'https://chat.openai.com',
  'category-uuid'
);
```

## 🔄 数据流程

### 工具提交流程
1. 用户填写工具信息 → `submissions` 表 (status: draft)
2. 用户提交审核 → 状态变为 `submitted`
3. 管理员开始审核 → 状态变为 `reviewing`
4. 审核结果:
   - 通过 → 状态变为 `approved`，自动创建 `tools` 记录
   - 拒绝 → 状态变为 `rejected`
   - 需要修改 → 状态变为 `changes_requested`

### 数据同步
- 审核通过的提交自动创建工具记录
- 工具数量自动更新到分类表
- 所有状态变更都有审核历史记录

## 🚀 扩展建议

### 短期扩展
1. 用户收藏功能
2. 工具评论系统
3. 标签管理系统
4. 高级搜索功能

### 长期扩展
1. 工具使用统计
2. 推荐算法
3. API接口
4. 数据分析面板

## 📋 维护指南

### 定期维护
1. 清理过期的草稿提交
2. 更新工具统计数据
3. 优化数据库性能
4. 备份重要数据

### 监控指标
- 提交审核时长
- 工具浏览量趋势
- 用户活跃度
- 系统性能指标

---

## 📞 技术支持

如有问题或建议，请联系开发团队或提交Issue。

**版本**: 1.0  
**更新时间**: 2024年  
**维护者**: AI工具目录开发团队