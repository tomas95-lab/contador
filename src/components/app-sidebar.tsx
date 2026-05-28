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
} from "lucide-react"
import type { AppSection } from "@/types/accounting"

const navMainItems: {
  id: AppSection
  title: string
  icon: React.ReactNode
  badgeCount?: number
  hidden?: boolean
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
    // HIDDEN: mostrar cuando esté listo.
    hidden: true,
  },
]

const data = {
  navSecondary: [
    {
      id: "configuracion" as AppSection,
      title: "Configuración",
      icon: <Settings2Icon />,
    },
    {
      id: "ayuda" as AppSection,
      title: "Ayuda",
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
      navMainItems
        .filter((item) => !item.hidden)
        .map((item) =>
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
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              onClick={() => onSectionChange("resumen")}
            >
              <ReceiptIcon className="size-5!" />
              <span className="text-base font-semibold">contable.</span>
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
        <NavSecondary
          activeItem={activeSection}
          className="mt-auto"
          items={data.navSecondary}
          onSelect={onSectionChange}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser onSignOut={onSignOut} user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
