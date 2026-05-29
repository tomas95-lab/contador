"use client"

import * as React from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { AppSection } from "@/types/accounting"

export function NavSecondary({
  activeItem,
  items,
  onSelect,
  ...props
}: {
  activeItem: AppSection
  items: {
    id: AppSection
    title: string
    icon: React.ReactNode
  }[]
  onSelect: (section: AppSection) => void
} & Omit<React.ComponentPropsWithoutRef<typeof SidebarGroup>, "onSelect">) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={activeItem === item.id}
                onClick={() => onSelect(item.id)}
                tooltip={item.title}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
