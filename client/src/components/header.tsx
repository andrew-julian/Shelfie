import { BookOpen, Search, Filter } from "lucide-react";

interface HeaderProps {
  booksCount: number;
}

export default function Header({ booksCount }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <BookOpen className="text-primary text-2xl" />
            <h1 className="text-xl font-medium text-gray-900">BookCatalog</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600" data-testid="text-books-count">
              {booksCount} {booksCount === 1 ? 'book' : 'books'}
            </span>
            <button className="p-2 text-gray-600 hover:text-primary transition-colors" data-testid="button-search">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-primary transition-colors" data-testid="button-filter">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
