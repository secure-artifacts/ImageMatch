import { useState } from 'react';
import { Search, ImageIcon, BarChart3, Layers } from 'lucide-react';

interface SidebarProps {
  activeView: 'search' | 'library';
  onViewChange: (view: 'search' | 'library') => void;
  libraryCount: number;
}

export default function Sidebar({ activeView, onViewChange, libraryCount }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems = [
    {
      id: 'search' as const,
      label: '相似搜索',
      sublabel: '查找相似图片',
      icon: Search,
    },
    {
      id: 'library' as const,
      label: '图片库',
      sublabel: '管理你的图库',
      icon: ImageIcon,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 glass flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">ImageMatch</h1>
            <p className="text-xs text-surface-400 font-medium">AI 图像相似度引擎</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider px-3 mb-3">
          导航菜单
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isHovered = hoveredItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left
                transition-all duration-200 relative group
                ${isActive
                  ? 'bg-gradient-to-r from-purple-500/15 to-blue-500/10 text-white shadow-lg shadow-purple-500/5'
                  : 'text-surface-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-accent rounded-r-full" />
              )}

              <div className={`
                p-2 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-gradient-accent shadow-md shadow-purple-500/20'
                  : isHovered
                    ? 'bg-white/10'
                    : 'bg-white/5'
                }
              `}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className={`text-[11px] ${isActive ? 'text-surface-300' : 'text-surface-500'}`}>
                  {item.sublabel}
                </p>
              </div>

              {item.id === 'library' && libraryCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-gradient-accent text-white">
                  {libraryCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Stats Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-accent-400" />
            <span className="text-xs font-semibold text-surface-300">系统信息</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-surface-500">模型</span>
              <span className="text-surface-300 font-medium">ResNet50</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-surface-500">特征维度</span>
              <span className="text-surface-300 font-medium">2048</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-surface-500">图库</span>
              <span className="text-accent-400 font-bold">{libraryCount} 张图片</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
