"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { getActiveCategories, CategoryForUI } from "@/lib/services/categories"
import { FileUploader } from "@/components/file-uploader"
import { submissionService } from "@/lib/services/submission"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "工具名称至少需要2个字符",
  }),
  slug: z
    .string()
    .min(2, {
      message: "Slug至少需要2个字符",
    })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug只能包含小写字母、数字和连字符",
    }),
  url: z.string().url({
    message: "请输入有效的URL",
  }),
  category: z.string().min(1, {
    message: "请选择一个分类",
  }),
  description: z
    .string()
    .min(10, {
      message: "简短描述至少需要10个字符",
    })
    .max(200, {
      message: "简短描述不能超过200个字符",
    }),
  content: z.string().min(50, {
    message: "详细介绍至少需要50个字符",
  }),
  logo: z.string().min(1, {
    message: "请上传Logo",
  }),
  coverImage: z.string().min(1, {
    message: "请上传预览图",
  }),
})

export default function SubmitPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<CategoryForUI[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  // 获取分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getActiveCategories()
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        toast({
          title: "获取分类失败",
          description: "无法加载分类数据，请刷新页面重试",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [toast])

  // 如果是编辑模式，这里可以根据editId获取已有数据
  const defaultValues = editId
    ? {
        name: "AI写作助手",
        slug: "ai-writing-assistant",
        url: "https://example.com/ai-writing",
        category: "writing",
        description: "一款智能AI写作助手，帮助您快速生成高质量文章",
        content:
          "这是一款强大的AI写作工具，可以帮助用户快速生成各种类型的文章，包括博客、社交媒体内容、产品描述等。\n\n## 主要功能\n\n- 智能文章生成\n- 多种文体风格\n- 语法检查和优化\n- 多语言支持",
        logo: "/digital-pen-logo.png",
        coverImage: "/ai-writing-tool-dashboard.png",
      }
    : {
        name: "",
        slug: "",
        url: "",
        category: "",
        description: "",
        content: "",
        logo: "",
        coverImage: "",
      }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      // 找到对应的分类
      const selectedCategory = categories.find(cat => cat.slug === values.category)
      if (!selectedCategory) {
        throw new Error('无效的分类选择')
      }

      // 使用智能提交服务
      const result = await submissionService.submitTool({
        tool_name: values.name,
        tool_description: values.description,
        tool_content: values.content,
        tool_website_url: values.url,
        category_id: selectedCategory.id, // 使用数据库中的UUID id
        tool_logo_url: values.logo,
        tool_screenshots: values.coverImage ? [values.coverImage] : [],
        tool_tags: [], // 可以后续添加标签功能
        tool_type: 'free', // 默认免费，可以后续添加定价选择
        pricing_info: {},
        submitter_name: '', // 从用户资料获取
        submitter_email: '', // 从用户资料获取
        submission_notes: editId ? '更新现有工具' : '新工具提交',
      })

      toast({
        title: editId ? "更新成功" : "提交成功",
        description: result.message,
        variant: result.auto_approved ? "default" : "default",
      })

      // 根据结果决定跳转页面
      if (result.auto_approved) {
        // 自动通过的跳转到首页查看
        router.push("/")
      } else {
        // 需要审核的跳转到提交历史页面
        router.push("/user/submissions")
      }
    } catch (error) {
      console.error('提交失败:', error)
      toast({
        title: "提交失败",
        description: error instanceof Error ? error.message : "未知错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="max-w-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>网站名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：AI写作助手" {...field} />
                  </FormControl>
                  <FormDescription>输入AI工具的名称，这将显示在工具卡片上</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>网站Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：ai-writing-assistant" {...field} />
                  </FormControl>
                  <FormDescription>用于URL的唯一标识符，只能包含小写字母、数字和连字符</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>网站URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormDescription>输入AI工具的官方网站地址</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分类</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                    </FormControl>
                        <SelectContent>
                      {isLoadingCategories ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">加载中...</div>
                      ) : (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.icon} {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>选择最适合该工具的分类</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>工具概要</FormLabel>
                  <FormControl>
                    <Textarea placeholder="简短描述该工具的主要功能和用途" className="resize-none" {...field} />
                  </FormControl>
                  <FormDescription>简短描述该工具的主要功能和用途，不超过200个字符</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>工具详细介绍</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="详细介绍该工具的功能、特点、使用方法等"
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>支持Markdown格式，详细介绍该工具的功能、特点、使用方法等</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>网站Logo</FormLabel>
                  <FormControl>
                    <FileUploader
                      value={field.value}
                      onChange={field.onChange}
                      accept="image/*"
                      maxSize={1024 * 1024} // 1MB
                      previewHeight={100}
                      previewWidth={100}
                    />
                  </FormControl>
                  <FormDescription>上传工具的Logo图片，建议尺寸为200x200像素，格式为PNG或JPG</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>网站预览图</FormLabel>
                  <FormControl>
                    <FileUploader
                      value={field.value}
                      onChange={field.onChange}
                      accept="image/*"
                      maxSize={2 * 1024 * 1024} // 2MB
                      previewHeight={200}
                      previewWidth={400}
                    />
                  </FormControl>
                  <FormDescription>上传工具的预览图，建议尺寸为1200x630像素，格式为PNG或JPG</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "提交中..." : editId ? "更新工具" : "提交工具"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
