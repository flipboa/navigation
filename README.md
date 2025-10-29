# AI工具目录 🤖

一个现代化的AI工具发现和分享平台，帮助用户发现、分享和管理各种AI工具。

## 📋 项目概述

AI工具目录是一个基于Next.js 15和Supabase构建的全栈Web应用，提供了一个直观的界面来浏览、搜索和提交AI工具。项目采用现代化的技术栈，包括TypeScript、Tailwind CSS和Radix UI组件库，具备完整的数据库设计和用户管理系统。

## ✨ 主要功能

### 🔍 工具发现
- **分类浏览**: 按AI写作、图像生成、视频制作、语音处理等9个主要分类浏览工具
- **热门推荐**: 展示当前最受欢迎的AI工具（豆包、吐司AI、AIPPT等）
- **最新工具**: 发现最新添加的AI工具（讯飞文档、Coze、Z.ai等）
- **搜索功能**: 快速搜索特定的AI工具
- **工具详情**: 详细的工具介绍页面，支持外链跳转

### 👤 用户系统
- **用户注册/登录**: 基于Supabase Auth的安全认证系统
- **个人资料管理**: 管理用户昵称、邮箱和角色信息
- **工具提交**: 用户可以提交新的AI工具，支持审核流程
- **提交历史**: 查看个人提交的工具记录和审核状态
- **权限管理**: 支持普通用户、审核员、管理员三种角色

### 🎨 用户界面
- **响应式设计**: 完美适配桌面端和移动端
- **现代化UI**: 基于Radix UI和Tailwind CSS的精美界面
- **深色模式**: 支持明暗主题切换（next-themes）
- **流畅动画**: 丰富的交互动画效果（tailwindcss-animate）
- **组件化设计**: 高度模块化的组件架构

## 🛠️ 技术栈

### 前端技术
- **Next.js 15**: React全栈框架，支持App Router和服务端渲染
- **React 19**: 最新版本的React框架
- **TypeScript 5**: 类型安全的JavaScript超集
- **Tailwind CSS 3.4**: 实用优先的CSS框架
- **Radix UI**: 无障碍的UI组件库（30+组件）
- **Lucide React**: 现代化的图标库
- **React Hook Form**: 高性能表单处理
- **Zod**: TypeScript优先的模式验证

### 后端服务
- **Supabase**: 开源的Firebase替代方案
  - PostgreSQL数据库
  - 实时数据同步
  - 用户认证系统
  - 行级安全策略(RLS)
  - 文件存储服务

### 开发工具
- **pnpm**: 快速、节省磁盘空间的包管理器
- **ESLint**: 代码质量检查
- **PostCSS**: CSS后处理器
- **Autoprefixer**: CSS自动添加浏览器前缀

## 📁 项目结构

```
ai-tools-directory/
├── app/                    # Next.js App Router页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局组件
│   ├── loading.tsx        # 全局加载组件
│   ├── page.tsx           # 首页（工具展示）
│   ├── login/             # 登录页面
│   ├── signup/            # 注册页面
│   ├── tool/              # 工具详情页面
│   │   └── [slug]/        # 动态路由工具详情
│   └── user/              # 用户中心
│       ├── UserLayoutClient.tsx # 用户中心客户端布局
│       ├── layout.tsx     # 用户中心布局
│       ├── profile/       # 个人资料管理
│       ├── submissions/   # 提交历史查看
│       └── submit/        # 工具提交表单
├── components/            # React组件库
│   ├── ui/               # 基础UI组件(30+ Radix UI组件)
│   │   ├── button.tsx    # 按钮组件
│   │   ├── card.tsx      # 卡片组件
│   │   ├── dialog.tsx    # 对话框组件
│   │   ├── form.tsx      # 表单组件
│   │   ├── input.tsx     # 输入框组件
│   │   ├── toast.tsx     # 提示组件
│   │   └── ...           # 其他UI组件
│   ├── auth-provider.tsx # 认证上下文提供者
│   ├── category-sidebar.tsx # 分类侧边栏
│   ├── file-uploader.tsx # 文件上传组件
│   ├── header.tsx        # 页面头部导航
│   ├── theme-provider.tsx # 主题切换提供者
│   └── tool-card.tsx     # 工具卡片组件
├── lib/                  # 工具库和配置
│   ├── supabase/         # Supabase客户端配置
│   │   ├── client.ts     # 客户端配置
│   │   ├── middleware.ts # 中间件配置
│   │   └── server.ts     # 服务端配置
│   ├── auth.ts           # 认证相关函数
│   ├── data.ts           # 模拟数据（9个分类，20+工具）
│   └── utils.ts          # 工具函数（cn, clsx等）
├── database/             # 数据库设计文档
│   ├── README.md         # 数据库文档总览
│   ├── design/           # 详细设计文档
│   │   ├── README.md     # 设计方案总览
│   │   ├── categories-design.md  # 分类表设计
│   │   ├── tools-design.md       # 工具表设计
│   │   ├── submissions-design.md # 提交表设计
│   │   ├── profiles-design.md    # 用户表设计
│   │   └── storage-design.md     # 存储设计
│   ├── categories.sql    # 分类表创建脚本
│   ├── tools.sql         # 工具表创建脚本
│   ├── submissions.sql   # 提交表创建脚本
│   ├── profiles.sql      # 用户表创建脚本
│   └── storage.sql       # 存储桶配置脚本
├── hooks/                # 自定义React Hooks
│   ├── use-mobile.tsx    # 移动端检测Hook
│   └── use-toast.ts      # 提示消息Hook
├── public/               # 静态资源
│   ├── *.png            # 工具Logo图片
│   ├── *.svg            # 矢量图标
│   └── placeholder.*    # 占位符图片
├── middleware.ts         # Next.js中间件（认证）
├── components.json       # shadcn/ui配置
├── tailwind.config.ts    # Tailwind CSS配置
├── tsconfig.json         # TypeScript配置
├── package.json          # 项目依赖配置
└── .env.example          # 环境变量示例
```

## 🚀 快速开始

### 环境要求
- **Node.js**: 18.0+ (推荐使用最新LTS版本)
- **pnpm**: 8.0+ (快速的包管理器)
- **Supabase账户**: 用于数据库和认证服务

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd ai-tools-directory
```

2. **安装依赖**
```bash
pnpm install
```

3. **环境配置**
创建 `.env.local` 文件并配置Supabase环境变量:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **数据库设置**
在Supabase控制台中执行以下SQL脚本:
```bash
# 按顺序执行数据库脚本
database/profiles.sql      # 用户资料表
database/categories.sql    # 分类表
database/tools.sql         # 工具表
database/submissions.sql   # 提交记录表
database/storage.sql       # 存储桶配置
```

5. **启动开发服务器**
```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 生产部署
```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 📊 数据库设计

### 核心表结构

项目设计了完整的数据库架构，包含5个核心表：

#### 1. 用户资料表 (profiles)
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'reviewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. 分类表 (categories)
```sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20) DEFAULT '#6366f1',
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. AI工具表 (tools)
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

#### 4. 提交记录表 (submissions)
```sql
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name VARCHAR(200) NOT NULL,
  tool_description TEXT NOT NULL,
  website_url VARCHAR(500) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  logo_url VARCHAR(500),
  screenshots JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  tool_type tool_type DEFAULT 'free',
  pricing_info JSONB DEFAULT '{}',
  status submission_status DEFAULT 'submitted',
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  tool_id UUID REFERENCES tools(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. 存储桶配置 (storage)
- **category-icons**: 分类图标存储（2MB限制）
- **tool-logos**: 工具Logo存储（5MB限制）
- **tool-previews**: 工具预览图存储（10MB限制）

### 安全策略 (RLS)
- **行级安全**: 所有表都启用RLS策略
- **权限控制**: 基于用户角色的细粒度权限
- **数据隔离**: 用户只能访问自己的数据
- **审核流程**: 严格的提交审核机制

### 性能优化
- **索引策略**: 主键、外键、查询字段索引
- **JSON索引**: GIN索引支持JSON字段搜索
- **全文搜索**: 支持中文全文搜索
- **统计字段**: 通过触发器维护统计数据

## 🎯 核心功能实现

### 工具分类系统
项目支持9个主要AI工具分类，每个分类都有对应的图标和工具：

| 分类 | 图标 | 代表工具 | 说明 |
|------|------|----------|------|
| AI写作 | ✍️ | 豆包、Z.ai、讯飞星火 | 智能写作助手和大语言模型 |
| 图像生成 | 🖼️ | 美图设计室、稿定设计 | AI图像创作和设计平台 |
| 视频制作 | 🎬 | 吐司AI | 视频编辑和创作工具 |
| 语音处理 | 🎵 | - | 语音识别、合成、处理工具 |
| 代码开发 | 💻 | 能力方舟 | 编程辅助和开发工具 |
| 设计工具 | 🎨 | - | UI/UX设计和创意工具 |
| 效率工具 | ⚡ | AIPPT、秘塔AI搜索、讯飞文档、Coze | 提升工作效率的AI工具 |
| 教育学习 | 📚 | - | 学习辅助和教育工具 |
| 商业应用 | 💼 | - | 企业级AI解决方案 |

### 用户认证流程
1. **注册/登录**: 基于Supabase Auth的邮箱认证
2. **资料创建**: 自动创建用户资料记录
3. **角色管理**: 支持用户、审核员、管理员三种角色
4. **会话管理**: 自动处理登录状态和权限验证
5. **安全策略**: RLS确保数据访问安全

### 工具提交审核流程
1. **用户提交**: 填写工具信息和上传资源
2. **状态管理**: 草稿 → 已提交 → 审核中 → 已批准/已拒绝
3. **审核记录**: 完整的审核历史和评论
4. **自动发布**: 审核通过后自动创建工具记录
5. **通知系统**: 状态变更通知用户

### 响应式设计实现
- **移动端优先**: 基于Tailwind CSS的响应式设计
- **桌面端**: 显示完整的侧边栏导航和工具网格
- **移动端**: 使用抽屉式导航和垂直布局
- **触摸优化**: 适配移动设备的触摸交互
- **性能优化**: 图片懒加载和组件按需渲染

## 🔧 开发指南

### 添加新工具
在 <mcfile name="data.ts" path="lib/data.ts"></mcfile> 中添加工具数据:
```typescript
{
  id: "unique-id",
  name: "工具名称",
  slug: "tool-slug",
  description: "工具描述",
  logo: "/logo-path.png",
  category: "category-id",
  isHot: false,
  isNew: true
}
```

### 创建新页面
1. 在 `app/` 目录下创建新文件夹
2. 添加 `page.tsx` 文件（必需）
3. 可选添加 `layout.tsx` 用于页面布局
4. 可选添加 `loading.tsx` 用于加载状态

### 添加新组件
1. 在 `components/` 目录下创建组件文件
2. 使用TypeScript定义props接口
3. 遵循现有的命名和结构约定
4. 使用Radix UI组件作为基础

### 数据库操作
```typescript
// 使用Supabase客户端
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// 查询工具
const { data: tools } = await supabase
  .from('tools')
  .select('*')
  .eq('status', 'published')

// 插入提交记录
const { data, error } = await supabase
  .from('submissions')
  .insert({
    tool_name: 'New Tool',
    tool_description: 'Description',
    website_url: 'https://example.com',
    category_id: 'category-uuid'
  })
```

### 样式开发
- 使用Tailwind CSS进行样式开发
- 遵循现有的设计系统和颜色方案
- 使用 `cn()` 函数合并类名
- 优先使用Radix UI组件的变体

## 📝 脚本命令

```bash
# 开发模式 - 启动开发服务器
pnpm dev

# 构建生产版本 - 优化打包
pnpm build

# 启动生产服务器 - 运行构建后的应用
pnpm start

# 代码检查 - ESLint检查代码质量
pnpm lint

# 类型检查 - TypeScript类型验证
pnpm type-check
```

## 🧪 测试

### 用户注册测试
项目包含用户注册功能的测试脚本 <mcfile name="test-registration-final.js" path="test-registration-final.js"></mcfile>，用于验证：
- 用户注册流程
- 数据库连接
- 认证系统集成

### 手动测试清单
- [ ] 用户注册/登录功能
- [ ] 工具分类浏览
- [ ] 工具搜索功能
- [ ] 工具详情页面
- [ ] 用户资料管理
- [ ] 工具提交流程
- [ ] 响应式设计测试
- [ ] 深色模式切换

## 🤝 贡献指南

### 开发流程
1. **Fork项目**: 从主仓库Fork到个人账户
2. **创建分支**: `git checkout -b feature/AmazingFeature`
3. **开发功能**: 遵循代码规范和设计原则
4. **测试验证**: 确保功能正常且不破坏现有功能
5. **提交代码**: `git commit -m 'Add some AmazingFeature'`
6. **推送分支**: `git push origin feature/AmazingFeature`
7. **创建PR**: 创建Pull Request并描述变更内容

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循ESLint配置的代码风格
- 组件使用PascalCase命名
- 文件使用kebab-case命名
- 提交信息使用英文，格式清晰

### 设计原则
- 移动端优先的响应式设计
- 无障碍访问支持
- 性能优化优先
- 用户体验至上
- 代码可维护性

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目和服务提供商：

- [Next.js](https://nextjs.org/) - React全栈框架
- [Supabase](https://supabase.com/) - 开源后端服务
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Radix UI](https://www.radix-ui.com/) - 无障碍UI组件
- [Lucide](https://lucide.dev/) - 图标库
- [React Hook Form](https://react-hook-form.com/) - 表单处理
- [Zod](https://zod.dev/) - 模式验证
- [next-themes](https://github.com/pacocoursey/next-themes) - 主题切换

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交Issue: [GitHub Issues](https://github.com/your-repo/issues)
- 功能请求: [GitHub Discussions](https://github.com/your-repo/discussions)
- 邮件联系: your-email@example.com

---

**AI工具目录** - 发现最好的AI工具，提升工作效率 🚀