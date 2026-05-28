import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  DollarSignIcon,
  MessageSquareIcon,
  Settings2Icon,
  CircleHelpIcon,
  ReceiptIcon,
  TrendingUpIcon,
  UsersRoundIcon,
  PlugZapIcon,
} from "lucide-react"
import type { AppSection } from "@/types/accounting"

const navMainItems: {
  id: AppSection
  title: string
  icon: React.ReactNode
  badgeCount?: number
}[] = [
  {
    id: "resumen",
    title: "Resumen",
    icon: <LayoutDashboardIcon />,
  },
  {
    id: "cobros",
    title: "Cobros",
    icon: <DollarSignIcon />,
  },
  {
    id: "asistente",
    title: "Conta",
    icon: <MessageSquareIcon />,
  },
  {
    id: "facturacion",
    title: "Facturación",
    icon: <ReceiptIcon />,
  },
  {
    id: "proyecciones",
    title: "Proyecciones",
    icon: <TrendingUpIcon />,
  },
  {
    id: "clientes",
    title: "Clientes",
    icon: <UsersRoundIcon />,
  },
  {
    id: "arca",
    title: "Conectar ARCA",
    icon: <PlugZapIcon />,
  },
]

const data = {
  navSecondary: [
    {
      title: "Configuración",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Ayuda",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeSection: AppSection
  onSectionChange: (section: AppSection) => void
  onSignOut: () => void
  unreadAlertCount?: number
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function AppSidebar({
  activeSection,
  onSectionChange,
  onSignOut,
  unreadAlertCount = 0,
  user,
  ...props
}: AppSidebarProps) {
  const mainItems = React.useMemo(
    () =>
      navMainItems.map((item) =>
        item.id === "resumen"
          ? {
              ...item,
              badgeCount: unreadAlertCount,
            }
          : item
      ),
    [unreadAlertCount]
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <ReceiptIcon className="size-5!" />
                <span className="text-base font-semibold">contable.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          activeItem={activeSection}
          items={mainItems}
          onCreatePayment={() => onSectionChange("cobros")}
          onSelect={onSectionChange}
        />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser onSignOut={onSignOut} user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
