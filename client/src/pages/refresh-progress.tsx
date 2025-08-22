import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Clock, AlertCircle, RefreshCw, Book, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface RefreshProgress {
  total: number;
  current: number;
  completed: string[];
  currentBook: string | null;
  errors: Array<{ book: string; error: string }>;
  status: 'running' | 'completed' | 'error';
}

export default function RefreshProgressPage() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState<RefreshProgress>({
    total: 0,
    current: 0,
    completed: [],
    currentBook: null,
    errors: [],
    status: 'running'
  });
  const [startTime, setStartTime] = useState<Date>(new Date());

  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const connectToProgressStream = () => {
      eventSource = new EventSource('/api/refresh-progress');
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgress(data);
          
          if (data.status === 'completed' || data.status === 'error') {
            eventSource?.close();
          }
        } catch (error) {
          console.error('Error parsing progress data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource?.close();
      };
    };

    connectToProgressStream();
    
    return () => {
      eventSource?.close();
    };
  }, []);

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const estimatedTimeRemaining = progress.current > 0 && progress.total > progress.current 
    ? Math.round(((new Date().getTime() - startTime.getTime()) / progress.current) * (progress.total - progress.current) / 1000)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-blue/5 to-coral-red/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="mb-4 text-gray-600 hover:text-gray-900"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-monochrome-black mb-2">
                  Refreshing Library
                </h1>
                <p className="text-gray-600">
                  Updating book metadata from Amazon marketplace
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-sky-blue">
                  {progress.current} / {progress.total}
                </div>
                <div className="text-sm text-gray-500">
                  Books processed
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Overall Progress
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-3"
                data-testid="progress-overall"
              />
            </div>

            {/* Status and Timing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-gray-700">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Elapsed Time</span>
                </div>
                <div className="text-lg font-bold text-monochrome-black mt-1">
                  {formatDuration(startTime)}
                </div>
              </div>
              
              {estimatedTimeRemaining > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Est. Remaining</span>
                  </div>
                  <div className="text-lg font-bold text-monochrome-black mt-1">
                    {Math.floor(estimatedTimeRemaining / 60)}m {estimatedTimeRemaining % 60}s
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-gray-700">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Errors</span>
                </div>
                <div className="text-lg font-bold text-coral-red mt-1">
                  {progress.errors.length}
                </div>
              </div>
            </div>

            {/* Current Book */}
            {progress.currentBook && progress.status === 'running' && (
              <div className="bg-sky-blue/10 border border-sky-blue/20 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <RefreshCw className="w-5 h-5 text-sky-blue mr-3 animate-spin" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      Currently processing:
                    </div>
                    <div className="font-semibold text-monochrome-black">
                      {progress.currentBook}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Status */}
            {progress.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <div className="font-semibold text-green-800">
                      Refresh Complete!
                    </div>
                    <div className="text-sm text-green-600">
                      All books have been successfully updated with the latest metadata.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Completed Books List */}
        {progress.completed.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-monochrome-black mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              Completed Books ({progress.completed.length})
            </h2>
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {progress.completed.map((book, index) => (
                  <div 
                    key={index}
                    className="flex items-center text-sm text-gray-700 bg-gray-50 rounded-lg p-3"
                    data-testid={`completed-book-${index}`}
                  >
                    <Book className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                    <span className="truncate">{book}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Errors List */}
        {progress.errors.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-monochrome-black mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-coral-red mr-2" />
              Errors ({progress.errors.length})
            </h2>
            <div className="space-y-3">
              {progress.errors.map((error, index) => (
                <div 
                  key={index}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                  data-testid={`error-${index}`}
                >
                  <div className="font-semibold text-red-800 mb-1">
                    {error.book}
                  </div>
                  <div className="text-sm text-red-600">
                    {error.error}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {progress.status === 'completed' && (
          <div className="text-center mt-8">
            <Button
              onClick={() => setLocation('/')}
              className="bg-sky-blue hover:bg-sky-blue/90 text-white px-8 py-3"
              data-testid="button-return-library"
            >
              Return to Library
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}