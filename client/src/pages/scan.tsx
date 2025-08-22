import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Camera, Search, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Queue types (same as scanner-modal)
interface QueueItem {
  id: string;
  isbn: string;
  status: 'scanning' | 'looking-up' | 'adding' | 'success' | 'error';
  title?: string;
  author?: string;
  coverUrl?: string;
  error?: string;
  retryCount: number;
}

// Declare Scanbot SDK types
declare global {
  interface Window {
    ScanbotSDK: any;
  }
}

// QueueItemCard component (same as scanner-modal)
const QueueItemCard = ({ item, onRetry, onRemove }: {
  item: QueueItem;
  onRetry: () => void;
  onRemove: () => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'scanning': 
      case 'looking-up': 
      case 'adding': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scanning': return 'Scanned';
      case 'looking-up': return 'Looking up...';
      case 'adding': return 'Adding to library...';
      case 'success': return 'Added to library';
      case 'error': return 'Error';
      default: return status;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm text-gray-600">{item.isbn}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
            {getStatusText(item.status)}
          </span>
          {['looking-up', 'adding'].includes(item.status) && (
            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
          )}
        </div>
        {item.title && (
          <p className="text-sm text-gray-800 truncate mt-1">{item.title}</p>
        )}
        {item.author && (
          <p className="text-xs text-gray-600 truncate">{item.author}</p>
        )}
        {item.error && (
          <p className="text-xs text-red-600 mt-1">{item.error}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {item.status === 'error' && item.retryCount < 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-xs text-blue-600 hover:text-blue-700"
            data-testid={`button-retry-${item.id}`}
          >
            Retry
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-xs text-gray-500 hover:text-gray-700"
          data-testid={`button-remove-${item.id}`}
        >
          ✕
        </Button>
      </div>
    </div>
  );
};

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [manualIsbn, setManualIsbn] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const scannerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get license key based on environment
  const getLicenseKey = () => {
    const hostname = window.location.hostname;
    if (hostname === 'bookscan.vanaheim.com.au') {
      return 'Fn+d7geFVGNNnHECGTkgWCdjHjpEt8O5xdGh1YHpGfzfcTx7u4tYFJJTpNmKJqm1sO1Qm+MaJYSCNYaRVoxJCOX9IWkWCVXvbr8cRwTYLjXYjqN7YC+gT9FoLHLzYMGOXfxKaI7rIDYKqgZbdJd1jxqNGOXfxKaI7rIDYKqgZbdJd1jxqN';
    } else {
      console.log('Using development license key for Replit environment');
      return 'hGOb8vhK2p8OBMrXwBH5pbUwUE8nzGRvhR9+vJdGj1m8CyV1P9Y7TQHzb7sVLlVjZI+MaJYSCNYaRVoxJCOX9IWkWCVXvbr8cRwTYLjXYjqN7YC+gT9FoLHLzYMGOXfxKaI7rIDYKqgZbdJd1jxqNGOXfxKaI7rIDYKqgZbdJd1jxqN';
    }
  };

  // Queue management functions
  const addToQueue = useCallback((isbn: string) => {
    const queueItem: QueueItem = {
      id: `${Date.now()}-${isbn}`,
      isbn,
      status: 'looking-up',
      retryCount: 0
    };
    
    setQueue(prev => [...prev, queueItem]);
    setScanCount(prev => prev + 1);
    processQueueItem(queueItem);
  }, []);

  const updateQueueItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const processQueueItem = async (item: QueueItem) => {
    try {
      updateQueueItem(item.id, { status: 'looking-up' });
      
      const response = await fetch(`/api/books/lookup/${item.isbn}`);
      if (!response.ok) {
        throw new Error(`Failed to lookup book: ${response.statusText}`);
      }
      
      const bookData = await response.json();
      
      if (!bookData.title) {
        throw new Error('Book not found in our database');
      }

      updateQueueItem(item.id, { 
        status: 'adding',
        title: bookData.title,
        author: bookData.author,
        coverUrl: bookData.coverUrl
      });

      const addResponse = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn: item.isbn,
          title: bookData.title,
          author: bookData.author,
          coverUrl: bookData.coverUrl,
          description: bookData.description || '',
          publishedDate: bookData.publishedDate || '',
          pageCount: bookData.pageCount || 0,
          categories: bookData.categories || [],
          averageRating: bookData.averageRating || 0,
          ratingsCount: bookData.ratingsCount || 0,
        })
      });
      
      if (!addResponse.ok) {
        throw new Error(`Failed to add book: ${addResponse.statusText}`);
      }

      updateQueueItem(item.id, { status: 'success' });
    } catch (error) {
      console.error(`Error processing queue item ${item.id}:`, error);
      updateQueueItem(item.id, { 
        status: 'error', 
        error: (error as Error).message || 'Unknown error'
      });
    }
  };

  const retryQueueItem = useCallback((item: QueueItem) => {
    const updatedItem = { 
      ...item, 
      status: 'scanning' as const, 
      retryCount: item.retryCount + 1,
      error: undefined 
    };
    updateQueueItem(item.id, updatedItem);
    processQueueItem(updatedItem);
  }, [updateQueueItem]);

  // Scanner functions
  const startScanner = async () => {
    if (!window.ScanbotSDK) {
      toast({
        title: "Scanner Error",
        description: "Scanner SDK is not loaded. Please enter ISBN manually.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsScanning(true);
      console.log('Starting Scanbot scanner...');
      
      // Create enhanced configuration
      const config = new window.ScanbotSDK.UI.Config.BarcodeScannerScreenConfiguration();
      
      // Customize the UI
      if (config.topBar) {
        if (config.topBar.title) {
          config.topBar.title.text = "Scan Book";
          config.topBar.title.color = "#FFFFFF";
        }
        
        if (config.topBar.cancelButton) {
          config.topBar.cancelButton.visible = true;
          config.topBar.cancelButton.text = "✕ Done";
          config.topBar.cancelButton.accessibilityDescription = "Close scanner";
          
          if (config.topBar.cancelButton.foreground) {
            config.topBar.cancelButton.foreground.color = "#FFFFFF";
            config.topBar.cancelButton.foreground.iconVisible = true;
          }
          
          if (config.topBar.cancelButton.background) {
            config.topBar.cancelButton.background.fillColor = "#FF3737";
            config.topBar.cancelButton.background.strokeColor = "#FFFFFF";
            config.topBar.cancelButton.background.strokeWidth = 1.0;
          }
        }
        
        config.topBar.mode = "SOLID";
        config.topBar.backgroundColor = "#C8193C";
      }
      
      if (config.palette) {
        config.palette.sbColorPrimary = "#C8193C";
        config.palette.sbColorOnPrimary = "#FFFFFF";
        config.palette.sbColorNegative = "#FF3737";
      }
      
      if (config.userGuidance) {
        config.userGuidance.title.text = "Move the finder over a barcode";
        config.userGuidance.title.color = "#FFFFFF";
      }

      console.log('Creating barcode scanner with config:', config);
      
      const scannerPromise = window.ScanbotSDK.UI.createBarcodeScanner(config);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Scanner timeout after 30 seconds')), 30000);
      });
      
      const result = await Promise.race([scannerPromise, timeoutPromise]);
      
      setIsScanning(false);
      console.log('Scanner result:', result);
      
      if (result && result.items && result.items.length > 0) {
        const scannedCode = result.items[0].barcode.text;
        console.log('Scanned barcode:', scannedCode);
        if (scannedCode && scannedCode.length >= 10) {
          addToQueue(scannedCode);
          
          toast({
            title: "Book Scanned!",
            description: `ISBN ${scannedCode} added to queue`,
            duration: 2000,
          });
          
          // Automatically restart scanner for rapid scanning
          setTimeout(() => {
            startScanner();
          }, 500);
        } else {
          toast({
            title: "Invalid Barcode",
            description: "Please scan a valid ISBN barcode (10-13 digits).",
            variant: "destructive",
          });
          setTimeout(() => {
            startScanner();
          }, 1500);
        }
      } else {
        console.log('Scanner cancelled or no barcode detected');
      }
    } catch (error) {
      console.error('Scanbot scanning error:', error);
      setIsScanning(false);
      
      if ((error as Error).message.includes('timeout')) {
        toast({
          title: "Scanner Timeout",
          description: "Scanner timed out. You can try again or enter ISBN manually.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Camera Error",
          description: `Could not access camera: ${(error as Error).message}. Please enter ISBN manually.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleManualLookup = () => {
    const cleanedIsbn = manualIsbn.trim().replace(/[\s\-]/g, '');
    
    if (cleanedIsbn && (cleanedIsbn.length === 10 || cleanedIsbn.length === 13)) {
      addToQueue(cleanedIsbn);
      setManualIsbn("");
    } else {
      toast({
        title: "Invalid ISBN",
        description: "Please enter a valid 10 or 13 digit ISBN (hyphens and spaces will be automatically removed)",
        variant: "destructive",
      });
    }
  };

  // Load Scanbot SDK
  useEffect(() => {
    const loadScanbotSDK = async () => {
      try {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/scanbot-web-sdk@7.2.0/bundle/ScanbotSDK.ui2.min.js';
        script.onload = async () => {
          try {
            console.log('Scanbot SDK script loaded, initializing...');
            const licenseKey = getLicenseKey();
            await window.ScanbotSDK.initialize({
              licenseKey: licenseKey,
              engine: "/"
            });
            console.log('Scanbot SDK initialized successfully');
            setIsSDKLoaded(true);
          } catch (error) {
            console.error('Failed to initialize Scanbot SDK:', error);
          }
        };
        script.onerror = () => {
          console.error('Failed to load Scanbot SDK script');
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Scanbot SDK:', error);
      }
    };

    loadScanbotSDK();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back-to-library">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Library
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Book Scanning</h1>
            </div>
            <div className="text-sm text-gray-600">
              {queue.filter(item => item.status === 'success').length} books added
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Left Column - Scanner */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-medium mb-4">Camera Scanner</h2>
              
              {/* Camera Preview Area */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '4/3' }}>
                <div 
                  ref={scannerRef} 
                  className="w-full h-full" 
                  data-testid="camera-preview" 
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4">
                    <Button 
                      onClick={startScanner} 
                      className="primary-button text-lg px-8 py-4 h-auto" 
                      disabled={!isSDKLoaded}
                      data-testid="button-start-scanner"
                    >
                      <Camera className="w-6 h-6 mr-3" />
                      {isSDKLoaded ? 'Start Scanning' : 'Loading Scanner...'}
                    </Button>
                    {queue.length > 0 && (
                      <div className="text-sm text-gray-400">
                        Ready to scan your next book!
                      </div>
                    )}
                  </div>
                )}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-75 text-white text-sm px-3 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-coral-red rounded-full animate-pulse"></div>
                        <span>Point camera at barcode...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Manual ISBN Input */}
              <div className="space-y-4">
                <div className="text-center text-gray-600 text-sm">
                  Can't scan? Enter ISBN manually
                </div>
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Enter 10 or 13-digit ISBN"
                    value={manualIsbn}
                    onChange={(e) => setManualIsbn(e.target.value)}
                    className="flex-1"
                    data-testid="input-manual-isbn"
                  />
                  <Button 
                    onClick={handleManualLookup}
                    disabled={!manualIsbn.trim()}
                    data-testid="button-lookup-isbn"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Queue */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">
                  Scanning Queue ({queue.length})
                </h2>
                {queue.some(item => ['scanning', 'looking-up', 'adding'].includes(item.status)) && (
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-600">Processing...</span>
                  </div>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">No books scanned yet</p>
                  <p className="text-sm">Start scanning to build your library</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQueue([])}
                      className="text-sm text-gray-500 hover:text-gray-700"
                      data-testid="button-clear-queue"
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {queue.map((item) => (
                      <QueueItemCard 
                        key={item.id} 
                        item={item} 
                        onRetry={() => retryQueueItem(item)}
                        onRemove={() => removeFromQueue(item.id)}
                      />
                    ))}
                  </div>
                  
                  {scanCount > 0 && (
                    <div className="mt-4 pt-4 border-t text-sm text-gray-500 text-center">
                      {queue.filter(item => item.status === 'success').length} of {scanCount} books added successfully
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}