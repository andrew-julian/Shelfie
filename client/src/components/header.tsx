import { BookOpen, Search, Filter, RefreshCw } from "lucide-react";

interface HeaderProps {
  booksCount: number;
  onRefreshAll?: () => void;
  isRefreshing?: boolean;
}

export default function Header({ booksCount, onRefreshAll, isRefreshing = false }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <BookOpen className="text-monochrome-black text-2xl" />
            <h1 className="text-2xl font-bold text-monochrome-black tracking-tight">BookScan</h1>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-600 font-medium" data-testid="text-books-count">
              {booksCount} {booksCount === 1 ? 'book' : 'books'}
            </span>
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
            <button className="p-3 text-gray-600 hover:text-coral-red hover:bg-gray-50 rounded-lg transition-all" data-testid="button-search">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-3 text-gray-600 hover:text-coral-red hover:bg-gray-50 rounded-lg transition-all" data-testid="button-filter">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
