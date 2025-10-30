-- =====================================================
-- 基于角色的提交和审核优化
-- =====================================================
-- 功能: 
-- 1. 管理员、审核员提交表单后直接生效，无需审核
-- 2. 普通用户提交表单后需要审核员或管理员审核
-- 3. 审核通过的工具自动显示在首页对应分类中
-- =====================================================

-- 创建优化的提交工具函数
CREATE OR REPLACE FUNCTION submit_tool_with_role_check(
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
RETURNS JSONB AS $$
DECLARE
  submission_id UUID;
  user_role VARCHAR;
  initial_status submission_status;
  result JSONB;
BEGIN
  -- 获取当前用户角色
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = auth.uid();
  
  -- 如果没有找到用户角色，默认为普通用户
  IF user_role IS NULL THEN
    user_role := 'user';
  END IF;
  
  -- 根据角色决定初始状态
  IF user_role IN ('admin', 'reviewer') THEN
    initial_status := 'approved';  -- 管理员和审核员直接通过
  ELSE
    initial_status := 'submitted'; -- 普通用户需要审核
  END IF;
  
  -- 插入提交记录
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
    submitted_at,
    reviewed_by,
    review_completed_at
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
    initial_status,
    auth.uid(),
    NOW(),
    CASE WHEN initial_status = 'approved' THEN auth.uid() ELSE NULL END,
    CASE WHEN initial_status = 'approved' THEN NOW() ELSE NULL END
  ) RETURNING id INTO submission_id;
  
  -- 记录审核历史
  INSERT INTO submission_reviews (
    submission_id,
    action,
    notes,
    reviewer_id,
    previous_status,
    new_status
  ) VALUES (
    submission_id,
    CASE WHEN initial_status = 'approved' THEN 'approve' ELSE 'submit' END,
    CASE 
      WHEN initial_status = 'approved' THEN '管理员/审核员提交，自动通过审核'
      ELSE '普通用户提交，等待审核'
    END,
    auth.uid(),
    'draft',
    initial_status
  );
  
  -- 构建返回结果
  result := jsonb_build_object(
    'submission_id', submission_id,
    'status', initial_status,
    'user_role', user_role,
    'auto_approved', (initial_status = 'approved'),
    'message', CASE 
      WHEN initial_status = 'approved' THEN '提交成功，已自动通过审核并发布'
      ELSE '提交成功，等待审核员或管理员审核'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建简化的审核函数（只需一方审核）
CREATE OR REPLACE FUNCTION review_submission_simple(
  p_submission_id UUID,
  p_action review_action,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  current_status submission_status;
  new_status submission_status;
  user_role VARCHAR;
  result JSONB;
BEGIN
  -- 检查用户权限
  SELECT role INTO user_role 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF user_role NOT IN ('admin', 'reviewer') THEN
    RAISE EXCEPTION '权限不足：只有管理员和审核员可以进行审核操作';
  END IF;
  
  -- 获取当前提交状态
  SELECT status INTO current_status 
  FROM submissions 
  WHERE id = p_submission_id;
  
  IF current_status IS NULL THEN
    RAISE EXCEPTION '提交记录不存在';
  END IF;
  
  -- 检查状态是否可以审核
  IF current_status NOT IN ('submitted', 'reviewing', 'changes_requested') THEN
    RAISE EXCEPTION '当前状态不允许审核操作';
  END IF;
  
  -- 根据动作确定新状态
  CASE p_action
    WHEN 'approve' THEN
      new_status := 'approved';
    WHEN 'reject' THEN
      new_status := 'rejected';
    WHEN 'request_changes' THEN
      new_status := 'changes_requested';
    WHEN 'start_review' THEN
      new_status := 'reviewing';
    ELSE
      RAISE EXCEPTION '无效的审核动作';
  END CASE;
  
  -- 更新提交状态
  UPDATE submissions 
  SET 
    status = new_status,
    reviewed_by = auth.uid(),
    review_notes = p_notes,
    review_completed_at = CASE 
      WHEN new_status IN ('approved', 'rejected') THEN NOW() 
      ELSE review_completed_at 
    END,
    review_started_at = CASE 
      WHEN current_status = 'submitted' THEN NOW() 
      ELSE review_started_at 
    END
  WHERE id = p_submission_id;
  
  -- 记录审核历史
  INSERT INTO submission_reviews (
    submission_id,
    action,
    notes,
    reviewer_id,
    previous_status,
    new_status
  ) VALUES (
    p_submission_id,
    p_action,
    p_notes,
    auth.uid(),
    current_status,
    new_status
  );
  
  -- 构建返回结果
  result := jsonb_build_object(
    'submission_id', p_submission_id,
    'previous_status', current_status,
    'new_status', new_status,
    'reviewer_role', user_role,
    'message', CASE 
      WHEN new_status = 'approved' THEN '审核通过，工具已发布'
      WHEN new_status = 'rejected' THEN '审核未通过，已拒绝'
      WHEN new_status = 'changes_requested' THEN '需要修改，请根据反馈进行调整'
      WHEN new_status = 'reviewing' THEN '已开始审核'
      ELSE '状态已更新'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建获取待审核提交的函数
CREATE OR REPLACE FUNCTION get_pending_submissions(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  submission_id UUID,
  tool_name VARCHAR,
  tool_description TEXT,
  tool_website_url VARCHAR,
  category_name VARCHAR,
  submitter_name VARCHAR,
  submitter_email VARCHAR,
  submitted_at TIMESTAMP WITH TIME ZONE,
  status submission_status,
  review_priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.tool_name,
    s.tool_description,
    s.tool_website_url,
    c.name,
    COALESCE(p.nickname, s.submitter_name),
    COALESCE(p.email, s.submitter_email),
    s.submitted_at,
    s.status,
    s.review_priority
  FROM submissions s
  JOIN categories c ON s.category_id = c.id
  LEFT JOIN profiles p ON s.submitted_by = p.id
  WHERE s.status IN ('submitted', 'reviewing', 'changes_requested')
    AND s.is_latest_version = true
  ORDER BY s.review_priority DESC, s.submitted_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建获取用户提交历史的函数
CREATE OR REPLACE FUNCTION get_user_submissions(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  submission_id UUID,
  tool_name VARCHAR,
  tool_description TEXT,
  category_name VARCHAR,
  status submission_status,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  tool_slug VARCHAR,
  auto_approved BOOLEAN
) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 如果没有指定用户ID，使用当前用户
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    s.id,
    s.tool_name,
    s.tool_description,
    c.name,
    s.status,
    s.submitted_at,
    s.review_completed_at,
    t.slug,
    (s.submitted_at = s.review_completed_at) -- 如果提交时间等于审核完成时间，说明是自动通过
  FROM submissions s
  JOIN categories c ON s.category_id = c.id
  LEFT JOIN tools t ON s.tool_id = t.id
  WHERE s.submitted_by = target_user_id
    AND s.is_latest_version = true
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建审核统计函数
CREATE OR REPLACE FUNCTION get_review_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pending_count', (
      SELECT COUNT(*) 
      FROM submissions 
      WHERE status IN ('submitted', 'reviewing') 
        AND is_latest_version = true
    ),
    'approved_today', (
      SELECT COUNT(*) 
      FROM submissions 
      WHERE status = 'approved' 
        AND review_completed_at >= CURRENT_DATE
        AND is_latest_version = true
    ),
    'rejected_today', (
      SELECT COUNT(*) 
      FROM submissions 
      WHERE status = 'rejected' 
        AND review_completed_at >= CURRENT_DATE
        AND is_latest_version = true
    ),
    'changes_requested', (
      SELECT COUNT(*) 
      FROM submissions 
      WHERE status = 'changes_requested'
        AND is_latest_version = true
    ),
    'avg_review_time_hours', (
      SELECT ROUND(
        AVG(EXTRACT(EPOCH FROM (review_completed_at - review_started_at)) / 3600)::numeric, 
        2
      )
      FROM submissions 
      WHERE status IN ('approved', 'rejected')
        AND review_started_at IS NOT NULL
        AND review_completed_at IS NOT NULL
        AND review_completed_at >= CURRENT_DATE - INTERVAL '30 days'
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON FUNCTION submit_tool_with_role_check IS '基于用户角色的智能提交函数：管理员和审核员自动通过，普通用户需要审核';
COMMENT ON FUNCTION review_submission_simple IS '简化的审核函数：只需一方审核即可通过';
COMMENT ON FUNCTION get_pending_submissions IS '获取待审核的提交列表';
COMMENT ON FUNCTION get_user_submissions IS '获取用户的提交历史';
COMMENT ON FUNCTION get_review_stats IS '获取审核统计数据';

-- 输出创建完成信息
DO $$
BEGIN
  RAISE NOTICE '=== 基于角色的提交审核优化完成 ===';
  RAISE NOTICE '新增函数:';
  RAISE NOTICE '  - submit_tool_with_role_check: 智能提交（管理员/审核员自动通过）';
  RAISE NOTICE '  - review_submission_simple: 简化审核（只需一方审核）';
  RAISE NOTICE '  - get_pending_submissions: 获取待审核列表';
  RAISE NOTICE '  - get_user_submissions: 获取用户提交历史';
  RAISE NOTICE '  - get_review_stats: 获取审核统计';
  RAISE NOTICE '优化特性:';
  RAISE NOTICE '  ✓ 管理员/审核员提交自动通过';
  RAISE NOTICE '  ✓ 普通用户提交需要审核';
  RAISE NOTICE '  ✓ 只需一方审核即可通过';
  RAISE NOTICE '  ✓ 完整的审核历史记录';
END $$;