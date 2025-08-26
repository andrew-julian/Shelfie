import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { Book } from '@shared/schema';

interface GoogleBooksViewerProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    google?: {
      books: {
        load: (options?: { language?: string }) => void;
        setOnLoadCallback: (callback: () => void) => void;
        DefaultViewer: new (container: HTMLElement) => {
          load: (
            identifier: string, 
            notFoundCallback?: () => void, 
            successCallback?: () => void
          ) => void;
        };
      };
    };
  }
}

export function GoogleBooksViewer({ book, isOpen, onClose }: GoogleBooksViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const viewerInstanceRef = useRef<any>(null);

  // Load Google Books API
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google?.books) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/books/jsapi.js';
      script.async = true;
      script.onload = () => {
        if (window.google?.books) {
          window.google.books.load();
          window.google.books.setOnLoadCallback(() => {
            setIsApiLoaded(true);
          });
        }
      };
      script.onerror = () => {
        setHasError(true);
        setErrorMessage('Failed to load Google Books API');
      };
      document.head.appendChild(script);
    } else if (window.google?.books) {
      setIsApiLoaded(true);
    }
  }, []);

  // Initialize viewer when book changes
  useEffect(() => {
    if (!isOpen || !book || !isApiLoaded || !viewerRef.current) {
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    // Clear previous viewer content
    if (viewerRef.current) {
      viewerRef.current.innerHTML = '';
    }

    try {
      if (window.google?.books?.DefaultViewer) {
        const viewer = new window.google.books.DefaultViewer(viewerRef.current);
        viewerInstanceRef.current = viewer;

        // Try multiple identifier formats for better compatibility
        const identifiers = [
          `ISBN:${book.isbn}`,
          book.isbn,
          // Remove any hyphens from ISBN
          `ISBN:${book.isbn.replace(/-/g, '')}`,
          book.isbn.replace(/-/g, '')
        ];

        const tryNextIdentifier = (index: number) => {
          if (index >= identifiers.length) {
            setIsLoading(false);
            setHasError(true);
            setErrorMessage('This book preview is not available in Google Books');
            return;
          }

          viewer.load(
            identifiers[index],
            () => {
              // Not found with this identifier, try the next one
              tryNextIdentifier(index + 1);
            },
            () => {
              // Success
              setIsLoading(false);
              setHasError(false);
            }
          );
        };

        // Start with the first identifier
        tryNextIdentifier(0);
      }
    } catch (error) {
      console.error('Error initializing Google Books viewer:', error);
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Failed to initialize book viewer');
    }
  }, [book, isOpen, isApiLoaded]);

  // Clean up viewer when dialog closes
  useEffect(() => {
    if (!isOpen && viewerRef.current) {
      viewerRef.current.innerHTML = '';
      viewerInstanceRef.current = null;
    }
  }, [isOpen]);

  if (!book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {book.title}
              {book.author && <span className="text-sm text-gray-500 ml-2">by {book.author}</span>}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0"
              data-testid="close-google-books-viewer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-600">Loading book preview...</span>
              </div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Preview Not Available
                </h3>
                <p className="text-gray-600 mb-4">
                  {errorMessage || 'This book preview is not available in Google Books.'}
                </p>
                <p className="text-sm text-gray-500">
                  This may be due to publisher restrictions or the book not being available in Google Books.
                </p>
              </div>
            </div>
          )}
          
          <div
            ref={viewerRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
            data-testid="google-books-viewer-container"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}