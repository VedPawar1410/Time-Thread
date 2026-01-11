"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Loader2,
  Trash2,
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
import { mapsApi } from "@/lib/supabase";

/** Minimal map data for sidebar display */
interface RecentMap {
  id: string;
  name: string;
  updated_at: string;
}

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

/**
 * Format relative time for display
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

export function Sidebar(): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [recentMaps, setRecentMaps] = useState<RecentMap[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const currentMapId = searchParams.get("map");

  // Fetch recent maps on mount
  useEffect(() => {
    loadRecentMaps();
  }, []);

  const loadRecentMaps = async () => {
    setLoading(true);
    try {
      const maps = await mapsApi.getRecent(10);
      setRecentMaps(maps);
    } catch (error) {
      console.error("Failed to load recent maps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMap = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm("Delete this map?")) {
      await mapsApi.delete(id);
      setRecentMaps((prev) => prev.filter((m) => m.id !== id));
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex flex-col h-full bg-card border-r border-border transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 h-16 flex-shrink-0">
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
        <nav className="flex-1 p-2 overflow-hidden flex flex-col">
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
                  <Button size="icon" className="w-full" asChild>
                    <Link href="/dashboard">
                      <Plus className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">New Graph</TooltipContent>
              </Tooltip>
            ) : (
              <Button className="w-full gap-2" asChild>
                <Link href="/dashboard">
                  <Plus className="h-4 w-4" />
                  New Graph
                </Link>
              </Button>
            )}
          </div>

          {/* Recent Maps */}
          {!collapsed && (
            <div className="mt-6 flex-1 min-h-0 flex flex-col">
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Maps
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={loadRecentMaps}
                >
                  <History className="h-3 w-3" />
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : recentMaps.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No saved maps yet
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Process a video to get started
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <ul className="space-y-1 px-2">
                    {recentMaps.map((map) => (
                      <li key={map.id}>
                        <Link
                          href={`/dashboard?map=${map.id}`}
                          className={cn(
                            "group flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                            currentMapId === map.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          )}
                        >
                          <FolderOpen className="h-4 w-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{map.name}</p>
                            <p className="text-xs text-muted-foreground/70">
                              {formatRelativeTime(map.updated_at)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteMap(map.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          )}
        </nav>

        <Separator />

        {/* Bottom Navigation */}
        <nav className="p-2 flex-shrink-0">
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
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center hover:bg-secondary transition-colors z-10"
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
