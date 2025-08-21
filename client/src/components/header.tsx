import { useState } from "react";
import { BookOpen, Search, Filter, RefreshCw, SortAsc, X, User, Settings, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

type SortOption = 'title-asc' | 'title-desc' | 'author-asc' | 'author-desc' | 'status' | 'date-added' | 'color-light-to-dark' | 'color-dark-to-light';
type FilterStatus = 'all' | 'want-to-read' | 'reading' | 'read';

interface HeaderProps {
  booksCount: number;
  filteredCount: number;
  onRefreshAll?: () => void;
  isRefreshing?: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterStatus: FilterStatus;
  onFilterStatusChange: (status: FilterStatus) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export default function Header({ 
  booksCount, 
  filteredCount,
  onRefreshAll, 
  isRefreshing = false,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  filterStatus,
  onFilterStatusChange,
  showFilters,
  onToggleFilters
}: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <BookOpen className="text-monochrome-black text-xl sm:text-2xl" />
            <h1 className="text-xl sm:text-2xl font-bold text-monochrome-black tracking-tight">BookScan</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <span className="text-sm text-gray-600 font-medium" data-testid="text-books-count">
              {filteredCount !== booksCount ? `${filteredCount} of ${booksCount}` : booksCount} {booksCount === 1 ? 'book' : 'books'}
            </span>
            <UserMenu />
            {onRefreshAll && booksCount > 0 && (
              <button 
                onClick={onRefreshAll}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-coral-red hover:bg-gray-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                data-testid="button-refresh-all"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh All'}
              </button>
            )}
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:text-coral-red hover:border-coral-red focus:outline-none focus:ring-2 focus:ring-coral-red focus:border-coral-red transition-all"
                data-testid="select-sort"
              >
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="author-asc">Author A-Z</option>
                <option value="author-desc">Author Z-A</option>
                <option value="status">Status</option>
                <option value="date-added">Date Added</option>
                <option value="color-light-to-dark">Colour Sort (Light to Dark)</option>
                <option value="color-dark-to-light">Colour Sort (Dark to Light)</option>
                <option value="color-light-to-dark">Colour Sort (Light to Dark)</option>
                <option value="color-dark-to-light">Colour Sort (Dark to Light)</option>
              </select>
              <SortAsc className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={`p-3 rounded-lg transition-all ${showSearch || searchTerm ? 'text-coral-red bg-red-50' : 'text-gray-600 hover:text-coral-red hover:bg-gray-50'}`}
              data-testid="button-search"
            >
              <Search className="w-5 h-5" />
            </button>
            
            <button 
              onClick={onToggleFilters}
              className={`p-3 rounded-lg transition-all ${showFilters || filterStatus !== 'all' ? 'text-coral-red bg-red-50' : 'text-gray-600 hover:text-coral-red hover:bg-gray-50'}`}
              data-testid="button-filter"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      {showSearch && (
        <div className="border-t border-gray-100 px-6 sm:px-8 lg:px-12 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-red focus:border-coral-red transition-all"
              data-testid="input-search"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                data-testid="button-clear-search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Filter Bar */}
      {showFilters && (
        <div className="border-t border-gray-100 px-6 sm:px-8 lg:px-12 py-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <div className="flex items-center space-x-2">
              {[
                { value: 'all', label: 'All Books' },
                { value: 'want-to-read', label: 'Want to Read' },
                { value: 'reading', label: 'Reading' },
                { value: 'read', label: 'Read' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onFilterStatusChange(value as FilterStatus)}
                  className={`px-3 py-1 text-sm rounded-full transition-all ${
                    filterStatus === value
                      ? 'bg-coral-red text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  data-testid={`button-filter-${value}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        data-testid="button-user-menu"
      >
        {(user as any)?.profileImageUrl ? (
          <img 
            src={(user as any).profileImageUrl} 
            alt="Profile" 
            className="h-8 w-8 rounded-full object-cover"
            data-testid="img-user-avatar"
          />
        ) : (
          <User className="h-8 w-8 text-gray-600" />
        )}
        <span className="text-sm font-medium" data-testid="text-user-name">
          {(user as any)?.firstName || 'User'}
        </span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <Link href="/settings">
              <button 
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setShowDropdown(false)}
                data-testid="button-settings-menu"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            </Link>
            <button 
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => window.location.href = '/api/logout'}
              data-testid="button-logout-menu"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}