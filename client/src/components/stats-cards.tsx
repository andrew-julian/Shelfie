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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center">
          <div className="p-3 bg-monochrome-black rounded-xl">
            <BookOpen className="text-white text-2xl" />
          </div>
          <div className="ml-6">
            <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Total Books</p>
            <p className="text-3xl font-bold text-monochrome-black mt-1" data-testid="stat-total-books">{stats.total}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center">
          <div className="p-3 bg-coral-red rounded-xl">
            <CheckCircle className="text-white text-2xl" />
          </div>
          <div className="ml-6">
            <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Read</p>
            <p className="text-3xl font-bold text-monochrome-black mt-1" data-testid="stat-read-books">{stats.read}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center">
          <div className="p-3 bg-sky-blue rounded-xl">
            <Bookmark className="text-white text-2xl" />
          </div>
          <div className="ml-6">
            <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Reading</p>
            <p className="text-3xl font-bold text-monochrome-black mt-1" data-testid="stat-reading-books">{stats.reading}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
