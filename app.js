import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Zap,
  Tag,
  Clock,
  Bookmark,
  History,
  Key,
  Globe,
  Settings,
  Search,
  Bell,
  RefreshCw,
  Plus,
  Moon,
  Sun,
  Filter,
  ExternalLink,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  X,
  Calendar,
  Check,
  Volume2,
  ShieldAlert
} from 'lucide-react';
import { INITIAL_ITEMS, INITIAL_KEYWORDS } from './mockData';

export default function App() {
  // --- Persistent State ---
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('sb_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [keywords, setKeywords] = useState(() => {
    const saved = localStorage.getItem('sb_keywords');
    return saved ? JSON.parse(saved) : INITIAL_KEYWORDS;
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('sb_theme') || 'light');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [density, setDensity] = useState('comfortable'); // 'comfortable' | 'compact'
  
  // Filtering & Sorting
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedKeyword, setSelectedKeyword] = useState('all');
  const [sortBy, setSortBy] = useState('priority'); // 'priority' | 'recency' | 'urgency'

  // Syncing & Notifications
  const [lastSynced, setLastSynced] = useState('Updated just now');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [newKwName, setNewKwName] = useState('');
  const [newKwPriority, setNewKwPriority] = useState('High');

  // Modal / Toast trigger simulation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      addToast({
        id: 'toast-1',
        title: 'Deadline Approaching',
        message: 'GitHub Azure credit re-verification expires in less than 24 hours.',
        type: 'urgent',
        itemId: 'item_002'
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('sb_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('sb_keywords', JSON.stringify(keywords));
  }, [keywords]);

  useEffect(() => {
    localStorage.setItem('sb_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toast Helper
  const addToast = (toast) => {
    setToasts((prev) => [toast, ...prev]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Actions
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastSynced('Updated just now');
      addToast({
        id: Date.now().toString(),
        title: 'Sync Complete',
        message: 'Checked 5 connected web sources. 0 new items.',
        type: 'info'
      });
    }, 800);
  };

  const toggleSaveItem = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSaved: !item.isSaved } : item))
    );
  };

  const markAsRead = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'read' } : item))
    );
  };

  const dismissItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    addToast({
      id: Date.now().toString(),
      title: 'Item Dismissed',
      message: 'Item has been removed from your active feed.',
      type: 'info'
    });
  };

  const handleAddKeyword = (e) => {
    e.preventDefault();
    if (!newKwName.trim()) return;
    const colors = ['violet', 'emerald', 'amber', 'rose', 'slate'];
    const newKw = {
      id: `kw-${Date.now()}`,
      name: newKwName.trim(),
      priority: newKwPriority,
      color: colors[Math.floor(Math.random() * colors.length)],
      enabled: true
    };
    setKeywords([...keywords, newKw]);
    setNewKwName('');
  };

  const toggleKeyword = (id) => {
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, enabled: !k.enabled } : k));
  };

  const deleteKeyword = (id) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  // --- Computed Views ---
  const activeKeywordNames = useMemo(
    () => keywords.filter((k) => k.enabled).map((k) => k.name.toLowerCase()),
    [keywords]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Global Search
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.type !== selectedCategory) return false;

      // Keyword chip filter
      if (selectedKeyword !== 'all') {
        if (!item.keywords.includes(selectedKeyword)) return false;
      }

      // Sidebar view filter
      if (activeTab === 'deals' && item.type !== 'deal') return false;
      if (activeTab === 'deadlines' && !item.deadline?.dueAt) return false;
      if (activeTab === 'saved' && !item.isSaved) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'recency') return new Date(b.capturedAt) - new Date(a.capturedAt);
      if (sortBy === 'urgency') {
        const dateA = a.deadline?.dueAt ? new Date(a.deadline.dueAt) : new Date(8640000000000000);
        const dateB = b.deadline?.dueAt ? new Date(b.deadline.dueAt) : new Date(8640000000000000);
        return dateA - dateB;
      }
      return 0;
    });
  }, [items, searchQuery, selectedCategory, selectedKeyword, activeTab, sortBy]);

  // Summary Metrics
  const stats = useMemo(() => {
    const dealsCount = items.filter((i) => i.type === 'deal').length;
    const deadlinesCount = items.filter((i) => i.deadline?.dueAt).length;
    const priorityCount = items.filter((i) => i.priority >= 80).length;
    const savedCount = items.filter((i) => i.isSaved).length;
    return { dealsCount, deadlinesCount, priorityCount, savedCount };
  }, [items]);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${theme === 'dark' ? 'dark' : ''}`}>
      
      {/* Toast Notification Layer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-up ${
              toast.type === 'urgent'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200 bg-white dark:bg-slate-900'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
            }`}
          >
            {toast.type === 'urgent' ? (
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm">
              <h4 className="font-semibold text-slate-900 dark:text-white">{toast.title}</h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } bg-white dark:bg-[#1E293B] border-r border-[#E6E9F0] dark:border-slate-800 flex flex-col transition-all duration-300 z-20 shrink-0`}
        >
          {/* Logo */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              {!sidebarCollapsed && (
                <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-brand-600 to-slate-700 dark:from-white dark:to-slate-300">
                  Signalboard
                </span>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Toggle Sidebar"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <SidebarItem
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Overview"
              active={activeTab === 'overview'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('overview')}
            />
            <SidebarItem
              icon={<Zap className="w-4 h-4 text-brand-500" />}
              label="Priority Feed"
              badge={stats.priorityCount}
              active={activeTab === 'priority'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('priority')}
            />
            <SidebarItem
              icon={<Tag className="w-4 h-4 text-emerald-500" />}
              label="Deals & Offers"
              badge={stats.dealsCount}
              active={activeTab === 'deals'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('deals')}
            />
            <SidebarItem
              icon={<Clock className="w-4 h-4 text-rose-500" />}
              label="Deadlines"
              badge={stats.deadlinesCount}
              badgeColor="bg-rose-500"
              active={activeTab === 'deadlines'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('deadlines')}
            />
            <SidebarItem
              icon={<Bookmark className="w-4 h-4 text-amber-500" />}
              label="Saved Items"
              badge={stats.savedCount}
              active={activeTab === 'saved'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('saved')}
            />
            <div className="pt-4 pb-2">
              {!sidebarCollapsed && (
                <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Management
                </span>
              )}
            </div>
            <SidebarItem
              icon={<Key className="w-4 h-4" />}
              label="Keywords & Priorities"
              active={activeTab === 'keywords'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('keywords')}
            />
            <SidebarItem
              icon={<History className="w-4 h-4" />}
              label="Activity Log"
              active={activeTab === 'activity'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('activity')}
            />
            <SidebarItem
              icon={<Settings className="w-4 h-4" />}
              label="Settings & Theme"
              active={activeTab === 'settings'}
              collapsed={sidebarCollapsed}
              onClick={() => setActiveTab('settings')}
            />
          </nav>

          {/* Connected Web Status */}
          {!sidebarCollapsed && (
            <div className="p-4 mx-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" /> Extension Status
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold">Active</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                Listening to 5 active web targets.
              </p>
            </div>
          )}
        </aside>

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F8FC] dark:bg-[#0F172A]">
          
          {/* TOP HEADER BAR */}
          <header className="h-16 bg-white dark:bg-[#1E293B] border-b border-[#E6E9F0] dark:border-slate-800 px-6 flex items-center justify-between gap-4 shrink-0">
            
            {/* Global Search */}
            <div className="flex-1 max-w-xl relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="global-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search insights, websites, deals, keywords... (Press Ctrl+K)"
                className="w-full pl-10 pr-12 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition placeholder:text-slate-400 dark:text-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-200 dark:bg-slate-700 rounded">
                ⌘K
              </span>
            </div>

            {/* Sync & Action Tools */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 pr-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{lastSynced}</span>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Manual Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notifications Bell */}
              <button
                className="p-2 relative text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                onClick={() => addToast({ id: Date.now().toString(), title: 'Notification Center', message: 'No new unread system updates.', type: 'info' })}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full"></span>
              </button>

              {/* User Avatar */}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                JD
              </div>
            </div>
          </header>

          {/* VIEW CONTENT AREA */}
          <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-6">
            
            {/* Greeting Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Good afternoon — here's what matters today.
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Wed, Oct 14, 2026 • 5 captured sources monitored
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('keywords')}
                  className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> Add Priority Keyword
                </button>
              </div>
            </div>

            {/* SUMMARY CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Zap className="w-5 h-5 text-brand-500" />}
                title="Priority Insights"
                value={stats.priorityCount}
                subtitle="High keyword match"
                onClick={() => { setActiveTab('priority'); setSortBy('priority'); }}
              />
              <StatCard
                icon={<Tag className="w-5 h-5 text-emerald-500" />}
                title="Active Deals"
                value={stats.dealsCount}
                subtitle="Promotions & discounts"
                onClick={() => setActiveTab('deals')}
              />
              <StatCard
                icon={<Clock className="w-5 h-5 text-rose-500" />}
                title="Upcoming Deadlines"
                value={stats.deadlinesCount}
                subtitle="Next 7 days"
                onClick={() => setActiveTab('deadlines')}
              />
              <StatCard
                icon={<Bookmark className="w-5 h-5 text-amber-500" />}
                title="Saved Items"
                value={stats.savedCount}
                subtitle="Bookmarked for later"
                onClick={() => setActiveTab('saved')}
              />
            </div>

            {/* TAB-SPECIFIC CONTENT LAYOUT */}
            {activeTab === 'keywords' ? (
              <KeywordManagementSection
                keywords={keywords}
                onAdd={handleAddKeyword}
                onToggle={toggleKeyword}
                onDelete={deleteKeyword}
                newKwName={newKwName}
                setNewKwName={setNewKwName}
                newKwPriority={newKwPriority}
                setNewKwPriority={setNewKwPriority}
              />
            ) : activeTab === 'settings' ? (
              <SettingsSection theme={theme} setTheme={setTheme} density={density} setDensity={setDensity} />
            ) : (
              /* DEFAULT / FEED VIEWS */
              <div className="space-y-4">
                
                {/* Controls & Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-[#E6E9F0] dark:border-slate-800 shadow-sm">
                  
                  {/* Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {['all', 'deal', 'deadline', 'announcement'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Sort Options */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-medium">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="priority">Highest Priority</option>
                      <option value="recency">Most Recent</option>
                      <option value="urgency">Nearest Expiry</option>
                    </select>
                  </div>
                </div>

                {/* Feed Items Container */}
                {filteredItems.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-[#1E293B] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
                    <Filter className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">No items match your criteria</h3>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or search keywords.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedKeyword('all'); }}
                      className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold rounded-xl transition"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredItems.map((item) => (
                      <FeedItemCard
                        key={item.id}
                        item={item}
                        density={density}
                        onSave={() => toggleSaveItem(item.id)}
                        onDismiss={() => dismissItem(item.id)}
                        onMarkRead={() => markAsRead(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function SidebarItem({ icon, label, badge, badgeColor = 'bg-brand-500', active, collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
        active
          ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
      }`}
      title={collapsed ? label : undefined}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </div>
      {!collapsed && badge !== undefined && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, title, value, subtitle, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E6E9F0] dark:border-slate-800 shadow-sm hover:shadow-md transition cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 group-hover:scale-105 transition">
          {icon}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{title}</div>
        <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>
      </div>
    </div>
  );
}

function FeedItemCard({ item, density, onSave, onDismiss, onMarkRead }) {
  const isUrgent = item.deadline?.dueAt && new Date(item.deadline.dueAt) - new Date() < 86400000;

  return (
    <div
      className={`bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E6E9F0] dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        item.status === 'unread' ? 'border-l-4 border-l-brand-500' : ''
      }`}
    >
      <div className="flex-1 space-y-2">
        {/* Source & Badge Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <img src={item.source.favicon} alt="" className="w-4 h-4 rounded" />
            <span>{item.source.name}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          
          {/* Category Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              item.type === 'deal'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : item.type === 'deadline'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
            }`}
          >
            {item.type}
          </span>

          {/* Priority Meter */}
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
            Priority {item.priority}%
          </span>
        </div>

        {/* Title & Summary */}
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white hover:text-brand-600 transition">
            <a href={item.source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
              {item.title}
              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-slate-400" />
            </a>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            {item.summary}
          </p>
        </div>

        {/* Keywords Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.keywords.map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              #{kw}
            </span>
          ))}
        </div>
      </div>

      {/* Right Column / Expiry & Quick Action Controls */}
      <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-6 shrink-0 gap-3">
        {item.offer?.expiresAt && (
          <div className="text-left md:text-right">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Expires</div>
            <div className={`text-xs font-bold ${isUrgent ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
              {new Date(item.offer.expiresAt).toLocaleDateString()}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={onSave}
            className={`p-2 rounded-xl border transition ${
              item.isSaved
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
            }`}
            title="Save item"
          >
            <Bookmark className={`w-4 h-4 ${item.isSaved ? 'fill-current' : ''}`} />
          </button>

          <a
            href={item.source.url}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            Visit Source <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onDismiss}
            className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            title="Dismiss"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function KeywordManagementSection({ keywords, onAdd, onToggle, onDelete, newKwName, setNewKwName, newKwPriority, setNewKwPriority }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-[#E6E9F0] dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Keyword Priority Tuning</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Signalboard uses keyword priority weights to score captured web data into your Priority Feed.
        </p>

        {/* Add Form */}
        <form onSubmit={onAdd} className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={newKwName}
            onChange={(e) => setNewKwName(e.target.value)}
            placeholder="e.g. Terraform Pricing, SaaS Credits..."
            className="flex-1 min-w-[200px] px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <select
            value={newKwPriority}
            onChange={(e) => setNewKwPriority(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
          >
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition"
          >
            Add Keyword
          </button>
        </form>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {keywords.map((kw) => (
          <div
            key={kw.id}
            className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-[#E6E9F0] dark:border-slate-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={kw.enabled}
                onChange={() => onToggle(kw.id)}
                className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"
              />
              <div>
                <div className={`text-xs font-bold ${kw.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                  {kw.name}
                </div>
                <div className="text-[10px] text-slate-400">{kw.priority} Weight</div>
              </div>
            </div>

            <button
              onClick={() => onDelete(kw.id)}
              className="p-1.5 text-slate-400 hover:text-rose-500 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsSection({ theme, setTheme, density, setDensity }) {
  return (
    <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-[#E6E9F0] dark:border-slate-800 shadow-sm space-y-6 max-w-2xl">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard Preferences</h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
            Appearance Mode
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                theme === 'light' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <Sun className="w-4 h-4" /> Light Mode
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                theme === 'dark' ? 'border-brand-500 bg-slate-800 text-brand-400' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <Moon className="w-4 h-4" /> Dark Mode
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
            Card Density
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setDensity('comfortable')}
              className={`flex-1 p-3 rounded-xl border text-xs font-semibold ${
                density === 'comfortable' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={`flex-1 p-3 rounded-xl border text-xs font-semibold ${
                density === 'compact' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              Compact Density
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}