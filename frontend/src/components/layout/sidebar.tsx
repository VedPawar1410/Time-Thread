"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitBranch,
  Home,
  Upload,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

const mainNavItems: SidebarItem[] = [
  { icon: <Home className="h-5 w-5" />, label: "Home", href: "/" },
  {
    icon: <GitBranch className="h-5 w-5" />,
    label: "Dashboard",
    href: "/dashboard",
    active: true,
  },
  { icon: <Upload className="h-5 w-5" />, label: "Import", href: "/import" },
  { icon: <History className="h-5 w-5" />, label: "History", href: "/history" },
];

const bottomNavItems: SidebarItem[] = [
  {
    icon: <Settings className="h-5 w-5" />,
    label: "Settings",
    href: "/settings",
  },
];

// Mock recent graphs - replace with actual data from API
const recentGraphs = [
  { id: "1", name: "Podcast Episode 42", updatedAt: "2 hours ago" },
  { id: "2", name: "Interview Notes", updatedAt: "Yesterday" },
  { id: "3", name: "Lecture: ML Basics", updatedAt: "3 days ago" },
];

export function Sidebar(): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex flex-col h-full bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 h-16">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg tracking-tight">
              Time<span className="text-primary">-</span>Thread
            </span>
          )}
        </div>

        <Separator />

        {/* Main Navigation */}
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {mainNavItems.map((item) => (
              <li key={item.href}>
                <NavItem item={item} collapsed={collapsed} />
              </li>
            ))}
          </ul>

          {/* New Graph Button */}
          <div className="mt-4 px-2">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">New Graph</TooltipContent>
              </Tooltip>
            ) : (
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                New Graph
              </Button>
            )}
          </div>

          {/* Recent Graphs */}
          {!collapsed && (
            <div className="mt-6">
              <div className="px-3 mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Graphs
                </span>
              </div>
              <ScrollArea className="h-48">
                <ul className="space-y-1 px-2">
                  {recentGraphs.map((graph) => (
                    <li key={graph.id}>
                      <Link
                        href={`/dashboard?graph=${graph.id}`}
                        className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <FolderOpen className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{graph.name}</p>
                          <p className="text-xs text-muted-foreground/70">
                            {graph.updatedAt}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </nav>

        <Separator />

        {/* Bottom Navigation */}
        <nav className="p-2">
          <ul className="space-y-1">
            {bottomNavItems.map((item) => (
              <li key={item.href}>
                <NavItem item={item} collapsed={collapsed} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center hover:bg-secondary transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}

interface NavItemProps {
  item: SidebarItem;
  collapsed: boolean;
}

function NavItem({ item, collapsed }: NavItemProps): JSX.Element {
  const content = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        item.active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      {item.icon}
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
