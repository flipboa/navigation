# AI工具目录 - 数据库设计方案

## 📋 概述

本目录包含AI工具目录项目的完整数据库设计方案，按表结构分类组织，便于维护和查阅。

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

## 📁 文档结构

```
design/
├── README.md                 # 本文档 - 总览
├── categories-design.md      # 分类表设计方案
├── tools-design.md          # AI工具表设计方案
└── submissions-design.md    # 提交记录表设计方案
```

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