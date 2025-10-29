-- =====================================================
-- AI工具目录 - Supabase存储Bucket配置
-- =====================================================
-- 创建时间: 2024
-- 描述: 为AI工具目录应用创建三个专用的存储bucket
-- 用途: 1. 分类图标存储 2. 工具Logo存储 3. 工具预览图存储
-- =====================================================

-- =====================================================
-- 1. 创建存储Bucket
-- =====================================================

-- 分类图标存储bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-icons',
  'category-icons',
  true,  -- 公开访问，用于网站显示
  2097152,  -- 2MB文件大小限制
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- 工具Logo存储bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tool-logos',
  'tool-logos',
  true,  -- 公开访问，用于工具卡片显示
  5242880,  -- 5MB文件大小限制
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- 工具预览图存储bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tool-previews',
  'tool-previews',
  true,  -- 公开访问，用于工具详情页显示
  10485760,  -- 10MB文件大小限制
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
);

-- =====================================================
-- 2. 存储安全策略 (RLS Policies)
-- =====================================================

-- 启用RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2.1 分类图标存储策略
-- =====================================================

-- 公开读取策略 - 所有人都可以查看分类图标
CREATE POLICY "category_icons_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'category-icons');

-- 管理员上传策略 - 只有管理员可以上传分类图标
CREATE POLICY "category_icons_admin_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'category-icons' 
  AND auth.jwt() ->> 'role' = 'admin'
);

-- 管理员更新策略 - 只有管理员可以更新分类图标
CREATE POLICY "category_icons_admin_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'category-icons' 
  AND auth.jwt() ->> 'role' = 'admin'
);

-- 管理员删除策略 - 只有管理员可以删除分类图标
CREATE POLICY "category_icons_admin_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'category-icons' 
  AND auth.jwt() ->> 'role' = 'admin'
);

-- =====================================================
-- 2.2 工具Logo存储策略
-- =====================================================

-- 公开读取策略 - 所有人都可以查看工具Logo
CREATE POLICY "tool_logos_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'tool-logos');

-- 用户上传策略 - 认证用户可以上传工具Logo（用于提交工具）
CREATE POLICY "tool_logos_user_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'tool-logos' 
  AND auth.uid() IS NOT NULL
);

-- 所有者更新策略 - 文件所有者可以更新自己的工具Logo
CREATE POLICY "tool_logos_owner_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'tool-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 管理员全权限策略 - 管理员可以管理所有工具Logo
CREATE POLICY "tool_logos_admin_all" ON storage.objects
FOR ALL USING (
  bucket_id = 'tool-logos' 
  AND auth.jwt() ->> 'role' = 'admin'
);

-- 所有者删除策略 - 文件所有者可以删除自己的工具Logo
CREATE POLICY "tool_logos_owner_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'tool-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 2.3 工具预览图存储策略
-- =====================================================

-- 公开读取策略 - 所有人都可以查看工具预览图
CREATE POLICY "tool_previews_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'tool-previews');

-- 用户上传策略 - 认证用户可以上传工具预览图
CREATE POLICY "tool_previews_user_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'tool-previews' 
  AND auth.uid() IS NOT NULL
);

-- 所有者更新策略 - 文件所有者可以更新自己的工具预览图
CREATE POLICY "tool_previews_owner_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'tool-previews' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 管理员全权限策略 - 管理员可以管理所有工具预览图
CREATE POLICY "tool_previews_admin_all" ON storage.objects
FOR ALL USING (
  bucket_id = 'tool-previews' 
  AND auth.jwt() ->> 'role' = 'admin'
);

-- 所有者删除策略 - 文件所有者可以删除自己的工具预览图
CREATE POLICY "tool_previews_owner_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'tool-previews' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 3. 存储辅助函数
-- =====================================================

-- 获取分类图标URL的函数
CREATE OR REPLACE FUNCTION get_category_icon_url(icon_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF icon_path IS NULL OR icon_path = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN format('%s/storage/v1/object/public/category-icons/%s', 
    current_setting('app.supabase_url', true), 
    icon_path
  );
END;
$$;

-- 获取工具Logo URL的函数
CREATE OR REPLACE FUNCTION get_tool_logo_url(logo_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF logo_path IS NULL OR logo_path = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN format('%s/storage/v1/object/public/tool-logos/%s', 
    current_setting('app.supabase_url', true), 
    logo_path
  );
END;
$$;

-- 获取工具预览图URL的函数
CREATE OR REPLACE FUNCTION get_tool_preview_url(preview_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF preview_path IS NULL OR preview_path = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN format('%s/storage/v1/object/public/tool-previews/%s', 
    current_setting('app.supabase_url', true), 
    preview_path
  );
END;
$$;

-- =====================================================
-- 4. 存储清理函数
-- =====================================================

-- 清理未使用的分类图标
CREATE OR REPLACE FUNCTION cleanup_unused_category_icons()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- 删除不再被任何分类使用的图标文件
  WITH unused_icons AS (
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'category-icons'
    AND name NOT IN (
      SELECT icon_path
      FROM categories
      WHERE icon_path IS NOT NULL
    )
  )
  DELETE FROM storage.objects
  WHERE bucket_id = 'category-icons'
  AND name IN (SELECT name FROM unused_icons);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 清理未使用的工具Logo
CREATE OR REPLACE FUNCTION cleanup_unused_tool_logos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- 删除不再被任何工具使用的Logo文件
  WITH unused_logos AS (
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'tool-logos'
    AND name NOT IN (
      SELECT logo_path
      FROM tools
      WHERE logo_path IS NOT NULL
      UNION
      SELECT logo_path
      FROM submissions
      WHERE logo_path IS NOT NULL
    )
  )
  DELETE FROM storage.objects
  WHERE bucket_id = 'tool-logos'
  AND name IN (SELECT name FROM unused_logos);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 清理未使用的工具预览图
CREATE OR REPLACE FUNCTION cleanup_unused_tool_previews()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- 删除不再被任何工具使用的预览图文件
  WITH unused_previews AS (
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'tool-previews'
    AND name NOT IN (
      SELECT preview_path
      FROM tools
      WHERE preview_path IS NOT NULL
      UNION
      SELECT preview_path
      FROM submissions
      WHERE preview_path IS NOT NULL
    )
  )
  DELETE FROM storage.objects
  WHERE bucket_id = 'tool-previews'
  AND name IN (SELECT name FROM unused_previews);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 5. 定期清理任务（可选）
-- =====================================================

-- 创建定期清理的存储过程
CREATE OR REPLACE FUNCTION run_storage_cleanup()
RETURNS TABLE(
  category_icons_deleted INTEGER,
  tool_logos_deleted INTEGER,
  tool_previews_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  icons_deleted INTEGER;
  logos_deleted INTEGER;
  previews_deleted INTEGER;
BEGIN
  -- 执行清理
  SELECT cleanup_unused_category_icons() INTO icons_deleted;
  SELECT cleanup_unused_tool_logos() INTO logos_deleted;
  SELECT cleanup_unused_tool_previews() INTO previews_deleted;
  
  -- 返回清理结果
  RETURN QUERY SELECT icons_deleted, logos_deleted, previews_deleted;
END;
$$;

-- =====================================================
-- 6. 存储统计函数
-- =====================================================

-- 获取存储使用统计
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE(
  bucket_name TEXT,
  file_count BIGINT,
  total_size_bytes BIGINT,
  total_size_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name as bucket_name,
    COUNT(o.id) as file_count,
    COALESCE(SUM(o.metadata->>'size')::BIGINT, 0) as total_size_bytes,
    ROUND(COALESCE(SUM(o.metadata->>'size')::BIGINT, 0) / 1024.0 / 1024.0, 2) as total_size_mb
  FROM storage.buckets b
  LEFT JOIN storage.objects o ON b.id = o.bucket_id
  WHERE b.id IN ('category-icons', 'tool-logos', 'tool-previews')
  GROUP BY b.name
  ORDER BY b.name;
END;
$$;

-- =====================================================
-- 7. 权限设置
-- =====================================================

-- 授予认证用户执行存储相关函数的权限
GRANT EXECUTE ON FUNCTION get_category_icon_url(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tool_logo_url(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tool_preview_url(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_stats() TO authenticated;

-- 授予管理员执行清理函数的权限
-- 注意：这些函数应该只有管理员或系统任务可以执行
GRANT EXECUTE ON FUNCTION cleanup_unused_category_icons() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_unused_tool_logos() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_unused_tool_previews() TO service_role;
GRANT EXECUTE ON FUNCTION run_storage_cleanup() TO service_role;

-- =====================================================
-- 8. 注释和使用说明
-- =====================================================

COMMENT ON FUNCTION get_category_icon_url(TEXT) IS '获取分类图标的完整URL地址';
COMMENT ON FUNCTION get_tool_logo_url(TEXT) IS '获取工具Logo的完整URL地址';
COMMENT ON FUNCTION get_tool_preview_url(TEXT) IS '获取工具预览图的完整URL地址';
COMMENT ON FUNCTION cleanup_unused_category_icons() IS '清理未使用的分类图标文件';
COMMENT ON FUNCTION cleanup_unused_tool_logos() IS '清理未使用的工具Logo文件';
COMMENT ON FUNCTION cleanup_unused_tool_previews() IS '清理未使用的工具预览图文件';
COMMENT ON FUNCTION run_storage_cleanup() IS '执行所有存储清理任务';
COMMENT ON FUNCTION get_storage_stats() IS '获取存储使用统计信息';

-- =====================================================
-- 使用示例：
-- 
-- 1. 上传文件路径规范：
--    - 分类图标: category-icons/{category_slug}.{ext}
--    - 工具Logo: tool-logos/{user_id}/{tool_slug}.{ext}
--    - 工具预览: tool-previews/{user_id}/{tool_slug}/{filename}.{ext}
--
-- 2. 获取URL：
--    SELECT get_category_icon_url('ai-writing.svg');
--    SELECT get_tool_logo_url('user123/chatgpt.png');
--    SELECT get_tool_preview_url('user123/chatgpt/screenshot1.jpg');
--
-- 3. 清理存储：
--    SELECT run_storage_cleanup();
--
-- 4. 查看统计：
--    SELECT * FROM get_storage_stats();
-- =====================================================