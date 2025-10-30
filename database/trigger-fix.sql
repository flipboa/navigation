
-- =====================================================
-- 触发器修复SQL脚本
-- 请在Supabase Dashboard的SQL编辑器中执行此脚本
-- =====================================================


CREATE OR REPLACE FUNCTION handle_approved_submission()
RETURNS TRIGGER AS $$
DECLARE
    new_tool_id UUID;
BEGIN
    -- 只有当状态变为approved且之前不是approved时才执行
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- 检查是否已经有关联的工具ID
        IF NEW.tool_id IS NULL THEN
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
                review_notes,
                published_at
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
                NEW.review_notes,
                NOW()
            ) RETURNING id INTO new_tool_id;
            
            -- 更新提交记录中的tool_id
            NEW.tool_id = new_tool_id;
            
            -- 更新分类的工具数量（如果categories表有tools_count字段）
            UPDATE categories 
            SET tools_count = COALESCE(tools_count, 0) + 1 
            WHERE id = NEW.category_id;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';



-- 删除现有触发器（如果存在）
DROP TRIGGER IF EXISTS handle_submission_approval ON submissions;

-- 创建新触发器
CREATE TRIGGER handle_submission_approval 
  BEFORE UPDATE ON submissions
  FOR EACH ROW 
  EXECUTE FUNCTION handle_approved_submission();


-- 验证触发器是否创建成功
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'handle_submission_approval' 
AND event_object_table = 'submissions';
