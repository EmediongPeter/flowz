import { Home, BookOpen, BookMarked, DollarSign, ShoppingCart, FileText, Users, Package, Wallet, ChevronDown, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Journal Entry", url: "/dashboard/entry", icon: BookOpen },
  { title: "Risk Analytics", url: "/dashboard/analytics", icon: Shield },
];

const bookItems = [
  { title: "Ledger Books", url: "/dashboard/ledger", icon: BookMarked },
  { title: "Cash Book", url: "/dashboard/cash", icon: DollarSign },
  { title: "Bank Book", url: "/dashboard/bank", icon: Wallet },
  { title: "Sales Book", url: "/dashboard/sales", icon: ShoppingCart },
  { title: "Purchase Book", url: "/dashboard/purchase", icon: FileText },
  { title: "Accounts Payable", url: "/dashboard/payable", icon: Users },
  { title: "Accounts Receivable", url: "/dashboard/receivable", icon: Users },
  { title: "Inventory Book", url: "/dashboard/inventory", icon: Package },
  { title: "Payroll", url: "/dashboard/payroll", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [booksOpen, setBooksOpen] = useState(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="bg-sidebar-primary p-2 rounded-lg">
              <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-lg">Flow Books</h2>
                <p className="text-xs text-sidebar-foreground/70">Bookkeeping</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible open={booksOpen} onOpenChange={setBooksOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors flex items-center justify-between">
                <span>Books of Account</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${booksOpen ? "rotate-180" : ""}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {bookItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
