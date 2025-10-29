# 提交记录表 (submissions) 设计方案

## 📋 表概述

提交记录表用于管理工具提交和审核流程，只有审核通过的提交才会自动创建工具记录。该表支持完整的工具提交生命周期管理。

## 🏗️ 表结构

### 基本信息
- **主表**: `submissions` - 工具提交记录
- **辅助表**: `submission_reviews` - 审核历史记录
- **主键**: `id` (UUID)
- **外键**: 多个外键关联用户和分类
- **索引**: 多个性能优化索引
- **RLS**: 启用行级安全策略

## 📊 主表结构 (submissions)

### 字段定义
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

### 字段详解

#### 工具信息字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `tool_name` | VARCHAR(200) | NOT NULL | 提交的工具名称 |
| `tool_description` | TEXT | NOT NULL | 工具描述 |
| `tool_content` | TEXT | - | 工具详细内容 |
| `tool_website_url` | VARCHAR(500) | NOT NULL | 工具官网地址 |
| `tool_logo_url` | VARCHAR(500) | - | 工具Logo地址 |
| `tool_screenshots` | JSONB | DEFAULT '[]' | 工具截图数组 |

#### 分类和标签字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `category_id` | UUID | NOT NULL, FK | 工具分类ID |
| `tool_tags` | JSONB | DEFAULT '[]' | 工具标签数组 |
| `tool_type` | tool_type | DEFAULT 'free' | 工具类型 |
| `pricing_info` | JSONB | DEFAULT '{}' | 价格信息 |

#### 提交状态字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `status` | submission_status | DEFAULT 'draft' | 提交状态 |
| `submitter_email` | VARCHAR(255) | - | 提交者邮箱 |
| `submitter_name` | VARCHAR(100) | - | 提交者姓名 |
| `submission_notes` | TEXT | - | 提交备注 |

#### 审核管理字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `review_priority` | INTEGER | DEFAULT 3 | 审核优先级(1-5) |
| `review_deadline` | TIMESTAMP WITH TIME ZONE | - | 审核截止时间 |
| `review_started_at` | TIMESTAMP WITH TIME ZONE | - | 开始审核时间 |
| `review_completed_at` | TIMESTAMP WITH TIME ZONE | - | 完成审核时间 |
| `review_notes` | TEXT | - | 审核备注 |
| `rejection_reason` | TEXT | - | 拒绝原因 |
| `changes_requested` | TEXT | - | 要求修改的内容 |

#### 关联和版本字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `tool_id` | UUID | FK → tools(id) | 关联的工具ID（审核通过后） |
| `submitted_by` | UUID | FK → auth.users(id) | 提交者用户ID |
| `reviewed_by` | UUID | FK → auth.users(id) | 审核者用户ID |
| `version` | INTEGER | DEFAULT 1 | 提交版本号 |
| `parent_submission_id` | UUID | FK → submissions(id) | 父提交ID（修改版本） |
| `is_latest_version` | BOOLEAN | DEFAULT true | 是否为最新版本 |

#### 时间戳字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 创建时间 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新时间 |
| `submitted_at` | TIMESTAMP WITH TIME ZONE | - | 提交时间 |

#### 扩展字段
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `metadata` | JSONB | DEFAULT '{}' | 扩展元数据 |

## 📊 审核历史表 (submission_reviews)

### 字段定义
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

### 字段详解
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `submission_id` | UUID | NOT NULL, FK | 关联的提交ID |
| `action` | review_action | NOT NULL | 审核动作 |
| `notes` | TEXT | - | 审核备注 |
| `reviewer_id` | UUID | FK → auth.users(id) | 审核者ID |
| `previous_status` | submission_status | - | 之前的状态 |
| `new_status` | submission_status | - | 新的状态 |
| `metadata` | JSONB | DEFAULT '{}' | 扩展数据 |

## 🏷️ 枚举类型

### 提交状态 (submission_status)
```sql
CREATE TYPE submission_status AS ENUM (
  'draft',              -- 草稿
  'submitted',          -- 已提交
  'reviewing',          -- 审核中
  'approved',           -- 已批准
  'rejected',           -- 已拒绝
  'changes_requested',  -- 需要修改
  'withdrawn'           -- 已撤回
);
```

### 审核动作 (review_action)
```sql
CREATE TYPE review_action AS ENUM (
  'submit',           -- 提交
  'start_review',     -- 开始审核
  'approve',          -- 批准
  'reject',           -- 拒绝
  'request_changes',  -- 要求修改
  'withdraw'          -- 撤回
);
```

## 🔒 安全策略 (RLS)

### submissions表策略
```sql
-- 用户可查看自己的提交
CREATE POLICY "submissions_owner_select_policy" ON submissions
FOR SELECT USING (submitted_by = auth.uid());

-- 管理员可查看所有提交
CREATE POLICY "submissions_admin_select_policy" ON submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role IN ('admin', 'moderator')
  )
);

-- 认证用户可创建提交
CREATE POLICY "submissions_insert_policy" ON submissions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND submitted_by = auth.uid()
);

-- 用户可更新自己的草稿提交
CREATE POLICY "submissions_owner_update_policy" ON submissions
FOR UPDATE USING (
  submitted_by = auth.uid() 
  AND status IN ('draft', 'changes_requested')
);

-- 管理员可更新所有提交
CREATE POLICY "submissions_admin_update_policy" ON submissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role IN ('admin', 'moderator')
  )
);
```

### submission_reviews表策略
```sql
-- 管理员可查看所有审核记录
CREATE POLICY "submission_reviews_admin_select_policy" ON submission_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role IN ('admin', 'moderator')
  )
);

-- 用户可查看自己提交的审核记录
CREATE POLICY "submission_reviews_owner_select_policy" ON submission_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM submissions 
    WHERE submissions.id = submission_reviews.submission_id 
    AND submissions.submitted_by = auth.uid()
  )
);

-- 管理员可创建审核记录
CREATE POLICY "submission_reviews_insert_policy" ON submission_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.role IN ('admin', 'moderator')
  )
);
```

## 📈 性能优化

### 索引设计
```sql
-- submissions表索引
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_by ON submissions(submitted_by);
CREATE INDEX idx_submissions_category_id ON submissions(category_id);
CREATE INDEX idx_submissions_reviewed_by ON submissions(reviewed_by);
CREATE INDEX idx_submissions_tool_id ON submissions(tool_id);
CREATE INDEX idx_submissions_parent_id ON submissions(parent_submission_id);

-- 复合索引
CREATE INDEX idx_submissions_status_priority ON submissions(status, review_priority DESC);
CREATE INDEX idx_submissions_status_submitted_at ON submissions(status, submitted_at);
CREATE INDEX idx_submissions_latest_version ON submissions(is_latest_version) WHERE is_latest_version = true;

-- JSON字段索引
CREATE INDEX idx_submissions_tool_tags ON submissions USING GIN(tool_tags);
CREATE INDEX idx_submissions_pricing_info ON submissions USING GIN(pricing_info);
CREATE INDEX idx_submissions_metadata ON submissions USING GIN(metadata);

-- submission_reviews表索引
CREATE INDEX idx_submission_reviews_submission_id ON submission_reviews(submission_id);
CREATE INDEX idx_submission_reviews_reviewer_id ON submission_reviews(reviewer_id);
CREATE INDEX idx_submission_reviews_action ON submission_reviews(action);
CREATE INDEX idx_submission_reviews_created_at ON submission_reviews(created_at);
```

### 触发器
```sql
-- 自动更新 updated_at
CREATE TRIGGER update_submissions_updated_at 
BEFORE UPDATE ON submissions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动设置 submitted_at
CREATE OR REPLACE FUNCTION set_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
        NEW.submitted_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_submissions_submitted_at 
BEFORE UPDATE ON submissions 
FOR EACH ROW EXECUTE FUNCTION set_submitted_at();
```

## 🔄 核心业务逻辑

### 审核通过自动创建工具
```sql
CREATE OR REPLACE FUNCTION handle_approved_submission()
RETURNS TRIGGER AS $$
DECLARE
    new_tool_id UUID;
BEGIN
    -- 只有当状态变为 approved 时才执行
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- 创建新的工具记录
        INSERT INTO tools (
            name, description, content, website_url, logo_url, screenshots,
            category_id, tags, tool_type, pricing_info, status,
            submitted_by, reviewed_by, reviewed_at, review_notes,
            published_at
        ) VALUES (
            NEW.tool_name, NEW.tool_description, NEW.tool_content,
            NEW.tool_website_url, NEW.tool_logo_url, NEW.tool_screenshots,
            NEW.category_id, NEW.tool_tags, NEW.tool_type, NEW.pricing_info,
            'published', NEW.submitted_by, NEW.reviewed_by, NOW(),
            NEW.review_notes, NOW()
        ) RETURNING id INTO new_tool_id;
        
        -- 更新提交记录中的工具ID
        NEW.tool_id = new_tool_id;
        NEW.review_completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_approved_submission_trigger
BEFORE UPDATE ON submissions
FOR EACH ROW EXECUTE FUNCTION handle_approved_submission();
```

## 📊 视图和函数

### 待审核提交视图
```sql
CREATE VIEW pending_submissions AS
SELECT 
    s.*,
    c.name as category_name,
    u.email as submitter_email_from_auth,
    r.email as reviewer_email
FROM submissions s
JOIN categories c ON s.category_id = c.id
LEFT JOIN auth.users u ON s.submitted_by = u.id
LEFT JOIN auth.users r ON s.reviewed_by = r.id
WHERE s.status IN ('submitted', 'reviewing')
ORDER BY s.review_priority DESC, s.submitted_at ASC;
```

### 提交统计视图
```sql
CREATE VIEW submission_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (review_completed_at - review_started_at))/3600) as avg_review_hours
FROM submissions
WHERE status != 'draft'
GROUP BY status;
```

### 提交详情视图
```sql
CREATE VIEW submission_details AS
SELECT 
    s.*,
    c.name as category_name,
    c.slug as category_slug,
    u.email as submitter_email,
    r.email as reviewer_email,
    t.slug as tool_slug
FROM submissions s
JOIN categories c ON s.category_id = c.id
LEFT JOIN auth.users u ON s.submitted_by = u.id
LEFT JOIN auth.users r ON s.reviewed_by = r.id
LEFT JOIN tools t ON s.tool_id = t.id;
```

### 提交工具函数
```sql
CREATE OR REPLACE FUNCTION submit_tool(
    p_tool_name VARCHAR(200),
    p_tool_description TEXT,
    p_tool_website_url VARCHAR(500),
    p_category_id UUID,
    p_tool_type tool_type DEFAULT 'free',
    p_tool_tags JSONB DEFAULT '[]',
    p_submitter_email VARCHAR(255) DEFAULT NULL,
    p_submitter_name VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    submission_id UUID;
BEGIN
    INSERT INTO submissions (
        tool_name, tool_description, tool_website_url, category_id,
        tool_type, tool_tags, submitter_email, submitter_name,
        status, submitted_by, submitted_at
    ) VALUES (
        p_tool_name, p_tool_description, p_tool_website_url, p_category_id,
        p_tool_type, p_tool_tags, p_submitter_email, p_submitter_name,
        'submitted', auth.uid(), NOW()
    ) RETURNING id INTO submission_id;
    
    -- 记录提交动作
    INSERT INTO submission_reviews (
        submission_id, action, reviewer_id, new_status
    ) VALUES (
        submission_id, 'submit', auth.uid(), 'submitted'
    );
    
    RETURN submission_id;
END;
$$ LANGUAGE plpgsql;
```

### 审核提交函数
```sql
CREATE OR REPLACE FUNCTION review_submission(
    p_submission_id UUID,
    p_action review_action,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status submission_status;
    new_status submission_status;
BEGIN
    -- 获取当前状态
    SELECT status INTO current_status 
    FROM submissions 
    WHERE id = p_submission_id;
    
    -- 根据动作确定新状态
    CASE p_action
        WHEN 'start_review' THEN new_status := 'reviewing';
        WHEN 'approve' THEN new_status := 'approved';
        WHEN 'reject' THEN new_status := 'rejected';
        WHEN 'request_changes' THEN new_status := 'changes_requested';
        ELSE RETURN FALSE;
    END CASE;
    
    -- 更新提交状态
    UPDATE submissions 
    SET 
        status = new_status,
        reviewed_by = auth.uid(),
        review_notes = p_notes,
        review_started_at = CASE 
            WHEN p_action = 'start_review' THEN NOW() 
            ELSE review_started_at 
        END,
        updated_at = NOW()
    WHERE id = p_submission_id;
    
    -- 记录审核历史
    INSERT INTO submission_reviews (
        submission_id, action, notes, reviewer_id,
        previous_status, new_status
    ) VALUES (
        p_submission_id, p_action, p_notes, auth.uid(),
        current_status, new_status
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## 🛠️ 常用查询

### 获取待审核提交
```sql
SELECT * FROM pending_submissions
WHERE review_priority >= 3
ORDER BY review_priority DESC, submitted_at ASC
LIMIT 20;
```

### 获取用户的提交历史
```sql
SELECT s.*, c.name as category_name
FROM submissions s
JOIN categories c ON s.category_id = c.id
WHERE s.submitted_by = $1
ORDER BY s.created_at DESC;
```

### 获取提交的审核历史
```sql
SELECT sr.*, u.email as reviewer_email
FROM submission_reviews sr
LEFT JOIN auth.users u ON sr.reviewer_id = u.id
WHERE sr.submission_id = $1
ORDER BY sr.created_at ASC;
```

## 📝 使用示例

### 提交工具
```sql
SELECT submit_tool(
    'ChatGPT',
    'OpenAI开发的AI对话助手',
    'https://chat.openai.com',
    'category-uuid',
    'freemium',
    '["对话", "AI助手"]',
    'user@example.com',
    '张三'
);
```

### 开始审核
```sql
SELECT review_submission(
    'submission-uuid',
    'start_review',
    '开始审核此工具'
);
```

### 批准提交
```sql
SELECT review_submission(
    'submission-uuid',
    'approve',
    '工具质量很好，批准发布'
);
```

## 🔄 数据流程

### 提交生命周期
1. **创建草稿** → `status: draft`
2. **提交审核** → `status: submitted`, 记录 `submitted_at`
3. **开始审核** → `status: reviewing`, 记录 `review_started_at`
4. **审核结果**:
   - **批准** → `status: approved`, 自动创建 `tools` 记录
   - **拒绝** → `status: rejected`
   - **要求修改** → `status: changes_requested`
   - **撤回** → `status: withdrawn`

### 版本控制
- 修改请求会创建新版本
- `parent_submission_id` 链接到原始提交
- `is_latest_version` 标记最新版本

## 🚀 扩展建议

### 短期扩展
1. 批量审核功能
2. 审核模板和检查清单
3. 自动化审核规则
4. 提交统计面板

### 长期扩展
1. AI辅助审核
2. 提交质量评分
3. 审核员工作量统计
4. 提交趋势分析

## 📋 维护指南

### 定期维护任务
1. 清理长期草稿状态的提交
2. 检查审核时效性
3. 更新审核优先级
4. 分析提交质量趋势

### 监控指标
- 平均审核时长
- 审核通过率
- 提交数量趋势
- 审核员工作负载

---

**相关文件**: `../submissions.sql`  
**版本**: 1.0  
**维护者**: AI工具目录开发团队