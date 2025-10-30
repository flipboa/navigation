-- =====================================================
-- 修复提交数据同步问题脚本
-- =====================================================
-- 版本: 1.0
-- 创建时间: 2024年
-- 数据库: Supabase PostgreSQL
-- 
-- 功能说明:
-- 1. 检查并修复触发器函数
-- 2. 手动同步已审核通过但未同步的数据
-- 3. 验证数据同步功能
-- =====================================================

-- =====================================================
-- 第一步: 检查当前数据库状态
-- =====================================================

-- 检查已审核通过但未同步的提交
DO $$
DECLARE
    approved_count INTEGER;
    synced_count INTEGER;
    unsynced_count INTEGER;
BEGIN
    -- 统计已审核通过的提交
    SELECT COUNT(*) INTO approved_count
    FROM submissions 
    WHERE status = 'approved';
    
    -- 统计已同步的提交（有tool_id的）
    SELECT COUNT(*) INTO synced_count
    FROM submissions 
    WHERE status = 'approved' AND tool_id IS NOT NULL;
    
    -- 计算未同步的数量
    unsynced_count := approved_count - synced_count;
    
    RAISE NOTICE '=== 数据同步状态检查 ===';
    RAISE NOTICE '已审核通过的提交总数: %', approved_count;
    RAISE NOTICE '已同步到tools表的数量: %', synced_count;
    RAISE NOTICE '未同步的数量: %', unsynced_count;
    RAISE NOTICE '';
END $$;

-- 检查触发器状态
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name = 'handle_submission_approval' 
    AND event_object_table = 'submissions';
    
    RAISE NOTICE '=== 触发器状态检查 ===';
    RAISE NOTICE 'handle_submission_approval 触发器数量: %', trigger_count;
    
    IF trigger_count = 0 THEN
        RAISE NOTICE '警告: 触发器未找到，需要重新创建';
    ELSE
        RAISE NOTICE '触发器存在，检查函数是否正确';
    END IF;
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 第二步: 修复触发器函数（如果需要）
-- =====================================================

-- 重新创建处理审核通过的函数（修复版本）
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
            
            RAISE NOTICE '已为提交 % 创建工具记录 %', NEW.id, new_tool_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 确保触发器存在
DROP TRIGGER IF EXISTS handle_submission_approval ON submissions;
CREATE TRIGGER handle_submission_approval 
  BEFORE UPDATE ON submissions
  FOR EACH ROW 
  EXECUTE FUNCTION handle_approved_submission();

-- =====================================================
-- 第三步: 手动同步现有已审核通过的数据
-- =====================================================

-- 创建手动同步函数
CREATE OR REPLACE FUNCTION sync_approved_submissions()
RETURNS TABLE (
    submission_id UUID,
    tool_id UUID,
    tool_name VARCHAR,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    submission_record RECORD;
    new_tool_id UUID;
    error_msg TEXT;
BEGIN
    -- 遍历所有已审核通过但未同步的提交
    FOR submission_record IN 
        SELECT * FROM submissions 
        WHERE status = 'approved' 
        AND tool_id IS NULL 
        AND is_latest_version = true
        ORDER BY review_completed_at ASC
    LOOP
        BEGIN
            -- 创建工具记录
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
                submission_record.tool_name,
                NULL, -- slug会由触发器自动生成
                submission_record.tool_description,
                submission_record.tool_content,
                submission_record.tool_website_url,
                submission_record.tool_logo_url,
                submission_record.tool_screenshots,
                submission_record.category_id,
                submission_record.tool_tags,
                submission_record.tool_type,
                submission_record.pricing_info,
                'published',
                submission_record.submitted_by,
                submission_record.reviewed_by,
                submission_record.review_completed_at,
                submission_record.review_notes,
                submission_record.review_completed_at
            ) RETURNING id INTO new_tool_id;
            
            -- 更新提交记录
            UPDATE submissions 
            SET tool_id = new_tool_id 
            WHERE id = submission_record.id;
            
            -- 更新分类工具数量
            UPDATE categories 
            SET tools_count = COALESCE(tools_count, 0) + 1 
            WHERE id = submission_record.category_id;
            
            -- 返回成功结果
            RETURN QUERY SELECT 
                submission_record.id,
                new_tool_id,
                submission_record.tool_name,
                true,
                NULL::TEXT;
                
        EXCEPTION WHEN OTHERS THEN
            -- 捕获错误
            error_msg := SQLERRM;
            
            -- 返回失败结果
            RETURN QUERY SELECT 
                submission_record.id,
                NULL::UUID,
                submission_record.tool_name,
                false,
                error_msg;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 执行同步
DO $$
DECLARE
    sync_result RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== 开始同步已审核通过的提交 ===';
    
    FOR sync_result IN SELECT * FROM sync_approved_submissions() LOOP
        IF sync_result.success THEN
            success_count := success_count + 1;
            RAISE NOTICE '成功同步: % -> 工具ID: %', sync_result.tool_name, sync_result.tool_id;
        ELSE
            error_count := error_count + 1;
            RAISE NOTICE '同步失败: % - 错误: %', sync_result.tool_name, sync_result.error_message;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 同步完成 ===';
    RAISE NOTICE '成功同步: % 个', success_count;
    RAISE NOTICE '同步失败: % 个', error_count;
END $$;

-- =====================================================
-- 第四步: 验证同步结果
-- =====================================================

-- 最终状态检查
DO $$
DECLARE
    approved_count INTEGER;
    synced_count INTEGER;
    unsynced_count INTEGER;
    tools_count INTEGER;
BEGIN
    -- 统计已审核通过的提交
    SELECT COUNT(*) INTO approved_count
    FROM submissions 
    WHERE status = 'approved';
    
    -- 统计已同步的提交
    SELECT COUNT(*) INTO synced_count
    FROM submissions 
    WHERE status = 'approved' AND tool_id IS NOT NULL;
    
    -- 统计工具表中的记录
    SELECT COUNT(*) INTO tools_count
    FROM tools 
    WHERE status = 'published';
    
    unsynced_count := approved_count - synced_count;
    
    RAISE NOTICE '=== 最终同步状态 ===';
    RAISE NOTICE '已审核通过的提交总数: %', approved_count;
    RAISE NOTICE '已同步到tools表的数量: %', synced_count;
    RAISE NOTICE '未同步的数量: %', unsynced_count;
    RAISE NOTICE 'tools表中已发布的工具数量: %', tools_count;
    
    IF unsynced_count = 0 THEN
        RAISE NOTICE '✅ 所有已审核通过的提交都已成功同步！';
    ELSE
        RAISE NOTICE '⚠️  仍有 % 个提交未同步，请检查错误日志', unsynced_count;
    END IF;
END $$;

-- =====================================================
-- 第五步: 创建测试函数
-- =====================================================

-- 创建测试触发器的函数
CREATE OR REPLACE FUNCTION test_submission_trigger()
RETURNS VOID AS $$
DECLARE
    test_submission_id UUID;
    test_tool_id UUID;
    category_uuid UUID;
BEGIN
    -- 获取一个分类ID用于测试
    SELECT id INTO category_uuid FROM categories LIMIT 1;
    
    IF category_uuid IS NULL THEN
        RAISE EXCEPTION '没有找到分类，无法进行测试';
    END IF;
    
    -- 创建测试提交
    INSERT INTO submissions (
        tool_name,
        tool_description,
        tool_website_url,
        category_id,
        status,
        submitted_by,
        submitted_at
    ) VALUES (
        '测试工具-触发器验证',
        '这是一个用于验证触发器功能的测试工具',
        'https://test-trigger.example.com',
        category_uuid,
        'submitted',
        auth.uid(),
        NOW()
    ) RETURNING id INTO test_submission_id;
    
    RAISE NOTICE '创建测试提交: %', test_submission_id;
    
    -- 模拟审核通过
    UPDATE submissions 
    SET 
        status = 'approved',
        reviewed_by = auth.uid(),
        review_notes = '测试触发器功能',
        review_completed_at = NOW()
    WHERE id = test_submission_id;
    
    -- 检查是否自动创建了工具记录
    SELECT tool_id INTO test_tool_id 
    FROM submissions 
    WHERE id = test_submission_id;
    
    IF test_tool_id IS NOT NULL THEN
        RAISE NOTICE '✅ 触发器测试成功！自动创建了工具记录: %', test_tool_id;
        
        -- 清理测试数据
        DELETE FROM tools WHERE id = test_tool_id;
        DELETE FROM submissions WHERE id = test_submission_id;
        
        RAISE NOTICE '测试数据已清理';
    ELSE
        RAISE NOTICE '❌ 触发器测试失败！未自动创建工具记录';
        
        -- 清理测试数据
        DELETE FROM submissions WHERE id = test_submission_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 清理临时函数
DROP FUNCTION IF EXISTS sync_approved_submissions();

RAISE NOTICE '';
RAISE NOTICE '=== 修复脚本执行完成 ===';
RAISE NOTICE '如需测试触发器功能，请执行: SELECT test_submission_trigger();';
RAISE NOTICE '测试完成后可删除测试函数: DROP FUNCTION test_submission_trigger();';