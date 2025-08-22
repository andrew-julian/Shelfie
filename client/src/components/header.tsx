import { useState, useEffect } from "react";
import { BookOpen, Search, Filter, RefreshCw, SortAsc, X, User, Settings, LogOut, Menu, Users, ChevronDown, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
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
    <header className="bg-transparent">
      <div className="w-full px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <BookOpen className="text-monochrome-black text-xl sm:text-2xl" />
            <h1 className="text-xl sm:text-2xl font-bold text-monochrome-black tracking-tight">BookScan</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4 xl:space-x-6">
            <Link href="/scan">
              <button className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-white bg-coral-red hover:bg-red-600 rounded-lg transition-all" data-testid="button-scan">
                <Camera className="w-3 lg:w-4 h-3 lg:h-4" />
                <span className="hidden lg:inline">Scan Books</span>
                <span className="lg:hidden">Scan</span>
              </button>
            </Link>
            <span className="text-xs lg:text-sm text-gray-600 font-medium whitespace-nowrap" data-testid="text-books-count">
              {filteredCount !== booksCount ? `${filteredCount}/${booksCount}` : booksCount} books
            </span>
            <UserMenu />
            {onRefreshAll && booksCount > 0 && (
              <button 
                onClick={onRefreshAll}
                disabled={isRefreshing}
                className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-gray-600 hover:text-coral-red hover:bg-gray-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                data-testid="button-refresh-all"
              >
                <RefreshCw className={`w-3 lg:w-4 h-3 lg:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">{isRefreshing ? 'Refreshing...' : 'Refresh All'}</span>
                <span className="lg:hidden">Refresh</span>
              </button>
            )}
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-gray-600 hover:text-coral-red hover:border-coral-red focus:outline-none focus:ring-2 focus:ring-coral-red focus:border-coral-red transition-all min-w-0"
                data-testid="select-sort"
              >
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="author-asc">Author A-Z</option>
                <option value="author-desc">Author Z-A</option>
                <option value="status">Status</option>
                <option value="date-added">Date Added</option>
                <option value="color-light-to-dark">Color: Light→Dark</option>
                <option value="color-dark-to-light">Color: Dark→Light</option>
              </select>
              <SortAsc className="absolute right-1 lg:right-2 top-1/2 transform -translate-y-1/2 w-3 lg:w-4 h-3 lg:h-4 text-gray-400 pointer-events-none" />
            </div>
            
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 lg:p-3 rounded-lg transition-all ${showSearch || searchTerm ? 'text-coral-red bg-red-50' : 'text-gray-600 hover:text-coral-red hover:bg-gray-50'}`}
              data-testid="button-search"
            >
              <Search className="w-4 lg:w-5 h-4 lg:h-5" />
            </button>
            
            <button 
              onClick={onToggleFilters}
              className={`p-2 lg:p-3 rounded-lg transition-all ${showFilters || filterStatus !== 'all' ? 'text-coral-red bg-red-50' : 'text-gray-600 hover:text-coral-red hover:bg-gray-50'}`}
              data-testid="button-filter"
            >
              <Filter className="w-4 lg:w-5 h-4 lg:h-5" />
            </button>
            

          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            <Link href="/scan">
              <button className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-coral-red hover:bg-red-600 rounded-lg transition-all" data-testid="button-scan-mobile-header">
                <Camera className="w-3 h-3" />
                <span>Scan</span>
              </button>
            </Link>
            <div className="flex items-center gap-1 text-sm text-gray-600 font-medium" data-testid="text-books-count-mobile">
              <BookOpen className="w-4 h-4 text-coral-red" />
              <span>{filteredCount !== booksCount ? `${filteredCount}/${booksCount}` : booksCount}</span>
            </div>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-gray-600 hover:text-coral-red transition-colors"
              data-testid="button-mobile-menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-4 space-y-4">
              <UserMenu />
              
              {onRefreshAll && booksCount > 0 && (
                <button 
                  onClick={() => {
                    onRefreshAll();
                    setShowMobileMenu(false);
                  }}
                  disabled={isRefreshing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-coral-red border border-gray-200 rounded-lg transition-all disabled:opacity-50"
                  data-testid="button-refresh-all-mobile"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh All'}
                </button>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Sort by:</label>
                <select 
                  value={sortBy}
                  onChange={(e) => {
                    onSortChange(e.target.value as SortOption);
                    setShowMobileMenu(false);
                  }}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600"
                  data-testid="select-sort-mobile"
                >
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                  <option value="author-asc">Author A-Z</option>
                  <option value="author-desc">Author Z-A</option>
                  <option value="status">Status</option>
                  <option value="date-added">Date Added</option>
                  <option value="color-light-to-dark">Colour Sort (Light to Dark)</option>
                  <option value="color-dark-to-light">Colour Sort (Dark to Light)</option>
                </select>
              </div>

              <button 
                onClick={() => {
                  setShowSearch(!showSearch);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-coral-red border border-gray-200 rounded-lg transition-all"
                data-testid="button-search-mobile"
              >
                <Search className="w-4 h-4" />
                Search
              </button>

              <button 
                onClick={() => {
                  onToggleFilters();
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-all ${
                  showFilters 
                    ? 'text-coral-red bg-coral-red/10 border-coral-red' 
                    : 'text-gray-600 hover:text-coral-red border-gray-200'
                }`}
                data-testid="button-filters-mobile"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              <Link href="/scan">
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-coral-red hover:bg-red-600 rounded-lg transition-all"
                  data-testid="button-scan-mobile"
                >
                  <Camera className="w-4 h-4" />
                  Scan Books
                </button>
              </Link>


            </div>
          </div>
        )}
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
  const queryClient = useQueryClient();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Fetch all users when user switcher is shown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('Fetching users for switcher...');
        const response = await fetch('/api/auth/users', {
          credentials: 'include'
        });
        console.log('Users fetch response:', response.status);
        if (response.ok) {
          const users = await response.json();
          console.log('Available users:', users);
          setAvailableUsers(users);
        } else {
          console.error('Failed to fetch users:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    
    if (showUserSwitcher && availableUsers.length === 0) {
      fetchUsers();
    }
  }, [showUserSwitcher, availableUsers.length]);

  const switchUser = async (targetUserId: string) => {
    try {
      console.log(`Frontend: Switching to user: ${targetUserId}`);
      
      // Call server endpoint to switch user context
      const response = await fetch(`/api/auth/switch-user/${targetUserId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`Switch response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('User switch successful:', data);
        
        // Invalidate all queries to ensure fresh data
        queryClient.clear();
        
        // Force a hard reload to completely refresh the user context
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Failed to switch user:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error switching user:', error);
    }
  };

  if (!user) return null;

  const currentUser = user as any;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        data-testid="button-user-menu"
      >
        {currentUser?.profileImageUrl ? (
          <img 
            src={currentUser.profileImageUrl} 
            alt="Profile" 
            className="h-8 w-8 rounded-full object-cover"
            data-testid="img-user-avatar"
          />
        ) : (
          <User className="h-8 w-8 text-gray-600" />
        )}
        <span className="text-sm font-medium" data-testid="text-user-name">
          {currentUser?.firstName || 'User'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {/* Current User Info */}
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900" data-testid="text-current-user">
                {currentUser?.firstName || 'User'}
              </p>
              <p className="text-xs text-gray-500">{currentUser?.email}</p>
            </div>

            {/* User Switcher */}
            <button
              onClick={() => {
                setShowUserSwitcher(!showUserSwitcher);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              data-testid="button-user-switcher"
            >
              <Users className="h-4 w-4 mr-2" />
              Switch User
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showUserSwitcher ? 'rotate-180' : ''}`} />
            </button>

            {showUserSwitcher && (
              <div className="bg-gray-50 border-t border-gray-100">
                {availableUsers.map((availableUser) => (
                  <button
                    key={availableUser.id}
                    onClick={() => {
                      switchUser(availableUser.id);
                      setShowDropdown(false);
                    }}
                    className={`flex items-center w-full px-6 py-2 text-sm hover:bg-gray-100 ${
                      availableUser.id === currentUser?.id ? 'text-coral-red font-medium bg-coral-red/5' : 'text-gray-600'
                    }`}
                    data-testid={`button-switch-user-${availableUser.id}`}
                  >
                    <User className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{availableUser.firstName || 'User'}</div>
                      <div className="text-xs text-gray-500">{availableUser.email}</div>
                    </div>
                    {availableUser.id === currentUser?.id && (
                      <div className="ml-auto w-2 h-2 bg-coral-red rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100">
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
        </div>
      )}
    </div>
  );
}