"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function UserLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">个人中心</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/4">
          <UserTabs />
        </div>
        <div className="md:w-3/4">{children}</div>
      </div>
    </div>
  )
}

function UserTabs() {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <h2 className="font-medium mb-4">导航菜单</h2>
      <TabLink href="/user/submissions" label="提交历史" />
      <TabLink href="/user/submit" label="提交表单" />
      <TabLink href="/user/profile" label="个人信息" />
    </div>
  )
}

function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Button variant={isActive ? "default" : "ghost"} className="w-full justify-start" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  )
}
