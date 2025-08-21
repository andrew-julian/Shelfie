import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Camera, Search, Check, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

declare global {
  interface Window {
    ScanbotSDK: any;
  }
}

// License keys for different environments
const LICENSE_KEYS = {
  // Production license for bookscan.vanaheim.com.au
  production: 
    "Mpyhq9Yxr3GGf71QkTvpTbBG6PIXby" +
    "GOpm3xLZKbBoXQb0nzg7kFsrOj1p6j" +
    "62fXcgBHMXh4c8qGHH+b8enoC7C1Gz" +
    "aLjmDGkNnW5TrFcrxc/gSzGROlwx7M" +
    "UZBnTpsNKeFKTBbBDlC1EDcTG2xsMZ" +
    "KWHZD3SDINOsZBgnDLKpk2LtV8ChX5" +
    "lns/8kVnLNOkXE/TddX6zHIBc+iGH5" +
    "QrsR97c/WXMkAn5YdPaiPvKgdiwAp/" +
    "pszIOcrGRZDTkUUmGm4l4oWClQriue" +
    "AL0z/H7feafqbQ435IZcAwd6AIRhUc" +
    "IHDSpexl7qk+o1n7OuCD/ZuU9wPjQ2" +
    "GjtJ/k6+/XZQ==\nU2NhbmJvdFNESw" +
    "psb2NhbGhvc3R8Ym9va3NjYW4udmFu" +
    "YWhlaW0uY29tLmF1CjE3NTYzMzkxOT" +
    "kKODM4ODYwNwo4\n",
    
  // Development license for Replit environment
  development:
    "eF/Y56HZpKOTSmY2/E1vvYTAUnpZhT" +
    "89i/FVKt+VBI2bhYuWAz5a/0PViy+D" +
    "M4gTzDqMOa1Ythk5SFt9CCmYA8ALUd" +
    "i+zv3i2xd8ostAwfWOqEeWRioBpvu7" +
    "Jq9Fe2bIaScxaco68Zi75z6oIGSNre" +
    "AqkEsNmJgK/i1ndp3vBigTNTtvZsv8" +
    "v1fNZ6QBoklDhaxSqy1aR3v8hfjnbm" +
    "By/W8t8AqiYvP33jgYPQ6354aLMV9N" +
    "A/S8WINGwE7vk/SEwreMlYRS7NoEL1" +
    "LcS6xgujaNcAmIY/CsRhQ/1hMbayLn" +
    "1oHVzWhMcQ6v3/ZeR4HeJjs4oWQXV5" +
    "Xx0N3z96nI9Q==\nU2NhbmJvdFNESw" +
    "psb2NhbGhvc3R8NzJiN2U4N2YtY2Vl" +
    "My00NmY2LThhOWEtOTM1ZWFkODE5Mj" +
    "YxLTAwLTJwYnV4eXp4bW11ZzIucmlr" +
    "ZXIucmVwbGl0LmRldgoxNzU2NDI1NT" +
    "k5CjgzODg2MDcKOA==\n"
};

// Function to get the appropriate license key based on environment
const getLicenseKey = (): string => {
  const hostname = window.location.hostname;
  
  // Check if we're in production environment
  if (hostname.includes('bookscan.vanaheim.com.au')) {
    console.log('Using production license key for bookscan.vanaheim.com.au');
    return LICENSE_KEYS.production;
  }
  
  // Check if we're in Replit environment
  if (hostname.includes('replit.dev')) {
    console.log('Using development license key for Replit environment');
    return LICENSE_KEYS.development;
  }
  
  // Default to development for localhost and other environments
  console.log('Using development license key for localhost/other environments');
  return LICENSE_KEYS.development;
};

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QueueItem {
  id: string;
  isbn: string;
  status: 'scanning' | 'looking-up' | 'adding' | 'success' | 'error' | 'duplicate';
  timestamp: number;
  bookData?: any;
  error?: string;
  retryCount: number;
}

interface QueueItemCardProps {
  item: QueueItem;
  onRetry: () => void;
  onRemove: () => void;
}

function QueueItemCard({ item, onRetry, onRemove }: QueueItemCardProps) {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'scanning':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'looking-up':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'adding':
        return <Loader2 className="w-4 h-4 animate-spin text-green-500" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'duplicate':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'scanning':
      case 'looking-up':
      case 'adding':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'duplicate':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'scanning':
        return 'Scanning...';
      case 'looking-up':
        return 'Looking up book...';
      case 'adding':
        return 'Adding to library...';
      case 'success':
        return `Added: ${item.bookData?.title || 'Book'}`;
      case 'error':
        return `Error: ${item.error || 'Unknown error'}`;
      case 'duplicate':
        return 'Already in library';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            ISBN: {item.isbn}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {getStatusText()}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-1 ml-2">
        {item.status === 'error' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-xs px-2 py-1 h-auto"
            data-testid={`button-retry-${item.id}`}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-xs px-2 py-1 h-auto text-gray-400 hover:text-gray-600"
          data-testid={`button-remove-${item.id}`}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function ScannerModal({ isOpen, onClose }: ScannerModalProps) {
  const [manualIsbn, setManualIsbn] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const scannerRef = useRef<HTMLDivElement>(null);
  const scanbotSDK = useRef<any>(null);
  const { toast } = useToast();

  // Queue management functions
  const addToQueue = useCallback((isbn: string) => {
    const id = `${isbn}-${Date.now()}`;
    const newItem: QueueItem = {
      id,
      isbn,
      status: 'scanning',
      timestamp: Date.now(),
      retryCount: 0
    };
    
    setQueue(prev => [...prev, newItem]);
    setScanCount(prev => prev + 1);
    
    // Immediately start processing this item
    processQueueItem(newItem);
    
    return id;
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
      // Update status to looking-up
      updateQueueItem(item.id, { status: 'looking-up' });
      
      // Lookup book data
      const response = await fetch(`/api/books/lookup/${item.isbn}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to lookup book');
      }
      
      const bookData = await response.json();
      
      // Update status to adding and store book data
      updateQueueItem(item.id, { 
        status: 'adding', 
        bookData 
      });
      
      // Add book to library
      const addResponse = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });
      
      if (addResponse.ok) {
        // Success!
        updateQueueItem(item.id, { status: 'success' });
        queryClient.invalidateQueries({ queryKey: ['/api/books'] });
        
        // Auto-remove successful items after 3 seconds
        setTimeout(() => {
          removeFromQueue(item.id);
        }, 3000);
        
      } else if (addResponse.status === 409) {
        // Duplicate book
        updateQueueItem(item.id, { 
          status: 'duplicate',
          error: 'Book already in library'
        });
      } else {
        const error = await addResponse.json();
        throw new Error(error.message || 'Failed to add book');
      }
      
    } catch (error) {
      console.error('Error processing queue item:', error);
      
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      // Update item with error status
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
      
      // Create enhanced configuration with better cancel button
      const config = new window.ScanbotSDK.UI.Config.BarcodeScannerScreenConfiguration();
      
      // Customize the top bar for better mobile UX
      if (config.topBar) {
        // Make the title more prominent
        if (config.topBar.title) {
          config.topBar.title.text = "Scan Book";
          config.topBar.title.color = "#FFFFFF";
        }
        
        // Enhance the cancel button for better touch targets
        if (config.topBar.cancelButton) {
          config.topBar.cancelButton.visible = true;
          config.topBar.cancelButton.text = "✕ Done"; // Use larger X symbol and clearer text
          config.topBar.cancelButton.accessibilityDescription = "Close scanner";
          
          // Make the cancel button more prominent
          if (config.topBar.cancelButton.foreground) {
            config.topBar.cancelButton.foreground.color = "#FFFFFF";
            config.topBar.cancelButton.foreground.iconVisible = true;
          }
          
          // Add background to make it more tappable
          if (config.topBar.cancelButton.background) {
            config.topBar.cancelButton.background.fillColor = "#FF3737"; // Red background
            config.topBar.cancelButton.background.strokeColor = "#FFFFFF";
            config.topBar.cancelButton.background.strokeWidth = 1.0;
          }
        }
        
        // Set top bar colors
        config.topBar.mode = "SOLID";
        config.topBar.backgroundColor = "#C8193C"; // Primary red color
      }
      
      // Also customize the color palette for better visibility
      if (config.palette) {
        config.palette.sbColorPrimary = "#C8193C";
        config.palette.sbColorOnPrimary = "#FFFFFF";
        config.palette.sbColorNegative = "#FF3737";
      }
      
      // Add user guidance and UI improvements
      if (config.userGuidance) {
        config.userGuidance.title.text = "Move the finder over a barcode";
        config.userGuidance.title.color = "#FFFFFF";
      }
      
      // Disable problematic mobile interactions that can interfere with touch targets
      const bodyStyle = document.body.style as any;
      bodyStyle.userSelect = 'none';
      bodyStyle.webkitUserSelect = 'none';
      bodyStyle.webkitTouchCallout = 'none';
      bodyStyle.webkitTapHighlightColor = 'transparent';
      
      console.log('Creating barcode scanner with config:', config);
      
      // Create and present the scanner with a timeout fallback
      const scannerPromise = window.ScanbotSDK.UI.createBarcodeScanner(config);
      
      // Add a timeout to auto-cancel if scanner gets stuck
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
          
          // Show quick success feedback
          toast({
            title: "Book Scanned!",
            description: `ISBN ${scannedCode} added to queue`,
            duration: 2000, // Short duration
          });
          
          // Automatically restart scanner for rapid scanning
          setTimeout(() => {
            if (isOpen) { // Only restart if modal is still open
              startScanner();
            }
          }, 500); // Brief pause to show feedback
        } else {
          toast({
            title: "Invalid Barcode",
            description: "Please scan a valid ISBN barcode (10-13 digits).",
            variant: "destructive",
          });
          // Restart scanner after error for continuous scanning
          setTimeout(() => {
            if (isOpen) {
              startScanner();
            }
          }, 1500);
        }
      } else {
        console.log('Scanner cancelled or no barcode detected');
        // Don't auto-restart if user cancelled
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
    } finally {
      // Always clean up mobile interaction styles when scanner closes
      const bodyStyle = document.body.style as any;
      bodyStyle.userSelect = '';
      bodyStyle.webkitUserSelect = '';
      bodyStyle.webkitTouchCallout = '';
      bodyStyle.webkitTapHighlightColor = '';
    }
  };

  const stopScanner = () => {
    setIsScanning(false);
    // Clean up mobile interaction styles
    const bodyStyle = document.body.style as any;
    bodyStyle.userSelect = '';
    bodyStyle.webkitUserSelect = '';
    bodyStyle.webkitTouchCallout = '';
    bodyStyle.webkitTapHighlightColor = '';
  };

  const handleClose = () => {
    stopScanner();
    setManualIsbn("");
    // Don't clear queue when closing - let users see the processing status
    onClose();
  };

  const handleManualLookup = () => {
    const isbn = manualIsbn.trim();
    if (isbn && (isbn.length === 10 || isbn.length === 13)) {
      addToQueue(isbn);
      setManualIsbn(""); // Clear input after adding to queue
    } else {
      toast({
        title: "Invalid ISBN",
        description: "Please enter a valid 10 or 13 digit ISBN",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isOpen && !isSDKLoaded) {
      const loadScanbotSDK = async () => {
        try {
          // Load Scanbot SDK dynamically
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/scanbot-web-sdk@7.2.0/bundle/ScanbotSDK.ui2.min.js';
          script.onload = async () => {
            try {
              console.log('Scanbot SDK script loaded, initializing...');
              // Initialize the SDK with environment-appropriate license key
              const licenseKey = getLicenseKey();
              await window.ScanbotSDK.initialize({
                licenseKey: licenseKey,
                enginePath: 'https://cdn.jsdelivr.net/npm/scanbot-web-sdk@7.2.0/bundle/bin/complete/',
              });
              console.log('Scanbot SDK initialized successfully');
              setIsSDKLoaded(true);
            } catch (error) {
              console.error('Failed to initialize Scanbot SDK:', error);
              toast({
                title: "Scanner Initialization Error",
                description: `Failed to initialize barcode scanner: ${(error as Error).message}. Please enter ISBN manually.`,
                variant: "destructive",
              });
            }
          };
          script.onerror = (error) => {
            console.error('Failed to load Scanbot SDK script:', error);
            toast({
              title: "Scanner Load Error",
              description: "Failed to load barcode scanner. Please enter ISBN manually.",
              variant: "destructive",
            });
          };
          document.head.appendChild(script);
        } catch (error) {
          console.error('Error loading Scanbot SDK:', error);
        }
      };
      
      loadScanbotSDK();
    } else if (!isOpen) {
      stopScanner();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="modal-scanner">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>Rapid Book Scanning</span>
              {scanCount > 0 && (
                <div className="text-sm font-normal text-gray-500 mt-1">
                  {scanCount} books scanned • {queue.filter(item => item.status === 'success').length} added
                </div>
              )}
            </div>
            <Button variant="ghost" onClick={handleClose} data-testid="button-close-scanner">
              Done
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Camera Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
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
                  {isSDKLoaded ? 'Start Rapid Scanning' : 'Loading Scanner...'}
                </Button>
                {queue.length > 0 && (
                  <div className="text-sm text-gray-400">
                    Ready to scan your next book!
                  </div>
                )}
              </div>
            )}
            {isScanning && (
              <>
                <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white text-sm px-3 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-coral-red rounded-full animate-pulse"></div>
                    <span>Scanning for barcodes...</span>
                  </div>
                </div>
                <Button
                  onClick={stopScanner}
                  className="absolute top-4 right-4 bg-coral-red text-white hover:bg-red-600"
                  size="sm"
                  data-testid="button-stop-scanner"
                >
                  Stop
                </Button>
              </>
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
        
        {/* Queue Display */}
        {queue.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Scanning Queue ({queue.length})
                </h3>
                {queue.some(item => ['scanning', 'looking-up', 'adding'].includes(item.status)) && (
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span className="text-xs text-blue-600">Processing...</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQueue([])}
                className="text-xs text-gray-500 hover:text-gray-700"
                data-testid="button-clear-queue"
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
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
              <div className="mt-2 text-xs text-gray-500 text-center">
                {queue.filter(item => item.status === 'success').length} of {scanCount} books added successfully
              </div>
            )}
          </div>
        )}
        
        {/* Footer with Done button */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleClose}
            className="primary-button"
            data-testid="button-done-scanner"
          >
            Done Scanning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
