"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface FileUploaderProps {
  value: string
  onChange: (value: string) => void
  accept?: string
  maxSize?: number
  previewWidth?: number
  previewHeight?: number
}

export function FileUploader({
  value,
  onChange,
  accept = "image/*",
  maxSize = 1024 * 1024, // 1MB
  previewWidth = 200,
  previewHeight = 200,
}: FileUploaderProps) {
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSize) {
      toast({
        title: "文件过大",
        description: `文件大小不能超过 ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive",
      })
      return
    }

    // 在实际应用中，这里应该上传文件到服务器或CDN
    // 这里我们使用本地URL模拟
    const reader = new FileReader()
    reader.onload = () => {
      onChange(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (file.size > maxSize) {
      toast({
        title: "文件过大",
        description: `文件大小不能超过 ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive",
      })
      return
    }

    // 在实际应用中，这里应该上传文件到服务器或CDN
    // 这里我们使用本地URL模拟
    const reader = new FileReader()
    reader.onload = () => {
      onChange(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    onChange("")
  }

  return (
    <div>
      {value ? (
        <div className="relative">
          <div
            style={{
              width: previewWidth,
              height: previewHeight,
              position: "relative",
            }}
            className="border rounded-md overflow-hidden"
          >
            <Image src={value || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-md p-6 text-center ${isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/20"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-2">拖放文件到此处，或</p>
          <Input type="file" accept={accept} onChange={handleFileChange} className="hidden" id="file-upload" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            选择文件
          </Button>
        </div>
      )}
    </div>
  )
}
