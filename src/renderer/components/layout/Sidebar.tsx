import React, { useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Lightbulb,
  Globe,
  Users,
  List,
  PenTool,
  RotateCcw,
  FileDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useProjectStore, type ToggleableFeature } from '@renderer/stores/projectStore';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  feature?: ToggleableFeature;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ideation', label: 'Ideation', icon: Lightbulb, feature: 'ideation' },
  { id: 'worldbuilding', label: 'World', icon: Globe, feature: 'worldbuilding' },
  { id: 'characters', label: 'Characters', icon: Users, feature: 'characters' },
  { id: 'outline', label: 'Outline', icon: List, feature: 'outline' },
  { id: 'manuscript', label: 'Manuscript', icon: PenTool },
  { id: 'revision', label: 'Revision', icon: RotateCcw },
  { id: 'export', label: 'Export', icon: FileDown },
];

export function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    currentSection,
    setCurrentSection,
    projectInfo,
  } = useProjectStore();

  const enabledFeatures = projectInfo?.enabledFeatures;

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) => !item.feature || enabledFeatures?.[item.feature] !== false,
      ),
    [enabledFeatures],
  );

  useEffect(() => {
    const current = NAV_ITEMS.find((i) => i.id === currentSection);
    if (
      current?.feature &&
      enabledFeatures?.[current.feature] === false
    ) {
      setCurrentSection('dashboard');
    }
  }, [enabledFeatures, currentSection, setCurrentSection]);

  return (
    <aside
      className={`flex flex-col h-full bg-zinc-900/80 border-r border-zinc-800 transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="drag-region flex items-center gap-2 px-4 h-12 border-b border-zinc-800/50">
        <BookOpen className="w-5 h-5 text-amber-500 shrink-0" />
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold text-zinc-200 truncate">
            {projectInfo?.name || 'Book Smithy'}
          </span>
        )}
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border-r-2 border-amber-500'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-zinc-800/50 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
