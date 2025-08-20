import { BookOpen, CheckCircle, Bookmark } from "lucide-react";
import { Book } from "@shared/schema";

interface StatsCardsProps {
  books: Book[];
}

export default function StatsCards({ books }: StatsCardsProps) {
  const stats = {
    total: books.length,
    read: books.filter(book => book.status === 'read').length,
    reading: books.filter(book => book.status === 'reading').length,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="text-primary text-xl" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Total Books</p>
            <p className="text-2xl font-semibold text-gray-900" data-testid="stat-total-books">{stats.total}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="text-green-600 text-xl" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Read</p>
            <p className="text-2xl font-semibold text-gray-900" data-testid="stat-read-books">{stats.read}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Bookmark className="text-accent text-xl" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Reading</p>
            <p className="text-2xl font-semibold text-gray-900" data-testid="stat-reading-books">{stats.reading}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
