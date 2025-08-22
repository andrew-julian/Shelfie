import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Crop, Check, X } from "lucide-react";
import { ImageCropper } from "./image-cropper";

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
  const [showCropper, setShowCropper] = useState(false);
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(currentCoverIndex);
  const [cropImageUrl, setCropImageUrl] = useState("");

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
          setShowCropper(true);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleCropComplete = (croppedImageData: string) => {
    onCustomCover(croppedImageData);
    setShowCropper(false);
    onClose();
  };

  const handleCropFromExisting = (imageUrl: string) => {
    setCropImageUrl(imageUrl);
    setShowCropper(true);
    setActiveTab("custom");
  };

  if (!book.coverImages) return null;

  return (
    <>
      <Dialog open={isOpen && !showCropper} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="w-5 h-5 text-coral-red" />
              Edit Cover - {book.title}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Select Cover
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Custom Upload
              </TabsTrigger>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}