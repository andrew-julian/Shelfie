import React, { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Crop, Check, X, Move } from "lucide-react";

interface CoverEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: {
    id: string;
    title: string;
    coverImages?: string[];
  };
  currentCoverIndex: number;
  onCoverSelect: (index: number) => void;
  onCustomCover: (croppedImageData: string) => void;
  isUpdating: boolean;
}

export function CoverEditorModal({
  isOpen,
  onClose,
  book,
  currentCoverIndex,
  onCoverSelect,
  onCustomCover,
  isUpdating
}: CoverEditorModalProps) {
  const [activeTab, setActiveTab] = useState("gallery");
  const [cropMode, setCropMode] = useState(false);
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(currentCoverIndex);
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [cropSettings, setCropSettings] = useState({
    x: 12.5, // Start at 12.5% to center a 75% width crop
    y: 0,
    width: 75, // Start with 75% width
    height: 100 // Full height
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  const handleCoverSelection = (index: number) => {
    setSelectedCoverIndex(index);
  };

  const handleApplySelection = () => {
    if (selectedCoverIndex !== currentCoverIndex) {
      onCoverSelect(selectedCoverIndex);
    }
    onClose();
  };

  const handleCustomUpload = () => {
    setActiveTab("custom");
    // Create a file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          setCropImageUrl(imageUrl);
          setCropMode(true);
          setActiveTab("crop");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };



  const handleCropFromExisting = (imageUrl: string) => {
    setCropImageUrl(imageUrl);
    setCropMode(true);
    setActiveTab("crop");
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`Starting drag with handle: ${handle}`);
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragHandle || !cropContainerRef.current) return;

    e.preventDefault();
    const container = cropContainerRef.current;
    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    setCropSettings(prev => {
      let newSettings = { ...prev };

      switch (dragHandle) {
        case 'move':
          // Move the entire crop box
          newSettings.x = Math.max(0, Math.min(100 - prev.width, prev.x + deltaX));
          newSettings.y = Math.max(0, Math.min(100 - prev.height, prev.y + deltaY));
          break;
        case 'nw': // Northwest corner
          const newWidth = prev.width - deltaX;
          const newHeight = prev.height - deltaY;
          if (newWidth > 10 && newHeight > 10) {
            newSettings.x = prev.x + deltaX;
            newSettings.y = prev.y + deltaY;
            newSettings.width = newWidth;
            newSettings.height = newHeight;
          }
          break;
        case 'ne': // Northeast corner
          const neWidth = prev.width + deltaX;
          const neHeight = prev.height - deltaY;
          if (neWidth > 10 && neHeight > 10) {
            newSettings.y = prev.y + deltaY;
            newSettings.width = neWidth;
            newSettings.height = neHeight;
          }
          break;
        case 'sw': // Southwest corner
          const swWidth = prev.width - deltaX;
          const swHeight = prev.height + deltaY;
          if (swWidth > 10 && swHeight > 10) {
            newSettings.x = prev.x + deltaX;
            newSettings.width = swWidth;
            newSettings.height = swHeight;
          }
          break;
        case 'se': // Southeast corner
          const seWidth = prev.width + deltaX;
          const seHeight = prev.height + deltaY;
          if (seWidth > 10 && seHeight > 10) {
            newSettings.width = seWidth;
            newSettings.height = seHeight;
          }
          break;
        case 'n': // North edge
          const nHeight = prev.height - deltaY;
          if (nHeight > 10) {
            newSettings.y = prev.y + deltaY;
            newSettings.height = nHeight;
          }
          break;
        case 's': // South edge
          const sHeight = prev.height + deltaY;
          if (sHeight > 10) {
            newSettings.height = sHeight;
          }
          break;
        case 'w': // West edge
          const wWidth = prev.width - deltaX;
          if (wWidth > 10) {
            newSettings.x = prev.x + deltaX;
            newSettings.width = wWidth;
          }
          break;
        case 'e': // East edge
          const eWidth = prev.width + deltaX;
          if (eWidth > 10) {
            newSettings.width = eWidth;
          }
          break;
      }

      // Constrain to bounds
      newSettings.x = Math.max(0, Math.min(100 - newSettings.width, newSettings.x));
      newSettings.y = Math.max(0, Math.min(100 - newSettings.height, newSettings.y));
      newSettings.width = Math.max(10, Math.min(100 - newSettings.x, newSettings.width));
      newSettings.height = Math.max(10, Math.min(100 - newSettings.y, newSettings.height));

      return newSettings;
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragHandle, dragStart]);

  const handleMouseUp = useCallback(() => {
    console.log('Ending drag');
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  // Add event listeners for mouse move and up
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCropApply = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to desired output size
    canvas.width = 300;
    canvas.height = 400;

    // Calculate crop area based on settings
    const { x, y, width, height } = cropSettings;
    
    const cropX = (x * img.naturalWidth) / 100;
    const cropY = (y * img.naturalHeight) / 100;
    const cropWidth = (width * img.naturalWidth) / 100;
    const cropHeight = (height * img.naturalHeight) / 100;
    
    ctx.drawImage(
      img,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, canvas.width, canvas.height
    );

    // Convert to base64
    const croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
    onCustomCover(croppedImageData);
    setCropMode(false);
    onClose();
  };

  const resetCropSettings = () => {
    setCropSettings({
      x: 12.5, // Center the 75% width crop
      y: 0,
      width: 75, // Start with 75% width  
      height: 100 // Full height
    });
  };

  if (!book.coverImages) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="w-5 h-5 text-coral-red" />
              Edit Cover - {book.title}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className={`grid w-full ${cropMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Select Cover
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Custom Upload
              </TabsTrigger>
              {cropMode && (
                <TabsTrigger value="crop" className="flex items-center gap-2">
                  <Crop className="w-4 h-4" />
                  Crop Image
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="gallery" className="space-y-4 flex-1">
              <div className="text-sm text-gray-600 mb-4">
                Choose from available cover options for this book:
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {book.coverImages.map((coverUrl, index) => (
                  <div key={index} className="relative group">
                    <button
                      onClick={() => handleCoverSelection(index)}
                      className={`relative w-full aspect-[3/4] rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                        selectedCoverIndex === index
                          ? 'border-coral-red shadow-lg scale-105'
                          : 'border-gray-200 hover:border-coral-red/50 hover:shadow-md'
                      }`}
                    >
                      <img
                        src={coverUrl}
                        alt={`Cover option ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Selection Indicator */}
                      {selectedCoverIndex === index && (
                        <div className="absolute inset-0 bg-coral-red/20 flex items-center justify-center">
                          <Check className="w-8 h-8 text-coral-red bg-white rounded-full p-1" />
                        </div>
                      )}

                      {/* Current Badge */}
                      {index === currentCoverIndex && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 left-2 text-xs"
                        >
                          Current
                        </Badge>
                      )}
                    </button>

                    {/* Crop Option */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCropFromExisting(coverUrl)}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white text-xs h-6 px-2"
                    >
                      <Crop className="w-3 h-3 mr-1" />
                      Crop
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 flex-1">
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Upload your own cover image</p>
                <Button onClick={handleCustomUpload} className="mb-2">
                  Choose Image File
                </Button>
                <p className="text-xs text-gray-500">
                  Supports JPG, PNG, GIF files up to 10MB
                </p>
              </div>
            </TabsContent>

            {cropMode && (
              <TabsContent value="crop" className="space-y-4 flex-1">
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-semibold">Crop Image</h3>
                  
                  {/* Interactive Crop Area */}
                  <div className="relative">
                    <div 
                      ref={cropContainerRef}
                      className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative max-w-md mx-auto"
                      style={{ userSelect: 'none' }}
                    >
                      <img
                        ref={imageRef}
                        src={cropImageUrl}
                        alt="Crop preview"
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                      
                      {/* Draggable Crop Box */}
                      <div
                        className="absolute border-2 border-coral-red bg-coral-red/10"
                        style={{
                          left: `${cropSettings.x}%`,
                          top: `${cropSettings.y}%`,
                          width: `${cropSettings.width}%`,
                          height: `${cropSettings.height}%`,
                          cursor: isDragging && dragHandle === 'move' ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={(e) => handleMouseDown(e, 'move')}
                      >
                        {/* Corner handles - larger and more interactive */}
                        <div 
                          className="absolute -top-2 -left-2 w-4 h-4 bg-coral-red border-2 border-white cursor-nw-resize hover:bg-coral-red/80 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'nw'); }}
                        />
                        <div 
                          className="absolute -top-2 -right-2 w-4 h-4 bg-coral-red border-2 border-white cursor-ne-resize hover:bg-coral-red/80 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'ne'); }}
                        />
                        <div 
                          className="absolute -bottom-2 -left-2 w-4 h-4 bg-coral-red border-2 border-white cursor-sw-resize hover:bg-coral-red/80 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'sw'); }}
                        />
                        <div 
                          className="absolute -bottom-2 -right-2 w-4 h-4 bg-coral-red border-2 border-white cursor-se-resize hover:bg-coral-red/80 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'se'); }}
                        />
                        
                        {/* Edge handles - larger and more interactive */}
                        <div 
                          className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-coral-red border-2 border-white cursor-n-resize hover:bg-coral-red/80 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'n'); }}
                        />
                        <div 
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-coral-red border-2 border-white cursor-s-resize hover:bg-coral-red/80 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 's'); }}
                        />
                        <div 
                          className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-coral-red border-2 border-white cursor-w-resize hover:bg-coral-red/80 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'w'); }}
                        />
                        <div 
                          className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-coral-red border-2 border-white cursor-e-resize hover:bg-coral-red/80 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'e'); }}
                        />
                        
                        {/* Move handle in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Move className="w-4 h-4 text-coral-red opacity-70" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={resetCropSettings}>
                      Reset
                    </Button>
                    <Button onClick={handleCropApply}>
                      Apply Crop
                    </Button>
                  </div>
                </div>

                {/* Hidden canvas for crop processing */}
                <canvas ref={canvasRef} className="hidden" />
              </TabsContent>
            )}
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            
            {activeTab === "gallery" && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleApplySelection}
                  disabled={isUpdating || selectedCoverIndex === currentCoverIndex}
                  className="min-w-24"
                >
                  {isUpdating ? "Applying..." : "Apply Selection"}
                </Button>
              </div>
            )}

            {activeTab === "crop" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCropMode(false);
                    setActiveTab("gallery");
                  }}
                >
                  Back to Gallery
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}