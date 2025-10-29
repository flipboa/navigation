// 模拟数据，实际应用中应该从数据库获取

export const categories = [
  { id: "writing", name: "AI写作", icon: "✍️" },
  { id: "image", name: "图像生成", icon: "🖼️" },
  { id: "video", name: "视频制作", icon: "🎬" },
  { id: "audio", name: "语音处理", icon: "🎵" },
  { id: "coding", name: "代码开发", icon: "💻" },
  { id: "design", name: "设计工具", icon: "🎨" },
  { id: "productivity", name: "效率工具", icon: "⚡" },
  { id: "education", name: "教育学习", icon: "📚" },
  { id: "business", name: "商业应用", icon: "💼" },
]

export const hotTools = [
  {
    id: "1",
    name: "豆包",
    slug: "doubao",
    description: "字节跳动推出的免费AI智能助手",
    logo: "/stylized-bean-logo.png",
    category: "writing",
    isHot: true,
  },
  {
    id: "2",
    name: "吐司AI",
    slug: "trae",
    description: "专为视频创作者推出的免费AI编辑工具",
    logo: "/abstract-geometric-logo.png",
    category: "video",
    isHot: true,
  },
  {
    id: "3",
    name: "AIPPT",
    slug: "aippt",
    description: "AI快速生成高质量PPT",
    logo: "/abstract-network-logo.png",
    category: "productivity",
    isHot: true,
  },
  {
    id: "4",
    name: "秘塔AI搜索",
    slug: "meta-search",
    description: "最好用的AI搜索工具，没有广告",
    logo: "/abstract-search-icon.png",
    category: "productivity",
    isHot: true,
  },
]

export const newTools = [
  {
    id: "5",
    name: "讯飞文档",
    slug: "xunfei-doc",
    description: "一键生成PPT和Word",
    logo: "/xunfei-document-icon.png",
    category: "productivity",
    isNew: true,
  },
  {
    id: "6",
    name: "Coze",
    slug: "coze",
    description: "海量AI模型免费用，已接入ChatGPT",
    logo: "/abstract-interconnectedness.png",
    category: "productivity",
    isNew: true,
  },
  {
    id: "7",
    name: "Z.ai",
    slug: "zai",
    description: "智谱面向全球推出的最新AI模型",
    logo: "/abstract-zai.png",
    category: "writing",
    isNew: true,
  },
  {
    id: "8",
    name: "能力方舟",
    slug: "ark",
    description: "应用共创平台，提供开发套件",
    logo: "/placeholder.svg?height=200&width=200&query=ark logo",
    category: "coding",
    isNew: true,
  },
]

// 按分类组织工具
export const toolsByCategory: { [key: string]: any[] } = {
  writing: [
    {
      id: "1",
      name: "豆包",
      slug: "doubao",
      description: "字节跳动推出的免费AI智能助手",
      logo: "/stylized-bean-logo.png",
      category: "writing",
      isHot: true,
    },
    {
      id: "7",
      name: "Z.ai",
      slug: "zai",
      description: "智谱面向全球推出的最新AI模型",
      logo: "/abstract-zai.png",
      category: "writing",
      isNew: true,
    },
    {
      id: "9",
      name: "讯飞星火",
      slug: "xunfei-spark",
      description: "科大讯飞推出的大语言模型",
      logo: "/placeholder.svg?height=200&width=200&query=xunfei spark logo",
      category: "writing",
    },
  ],
  image: [
    {
      id: "10",
      name: "美图设计室",
      slug: "meitu-design",
      description: "AI图像创作和设计平台",
      logo: "/placeholder.svg?height=200&width=200&query=meitu design logo",
      category: "image",
    },
    {
      id: "11",
      name: "稿定设计",
      slug: "gaoding-design",
      description: "一站式AI设计与灵感创作平台",
      logo: "/placeholder.svg?height=200&width=200&query=gaoding design logo",
      category: "image",
    },
  ],
  video: [
    {
      id: "2",
      name: "吐司AI",
      slug: "trae",
      description: "专为视频创作者推出的免费AI编辑工具",
      logo: "/abstract-geometric-logo.png",
      category: "video",
      isHot: true,
    },
  ],
  productivity: [
    {
      id: "3",
      name: "AIPPT",
      slug: "aippt",
      description: "AI快速生成高质量PPT",
      logo: "/abstract-network-logo.png",
      category: "productivity",
      isHot: true,
    },
    {
      id: "4",
      name: "秘塔AI搜索",
      slug: "meta-search",
      description: "最好用的AI搜索工具，没有广告",
      logo: "/abstract-search-icon.png",
      category: "productivity",
      isHot: true,
    },
    {
      id: "5",
      name: "讯飞文档",
      slug: "xunfei-doc",
      description: "一键生成PPT和Word",
      logo: "/xunfei-document-icon.png",
      category: "productivity",
      isNew: true,
    },
    {
      id: "6",
      name: "Coze",
      slug: "coze",
      description: "海量AI模型免费用，已接入ChatGPT",
      logo: "/abstract-interconnectedness.png",
      category: "productivity",
      isNew: true,
    },
  ],
  coding: [
    {
      id: "8",
      name: "能力方舟",
      slug: "ark",
      description: "应用共创平台，提供开发套件",
      logo: "/placeholder.svg?height=200&width=200&query=ark logo",
      category: "coding",
      isNew: true,
    },
  ],
}

// 获取工具详情
export function getToolBySlug(slug: string) {
  // 合并所有工具
  const allTools = [...hotTools, ...newTools, ...Object.values(toolsByCategory).flat()]

  // 去重
  const uniqueTools = allTools.filter((tool, index, self) => index === self.findIndex((t) => t.id === tool.id))

  // 查找匹配的工具
  const tool = uniqueTools.find((tool) => tool.slug === slug)

  if (!tool) return null

  // 添加额外的详细信息
  return {
    ...tool,
    url: `https://example.com/${tool.slug}`,
    coverImage: `/placeholder.svg?height=400&width=1200&query=${encodeURIComponent(tool.name + " cover image")}`,
    content: `<p>${tool.name}是一款强大的AI工具，提供了丰富的功能和简单的操作界面。</p>
              <h2>主要功能</h2>
              <ul>
                <li>功能1：详细描述</li>
                <li>功能2：详细描述</li>
                <li>功能3：详细描述</li>
              </ul>
              <h2>使用场景</h2>
              <p>适用于各种场景的详细描述...</p>
              
              <h2>常见问题</h2>
              <h3>如何开始使用这个工具？</h3>
              <p>注册账号后，您可以直接访问工具主页开始使用。我们提供了详细的新手教程帮助您快速上手。</p>
              
              <h3>这个工具是免费的吗？</h3>
              <p>我们提供基础功能的免费使用，高级功能需要付费订阅。详细的价格方案请参考官网。</p>
              
              <h3>如何联系客服？</h3>
              <p>您可以通过官网的在线客服或发送邮件至support@example.com联系我们的客服团队。</p>`,
    qa: [
      {
        question: "如何开始使用这个工具？",
        answer: "注册账号后，您可以直接访问工具主页开始使用。我们提供了详细的新手教程帮助您快速上手。",
      },
      {
        question: "这个工具是免费的吗？",
        answer: "我们提供基础功能的免费使用，高级功能需要付费订阅。详细的价格方案请参考官网。",
      },
      {
        question: "如何联系客服？",
        answer: "您可以通过官网的在线客服或发送邮件至support@example.com联系我们的客服团队。",
      },
    ],
  }
}
