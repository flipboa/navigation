-- AI工具目录项目数据库表创建语句
-- 创建时间: 2024年
-- 数据库: Supabase PostgreSQL

-- =====================================================
-- 1. 用户资料表 (profiles)
-- =====================================================
-- 存储用户的基本信息，包括昵称、邮箱等
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 启用行级安全策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看和修改自己的profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 允许插入profile数据（注册时使用）
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- 创建触发器以自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. AI工具表 (tools) - 建议添加
-- =====================================================
-- 存储AI工具的详细信息
-- 注意：目前项目使用的是静态数据，如需数据库存储可使用此表
/*
CREATE TABLE IF NOT EXISTS tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  url VARCHAR(500),
  logo VARCHAR(500),
  cover_image VARCHAR(500),
  category VARCHAR(100) NOT NULL,
  content TEXT,
  is_hot BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tools_slug ON tools(slug);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_submitted_by ON tools(submitted_by);

-- 启用行级安全策略
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Anyone can view approved tools" ON tools
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view own submissions" ON tools
  FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "Users can insert tools" ON tools
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update own tools" ON tools
  FOR UPDATE USING (auth.uid() = submitted_by);

-- 创建触发器以自动更新updated_at字段
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/

-- =====================================================
-- 3. 工具分类表 (categories) - 建议添加
-- =====================================================
-- 存储工具分类信息
-- 注意：目前项目使用的是静态数据，如需数据库存储可使用此表
/*
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认分类数据
INSERT INTO categories (id, name, icon, sort_order) VALUES
('writing', 'AI写作', '✍️', 1),
('image', '图像生成', '🖼️', 2),
('video', '视频制作', '🎬', 3),
('audio', '语音处理', '🎵', 4),
('coding', '代码开发', '💻', 5),
('design', '设计工具', '🎨', 6),
('productivity', '效率工具', '⚡', 7),
('education', '教育学习', '📚', 8),
('business', '商业应用', '💼', 9)
ON CONFLICT (id) DO NOTHING;

-- 启用行级安全策略
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 创建策略：所有人都可以查看分类
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

-- 创建触发器以自动更新updated_at字段
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/

-- =====================================================
-- 4. 用户提交记录表 (submissions) - 建议添加
-- =====================================================
-- 跟踪用户的工具提交历史
-- 注意：目前项目使用的是静态数据，如需数据库存储可使用此表
/*
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_tool_id ON submissions(tool_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- 启用行级安全策略
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can view own submissions" ON submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert submissions" ON submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
*/

-- =====================================================
-- 执行说明
-- =====================================================
-- 1. 当前项目只需要执行 profiles 表的创建语句
-- 2. 其他表（tools, categories, submissions）目前使用静态数据
-- 3. 如果将来需要将静态数据迁移到数据库，可以取消注释相应的表创建语句
-- 4. 请在 Supabase 控制台的 SQL 编辑器中执行所需的语句