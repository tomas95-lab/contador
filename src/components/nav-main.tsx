import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { AppSection } from "@/types/accounting"
import { CirclePlusIcon } from "lucide-react"

type NavMainItem = {
  id: AppSection
  title: string
  icon?: ReactNode
  badgeCount?: number
}

export function NavMain({
  activeItem,
  items,
  onCreatePayment,
  onSelect,
}: {
  activeItem: AppSection
  items: NavMainItem[]
  onCreatePayment: () => void
  onSelect: (section: AppSection) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              onClick={onCreatePayment}
              tooltip="Nuevo cobro"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <CirclePlusIcon />
              <span>Nuevo cobro</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                {item.badgeCount ? (
                  <Badge
                    className="ml-auto h-5 min-w-5 justify-center rounded-full px-1 text-xs"
                    variant="destructive"
                  >
                    {item.badgeCount > 99 ? "99+" : item.badgeCount}
                  </Badge>
                ) : null}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
