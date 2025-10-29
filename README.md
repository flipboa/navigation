# AI工具目录 🤖

一个现代化的AI工具发现和分享平台，帮助用户发现、分享和管理各种AI工具。

## 📋 项目概述

AI工具目录是一个基于Next.js 15和Supabase构建的全栈Web应用，提供了一个直观的界面来浏览、搜索和提交AI工具。项目采用现代化的技术栈，包括TypeScript、Tailwind CSS和Radix UI组件库。

## ✨ 主要功能

### 🔍 工具发现
- **分类浏览**: 按AI写作、图像生成、视频制作、语音处理等9个主要分类浏览工具
- **热门推荐**: 展示当前最受欢迎的AI工具
- **最新工具**: 发现最新添加的AI工具
- **搜索功能**: 快速搜索特定的AI工具

### 👤 用户系统
- **用户注册/登录**: 支持邮箱和昵称登录
- **个人资料管理**: 管理用户昵称和基本信息
- **工具提交**: 用户可以提交新的AI工具
- **提交历史**: 查看个人提交的工具记录

### 🎨 用户界面
- **响应式设计**: 适配桌面端和移动端
- **现代化UI**: 基于Radix UI和Tailwind CSS的精美界面
- **深色模式**: 支持明暗主题切换
- **流畅动画**: 丰富的交互动画效果

## 🛠️ 技术栈

### 前端技术
- **Next.js 15**: React全栈框架，支持App Router
- **TypeScript**: 类型安全的JavaScript超集
- **Tailwind CSS**: 实用优先的CSS框架
- **Radix UI**: 无障碍的UI组件库
- **Lucide React**: 现代化的图标库

### 后端服务
- **Supabase**: 开源的Firebase替代方案
  - PostgreSQL数据库
  - 实时数据同步
  - 用户认证系统
  - 行级安全策略(RLS)

### 开发工具
- **pnpm**: 快速、节省磁盘空间的包管理器
- **ESLint**: 代码质量检查
- **PostCSS**: CSS后处理器

## 📁 项目结构

```
ai-tools-directory/
├── app/                    # Next.js App Router页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局组件
│   ├── page.tsx           # 首页
│   ├── login/             # 登录页面
│   ├── signup/            # 注册页面
│   ├── tool/              # 工具详情页面
│   └── user/              # 用户中心
│       ├── profile/       # 个人资料
│       ├── submissions/   # 提交历史
│       └── submit/        # 提交工具
├── components/            # React组件
│   ├── ui/               # 基础UI组件(Radix UI)
│   ├── auth-provider.tsx # 认证上下文
│   ├── category-sidebar.tsx # 分类侧边栏
│   ├── header.tsx        # 页面头部
│   └── tool-card.tsx     # 工具卡片
├── lib/                  # 工具库和配置
│   ├── supabase/         # Supabase客户端配置
│   ├── auth.ts           # 认证相关函数
│   ├── data.ts           # 模拟数据
│   └── utils.ts          # 工具函数
├── database/             # 数据库脚本
│   ├── schema.sql        # 数据库结构
│   └── profiles_table.sql # 用户表创建脚本
├── public/               # 静态资源
└── hooks/                # 自定义React Hooks
```

## 🚀 快速开始

### 环境要求
- Node.js 18.0+
- pnpm 8.0+
- Supabase账户

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
- `database/schema.sql` - 创建基础表结构
- `database/profiles_table.sql` - 创建用户资料表

5. **启动开发服务器**
```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📊 数据库设计

### 用户资料表 (profiles)
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 安全策略
- 启用行级安全策略(RLS)
- 用户只能查看和修改自己的数据
- 自动更新时间戳

## 🎯 核心功能实现

### 工具分类系统
项目支持9个主要AI工具分类:
- ✍️ AI写作
- 🖼️ 图像生成  
- 🎬 视频制作
- 🎵 语音处理
- 💻 代码开发
- 🎨 设计工具
- ⚡ 效率工具
- 📚 教育学习
- 💼 商业应用

### 用户认证流程
1. 支持邮箱和昵称登录
2. 注册时自动创建用户资料
3. 基于Supabase Auth的安全认证
4. 自动处理会话管理

### 响应式设计
- 移动端优先的设计理念
- 桌面端显示侧边栏导航
- 移动端使用抽屉式导航
- 流畅的触摸交互体验

## 🔧 开发指南

### 添加新工具
在 `lib/data.ts` 中添加工具数据:
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
2. 添加 `page.tsx` 文件
3. 可选添加 `layout.tsx` 用于页面布局

### 添加新组件
1. 在 `components/` 目录下创建组件文件
2. 使用TypeScript定义props接口
3. 遵循现有的命名和结构约定

## 📝 脚本命令

```bash
# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint
```

## 🤝 贡献指南

1. Fork项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React全栈框架
- [Supabase](https://supabase.com/) - 开源后端服务
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Radix UI](https://www.radix-ui.com/) - 无障碍UI组件
- [Lucide](https://lucide.dev/) - 图标库

---

如有问题或建议，欢迎提交Issue或联系项目维护者。