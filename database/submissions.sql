-- =====================================================
-- AI工具目录项目 - 提交记录表创建脚本
-- =====================================================
-- 版本: 1.0
-- 创建时间: 2024年
-- 数据库: Supabase PostgreSQL
-- 
-- 功能说明:
-- 1. 记录用户提交的AI工具信息
-- 2. 管理审核流程和状态
-- 3. 支持审核历史记录
-- 4. 只有审核通过的提交才会更新到tools表
-- 5. 实现RLS行级安全策略
-- =====================================================

-- =====================================================
-- 第一步: 清理现有资源 (避免冲突)
-- =====================================================

-- 删除可能存在的旧触发器和函数
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
DROP TRIGGER IF EXISTS handle_submission_approval ON submissions;
DROP FUNCTION IF EXISTS update_submissions_updated_at_column();
DROP FUNCTION IF EXISTS handle_approved_submission();

-- =====================================================
-- 第二步: 创建枚举类型
-- =====================================================

-- 创建提交状态枚举
DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM (
        'draft',        -- 草稿
        'submitted',    -- 已提交
        'reviewing',    -- 审核中
        'approved',     -- 已批准
        'rejected',     -- 已拒绝
        'changes_requested', -- 需要修改
        'withdrawn'     -- 已撤回
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建审核动作枚举
DO $$ BEGIN
    CREATE TYPE review_action AS ENUM (
        'submit',           -- 提交审核
        'start_review',     -- 开始审核
        'approve',          -- 批准
        'reject',           -- 拒绝
        'request_changes',  -- 要求修改
        'withdraw'          -- 撤回
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 第三步: 创建提交记录表结构
-- =====================================================

-- 创建提交记录表
CREATE TABLE IF NOT EXISTS submissions (
  -- 主键ID，使用UUID
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 工具名称
  tool_name VARCHAR(200) NOT NULL,
  
  -- 工具描述
  tool_description TEXT NOT NULL,
  
  -- 工具详细介绍
  tool_content TEXT,
  
  -- 工具官网URL
  tool_website_url VARCHAR(500) NOT NULL,
  
  -- 工具Logo URL
  tool_logo_url VARCHAR(500),
  
  -- 工具截图URLs（JSON数组）
  tool_screenshots JSONB DEFAULT '[]',
  
  -- 所属分类ID
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  
  -- 工具标签（JSON数组）
  tool_tags JSONB DEFAULT '[]',
  
  -- 工具类型（免费/付费等）
  tool_type tool_type DEFAULT 'free',
  
  -- 价格信息
  pricing_info JSONB DEFAULT '{}',
  
  -- 提交状态
  status submission_status DEFAULT 'draft',
  
  -- 提交者联系邮箱
  submitter_email VARCHAR(255),
  
  -- 提交者姓名
  submitter_name VARCHAR(100),
  
  -- 提交说明
  submission_notes TEXT,
  
  -- 审核优先级（1-5，5最高）
  review_priority INTEGER DEFAULT 3 CHECK (review_priority >= 1 AND review_priority <= 5),
  
  -- 审核截止时间
  review_deadline TIMESTAMP WITH TIME ZONE,
  
  -- 审核开始时间
  review_started_at TIMESTAMP WITH TIME ZONE,
  
  -- 审核完成时间
  review_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 审核备注
  review_notes TEXT,
  
  -- 拒绝原因
  rejection_reason TEXT,
  
  -- 需要修改的内容
  changes_requested TEXT,
  
  -- 关联的工具ID（审核通过后创建）
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
  
  -- 创建时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 更新时间
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 提交者ID
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 审核者ID
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 提交时间
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- 版本号（用于跟踪修改）
  version INTEGER DEFAULT 1,
  
  -- 父提交ID（用于跟踪修改历史）
  parent_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  
  -- 是否为最新版本
  is_latest_version BOOLEAN DEFAULT true,
  
  -- 额外的元数据
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 第四步: 创建审核历史表
-- =====================================================

-- 创建审核历史记录表
CREATE TABLE IF NOT EXISTS submission_reviews (
  -- 主键ID
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 关联的提交ID
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  -- 审核动作
  action review_action NOT NULL,
  
  -- 审核备注
  notes TEXT,
  
  -- 审核者ID
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 审核时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 审核前状态
  previous_status submission_status,
  
  -- 审核后状态
  new_status submission_status,
  
  -- 额外数据
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 第五步: 创建索引
-- =====================================================

-- 创建submissions表索引
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_category_id ON submissions(category_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_by ON submissions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_submissions_tool_id ON submissions(tool_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_review_priority ON submissions(review_priority);
CREATE INDEX IF NOT EXISTS idx_submissions_is_latest_version ON submissions(is_latest_version);
CREATE INDEX IF NOT EXISTS idx_submissions_parent_id ON submissions(parent_submission_id);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_submissions_status_priority ON submissions(status, review_priority DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status_created_at ON submissions(status, created_at DESC);

-- 创建GIN索引用于JSON字段搜索
CREATE INDEX IF NOT EXISTS idx_submissions_tool_tags_gin ON submissions USING GIN (tool_tags);
CREATE INDEX IF NOT EXISTS idx_submissions_metadata_gin ON submissions USING GIN (metadata);

-- 创建submission_reviews表索引
CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission_id ON submission_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_reviewer_id ON submission_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_action ON submission_reviews(action);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_created_at ON submission_reviews(created_at);

-- =====================================================
-- 第六步: 配置RLS安全策略
-- =====================================================

-- 启用行级安全策略
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_reviews ENABLE ROW LEVEL SECURITY;

-- === submissions表的RLS策略 ===

-- 策略1: 用户可以查看自己的提交
CREATE POLICY "Users can view own submissions" ON submissions
  FOR SELECT USING (submitted_by = auth.uid());

-- 策略2: 管理员可以查看所有提交
CREATE POLICY "Admins can view all submissions" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 策略3: 审核员可以查看待审核的提交
CREATE POLICY "Reviewers can view pending submissions" ON submissions
  FOR SELECT USING (
    status IN ('submitted', 'reviewing') 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'reviewer')
    )
  );

-- 策略4: 认证用户可以创建提交
CREATE POLICY "Authenticated users can create submissions" ON submissions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND submitted_by = auth.uid()
  );

-- 策略5: 用户可以更新自己的草稿提交
CREATE POLICY "Users can update own draft submissions" ON submissions
  FOR UPDATE USING (
    submitted_by = auth.uid() 
    AND status IN ('draft', 'changes_requested')
  );

-- 策略6: 管理员和审核员可以更新提交状态
CREATE POLICY "Admins and reviewers can update submissions" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'reviewer')
    )
  );

-- 策略7: 用户可以删除自己的草稿提交
CREATE POLICY "Users can delete own draft submissions" ON submissions
  FOR DELETE USING (
    submitted_by = auth.uid() 
    AND status = 'draft'
  );

-- 策略8: 管理员可以删除任何提交
CREATE POLICY "Admins can delete any submission" ON submissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- === submission_reviews表的RLS策略 ===

-- 策略1: 用户可以查看自己提交的审核历史
CREATE POLICY "Users can view own submission reviews" ON submission_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions 
      WHERE submissions.id = submission_reviews.submission_id 
      AND submissions.submitted_by = auth.uid()
    )
  );

-- 策略2: 管理员和审核员可以查看所有审核历史
CREATE POLICY "Admins and reviewers can view all reviews" ON submission_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'reviewer')
    )
  );

-- 策略3: 管理员和审核员可以创建审核记录
CREATE POLICY "Admins and reviewers can create reviews" ON submission_reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'reviewer')
    )
    AND reviewer_id = auth.uid()
  );

-- =====================================================
-- 第七步: 创建触发器和函数
-- =====================================================

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION update_submissions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- 如果状态变为已提交，设置提交时间
    IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
        NEW.submitted_at = NOW();
    END IF;
    
    -- 如果状态变为审核中，设置审核开始时间
    IF NEW.status = 'reviewing' AND OLD.status != 'reviewing' THEN
        NEW.review_started_at = NOW();
    END IF;
    
    -- 如果状态变为已批准或已拒绝，设置审核完成时间
    IF NEW.status IN ('approved', 'rejected') AND OLD.status NOT IN ('approved', 'rejected') THEN
        NEW.review_completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建处理审核通过的函数
CREATE OR REPLACE FUNCTION handle_approved_submission()
RETURNS TRIGGER AS $$
DECLARE
    new_tool_id UUID;
BEGIN
    -- 只有当状态变为approved且之前不是approved时才执行
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- 创建新的工具记录
        INSERT INTO tools (
            name,
            slug,
            description,
            content,
            website_url,
            logo_url,
            screenshots,
            category_id,
            tags,
            tool_type,
            pricing_info,
            status,
            submitted_by,
            reviewed_by,
            reviewed_at,
            review_notes
        ) VALUES (
            NEW.tool_name,
            NULL, -- slug会由触发器自动生成
            NEW.tool_description,
            NEW.tool_content,
            NEW.tool_website_url,
            NEW.tool_logo_url,
            NEW.tool_screenshots,
            NEW.category_id,
            NEW.tool_tags,
            NEW.tool_type,
            NEW.pricing_info,
            'published',
            NEW.submitted_by,
            NEW.reviewed_by,
            NOW(),
            NEW.review_notes
        ) RETURNING id INTO new_tool_id;
        
        -- 更新提交记录中的tool_id
        NEW.tool_id = new_tool_id;
        
        -- 更新分类的工具数量
        UPDATE categories 
        SET tools_count = tools_count + 1 
        WHERE id = NEW.category_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建审核历史记录函数
CREATE OR REPLACE FUNCTION create_review_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 只有当状态发生变化时才记录
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO submission_reviews (
            submission_id,
            action,
            notes,
            reviewer_id,
            previous_status,
            new_status
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.status = 'submitted' THEN 'submit'
                WHEN NEW.status = 'reviewing' THEN 'start_review'
                WHEN NEW.status = 'approved' THEN 'approve'
                WHEN NEW.status = 'rejected' THEN 'reject'
                WHEN NEW.status = 'changes_requested' THEN 'request_changes'
                WHEN NEW.status = 'withdrawn' THEN 'withdraw'
                ELSE 'submit'
            END,
            NEW.review_notes,
            NEW.reviewed_by,
            OLD.status,
            NEW.status
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_submissions_updated_at 
  BEFORE UPDATE ON submissions
  FOR EACH ROW 
  EXECUTE FUNCTION update_submissions_updated_at_column();

CREATE TRIGGER handle_submission_approval 
  BEFORE UPDATE ON submissions
  FOR EACH ROW 
  EXECUTE FUNCTION handle_approved_submission();

CREATE TRIGGER create_submission_review_history 
  AFTER UPDATE ON submissions
  FOR EACH ROW 
  EXECUTE FUNCTION create_review_history();

-- =====================================================
-- 第八步: 创建视图和函数
-- =====================================================

-- 创建待审核提交视图
CREATE OR REPLACE VIEW pending_submissions AS
SELECT 
  s.*,
  c.name as category_name,
  c.slug as category_slug,
  p.username as submitter_username,
  p.email as submitter_email_profile
FROM submissions s
JOIN categories c ON s.category_id = c.id
LEFT JOIN profiles p ON s.submitted_by = p.id
WHERE s.status IN ('submitted', 'reviewing')
  AND s.is_latest_version = true
ORDER BY s.review_priority DESC, s.submitted_at ASC;

-- 创建审核统计视图
CREATE OR REPLACE VIEW submission_stats AS
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (review_completed_at - review_started_at))/3600) as avg_review_hours
FROM submissions
WHERE is_latest_version = true
GROUP BY status;

-- 创建提交详情视图（包含审核历史）
CREATE OR REPLACE VIEW submission_details AS
SELECT 
  s.*,
  c.name as category_name,
  c.slug as category_slug,
  p.username as submitter_username,
  r.username as reviewer_username,
  COALESCE(
    json_agg(
      json_build_object(
        'action', sr.action,
        'notes', sr.notes,
        'created_at', sr.created_at,
        'reviewer_name', rp.username
      ) ORDER BY sr.created_at DESC
    ) FILTER (WHERE sr.id IS NOT NULL), 
    '[]'::json
  ) as review_history
FROM submissions s
JOIN categories c ON s.category_id = c.id
LEFT JOIN profiles p ON s.submitted_by = p.id
LEFT JOIN profiles r ON s.reviewed_by = r.id
LEFT JOIN submission_reviews sr ON s.id = sr.submission_id
LEFT JOIN profiles rp ON sr.reviewer_id = rp.id
WHERE s.is_latest_version = true
GROUP BY s.id, c.name, c.slug, p.username, r.username;

-- 创建提交工具的函数
CREATE OR REPLACE FUNCTION submit_tool(
  p_tool_name VARCHAR,
  p_tool_description TEXT,
  p_tool_website_url VARCHAR,
  p_category_id UUID,
  p_tool_content TEXT DEFAULT NULL,
  p_tool_logo_url VARCHAR DEFAULT NULL,
  p_tool_screenshots JSONB DEFAULT '[]',
  p_tool_tags JSONB DEFAULT '[]',
  p_tool_type tool_type DEFAULT 'free',
  p_pricing_info JSONB DEFAULT '{}',
  p_submitter_email VARCHAR DEFAULT NULL,
  p_submitter_name VARCHAR DEFAULT NULL,
  p_submission_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  submission_id UUID;
BEGIN
  INSERT INTO submissions (
    tool_name,
    tool_description,
    tool_content,
    tool_website_url,
    tool_logo_url,
    tool_screenshots,
    category_id,
    tool_tags,
    tool_type,
    pricing_info,
    submitter_email,
    submitter_name,
    submission_notes,
    status,
    submitted_by,
    submitted_at
  ) VALUES (
    p_tool_name,
    p_tool_description,
    p_tool_content,
    p_tool_website_url,
    p_tool_logo_url,
    p_tool_screenshots,
    p_category_id,
    p_tool_tags,
    p_tool_type,
    p_pricing_info,
    p_submitter_email,
    p_submitter_name,
    p_submission_notes,
    'submitted',
    auth.uid(),
    NOW()
  ) RETURNING id INTO submission_id;
  
  RETURN submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建审核提交的函数
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
  -- 检查权限
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'reviewer')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- 获取当前状态
  SELECT status INTO current_status 
  FROM submissions 
  WHERE id = p_submission_id;
  
  -- 确定新状态
  new_status := CASE p_action
    WHEN 'start_review' THEN 'reviewing'
    WHEN 'approve' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    WHEN 'request_changes' THEN 'changes_requested'
    ELSE current_status
  END;
  
  -- 更新提交状态
  UPDATE submissions 
  SET 
    status = new_status,
    reviewed_by = auth.uid(),
    review_notes = p_notes
  WHERE id = p_submission_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 第九步: 插入示例数据
-- =====================================================

-- 插入一个示例提交记录
INSERT INTO submissions (
  tool_name,
  tool_description,
  tool_website_url,
  category_id,
  tool_tags,
  status,
  submitter_email,
  submitter_name,
  submission_notes
) 
SELECT 
  'ChatGPT Plus',
  'OpenAI推出的高级AI对话助手，支持更快响应和优先访问',
  'https://chat.openai.com/plus',
  c.id,
  '["AI对话", "文本生成", "代码助手"]'::jsonb,
  'submitted',
  'user@example.com',
  '测试用户',
  '这是一个测试提交，用于验证系统功能'
FROM categories c 
WHERE c.slug = 'writing'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 完成提示
-- =====================================================

-- 添加注释
COMMENT ON TABLE submissions IS '工具提交记录表，管理用户提交的AI工具审核流程';
COMMENT ON TABLE submission_reviews IS '提交审核历史表，记录所有审核操作';
COMMENT ON COLUMN submissions.status IS '提交状态：draft(草稿), submitted(已提交), reviewing(审核中), approved(已批准), rejected(已拒绝), changes_requested(需要修改), withdrawn(已撤回)';
COMMENT ON COLUMN submissions.tool_id IS '关联的工具ID，只有审核通过后才会有值';
COMMENT ON COLUMN submissions.is_latest_version IS '是否为最新版本，用于跟踪修改历史';

-- 输出创建完成信息
DO $$
BEGIN
  RAISE NOTICE '=== 提交记录表创建完成 ===';
  RAISE NOTICE '主表: submissions';
  RAISE NOTICE '历史表: submission_reviews';
  RAISE NOTICE '功能: 管理工具提交和审核流程';
  RAISE NOTICE '安全: 已启用RLS策略';
  RAISE NOTICE '数据: 已插入1个示例提交';
  RAISE NOTICE '视图: pending_submissions, submission_stats, submission_details';
  RAISE NOTICE '函数: submit_tool, review_submission';
  RAISE NOTICE '特性: 审核通过自动创建工具记录';
END $$;