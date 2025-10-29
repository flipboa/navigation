import type React from "react"
import type { Metadata } from "next"
import UserLayoutClient from "./UserLayoutClient"

export const metadata: Metadata = {
  title: "个人中心 - AI工具集",
  description: "管理您的AI工具提交和个人信息",
}

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <UserLayoutClient children={children} />
}
