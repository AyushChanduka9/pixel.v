import { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCw, RotateCcw, Save, Download, Crop, Move, ZoomIn, ZoomOut, Undo, Redo, Sun, Contrast, Droplets, Sparkles, Sliders, Palette } from 'lucide-react';

interface ImageEditorProps {
  image: any;
  onClose: () => void;
  onSave?: (editedImageBlob: Blob) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  sharpness: number;
  blur: number;
}

interface HistoryState {
  adjustments: ImageAdjustments;
  rotation: number;
  scale: number;
  position: { x: number; y: number };
  cropArea: CropArea | null;
}

export default function ImageEditor({ image, onClose, onSave }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tool, setTool] = useState<'move' | 'crop' | 'adjust'>('move');
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // New adjustment controls
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    sharpness: 0,
    blur: 0
  });
  
  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAdjustments, setShowAdjustments] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      if (imageRef.current) {
        imageRef.current = img;
      }
      initializeCanvas(img);
      setIsLoading(false);
    };
    img.onerror = () => {
      console.error('Failed to load image for editing');
      setIsLoading(false);
    };
    
    // Use the highest quality image available
    const imageUrl = image.cloudinary_url || image.storage_path;
    if (imageUrl) {
      img.src = imageUrl;
    }
  }, [image]);

  // Handle window resize to adjust canvas size
  useEffect(() => {
    const handleResize = () => {
      if (originalImage) {
        initializeCanvas(originalImage);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [originalImage]);

  const initializeCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get container dimensions with some padding
    const containerRect = container.getBoundingClientRect();
    const maxWidth = Math.max(400, Math.min(1200, containerRect.width - 40));
    const maxHeight = Math.max(300, Math.min(800, containerRect.height - 40));

    // Calculate canvas size based on image aspect ratio and container size
    const aspectRatio = img.width / img.height;
    let canvasWidth = maxWidth;
    let canvasHeight = maxWidth / aspectRatio;

    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * aspectRatio;
    }

    // Ensure minimum size
    canvasWidth = Math.max(300, canvasWidth);
    canvasHeight = Math.max(200, canvasHeight);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    setCanvasSize({ width: canvasWidth, height: canvasHeight });

    // Initialize scale to fit image in canvas with some padding
    const scaleX = canvasWidth / img.width;
    const scaleY = canvasHeight / img.height;
    const initialScale = Math.min(scaleX, scaleY) * 0.8; // 80% to provide some padding

    setScale(initialScale);
    setPosition({ x: canvasWidth / 2, y: canvasHeight / 2 });

    // Redraw after initialization
    setTimeout(() => redrawCanvas(), 10);
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImage;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Set background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.translate(position.x, position.y);
    ctx.scale(scale, scale);
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply image filters
    const filters = [];
    if (adjustments.brightness !== 0) filters.push(`brightness(${100 + adjustments.brightness}%)`);
    if (adjustments.contrast !== 0) filters.push(`contrast(${100 + adjustments.contrast}%)`);
    if (adjustments.saturation !== 0) filters.push(`saturate(${100 + adjustments.saturation}%)`);
    if (adjustments.hue !== 0) filters.push(`hue-rotate(${adjustments.hue}deg)`);
    if (adjustments.blur > 0) filters.push(`blur(${adjustments.blur}px)`);
    
    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // Draw image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    // Restore context
    ctx.restore();

    // Draw crop area if active
    if (tool === 'crop' && cropArea) {
      ctx.save();
      
      // Dim the area outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear the crop area
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      
      // Draw crop border
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      
      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = '#3b82f6';
      ctx.setLineDash([]);
      
      // Top-left
      ctx.fillRect(cropArea.x - handleSize / 2, cropArea.y - handleSize / 2, handleSize, handleSize);
      // Top-right
      ctx.fillRect(cropArea.x + cropArea.width - handleSize / 2, cropArea.y - handleSize / 2, handleSize, handleSize);
      // Bottom-left
      ctx.fillRect(cropArea.x - handleSize / 2, cropArea.y + cropArea.height - handleSize / 2, handleSize, handleSize);
      // Bottom-right
      ctx.fillRect(cropArea.x + cropArea.width - handleSize / 2, cropArea.y + cropArea.height - handleSize / 2, handleSize, handleSize);
      
      ctx.restore();
    }
  }, [originalImage, position, scale, rotation, tool, cropArea, adjustments]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleWheel = useCallback((e: WheelEvent) => {
    // Only prevent default if we're actually handling the zoom
    if (e.target === canvasRef.current) {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      const newScale = Math.max(0.1, Math.min(5, scale + delta));
      setScale(newScale);
    }
  }, [scale]);

  // Set up non-passive wheel event listener for zoom functionality
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Add wheel listener with passive: false to allow preventDefault
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Add touch-action: none to prevent browser zoom/pan gestures
    canvas.style.touchAction = 'none';

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.style.touchAction = '';
    };
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'crop') {
      setIsCropping(true);
      setCropStart({ x, y });
      setCropArea({ x, y, width: 0, height: 0 });
    } else {
      setIsDragging(true);
      setDragStart({ x: x - position.x, y: y - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isCropping && tool === 'crop') {
      const width = x - cropStart.x;
      const height = y - cropStart.y;
      setCropArea({
        x: width < 0 ? x : cropStart.x,
        y: height < 0 ? y : cropStart.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    } else if (isDragging && tool === 'move') {
      setPosition({
        x: x - dragStart.x,
        y: y - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsCropping(false);
  };

  const rotate = (direction: 'left' | 'right') => {
    const newRotation = direction === 'right' ? rotation + 90 : rotation - 90;
    setRotation(newRotation);
  };

  const fitToScreen = () => {
    if (!originalImage) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset transformations and fit to canvas
    const scaleX = canvas.width / originalImage.width;
    const scaleY = canvas.height / originalImage.height;
    const newScale = Math.min(scaleX, scaleY) * 0.9; // 90% to provide padding

    setScale(newScale);
    setPosition({ x: canvas.width / 2, y: canvas.height / 2 });
    setRotation(0);
    setCropArea(null);
  };

  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      adjustments: { ...adjustments },
      rotation,
      scale,
      position: { ...position },
      cropArea: cropArea ? { ...cropArea } : null
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    if (newHistory.length > 20) { // Limit history to 20 states
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  }, [adjustments, rotation, scale, position, cropArea, history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setAdjustments(prevState.adjustments);
      setRotation(prevState.rotation);
      setScale(prevState.scale);
      setPosition(prevState.position);
      setCropArea(prevState.cropArea);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setAdjustments(nextState.adjustments);
      setRotation(nextState.rotation);
      setScale(nextState.scale);
      setPosition(nextState.position);
      setCropArea(nextState.cropArea);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const resetTransforms = () => {
    if (originalImage) {
      initializeCanvas(originalImage);
    }
    setAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      sharpness: 0,
      blur: 0
    });
    setCropArea(null);
    saveToHistory();
  };

  const applyCrop = () => {
    if (!cropArea || !originalImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate the actual crop area in image coordinates
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    // This is a simplified crop - in a real implementation you'd need to account for all transformations
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    // For now, crop from the original image without transformations
    const scaleX = originalImage.width / canvasElement.width;
    const scaleY = originalImage.height / canvasElement.height;

    ctx.drawImage(
      originalImage,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      cropArea.width,
      cropArea.height
    );

    canvas.toBlob((blob) => {
      if (blob && onSave) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.9);

    setCropArea(null);
    setTool('move');
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a new canvas with the final image
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    if (!ctx || !originalImage) return;

    // Set canvas size based on transformations
    const rotRad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rotRad));
    const sin = Math.abs(Math.sin(rotRad));
    
    const rotatedWidth = originalImage.width * cos + originalImage.height * sin;
    const rotatedHeight = originalImage.width * sin + originalImage.height * cos;

    finalCanvas.width = rotatedWidth * scale;
    finalCanvas.height = rotatedHeight * scale;

    ctx.save();
    ctx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
    ctx.scale(scale, scale);
    ctx.rotate(rotRad);
    ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
    ctx.restore();

    finalCanvas.toBlob((blob) => {
      if (blob && onSave) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `edited-${image.title || image.original_filename || 'image'}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading image editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-white text-xl font-semibold">Image Editor</h2>
        
        <div className="flex items-center space-x-4">
          {/* Tool buttons */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setTool('move')}
              className={`p-2 rounded ${tool === 'move' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Move/Pan"
            >
              <Move className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool('crop')}
              className={`p-2 rounded ${tool === 'crop' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Crop"
            >
              <Crop className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setTool('adjust');
                setShowAdjustments(!showAdjustments);
              }}
              className={`p-2 rounded ${tool === 'adjust' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Adjustments"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>

          {/* History buttons */}
          <div className="flex space-x-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className={`p-2 rounded ${historyIndex <= 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              title="Undo"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className={`p-2 rounded ${historyIndex >= history.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              title="Redo"
            >
              <Redo className="w-5 h-5" />
            </button>
          </div>

          {/* Transform buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => rotate('left')}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded"
              title="Rotate Left"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => rotate('right')}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded"
              title="Rotate Right"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setScale(Math.max(0.1, scale - 0.1))}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-sm w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(Math.min(5, scale + 0.1))}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={fitToScreen}
              className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded text-sm"
              title="Fit to Screen"
            >
              Fit
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            {cropArea && (
              <button
                onClick={applyCrop}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Apply Crop
              </button>
            )}
            
            <button
              onClick={downloadImage}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            
            {onSave && (
              <button
                onClick={saveImage}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Save className="w-5 h-5 inline mr-2" />
                Save
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas container - scrollable */}
        <div className="flex-1 overflow-auto" ref={containerRef}>
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                
                className="border border-gray-600 cursor-crosshair bg-gray-100 shadow-lg"
                style={{ 
                  cursor: tool === 'crop' ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              />
              
              {/* Instructions */}
              <div className="absolute bottom-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded backdrop-blur-sm">
                {tool === 'crop' ? 'Click and drag to select crop area' : 
                 tool === 'adjust' ? 'Use adjustment panel to modify image' : 
                 'Click and drag to move image, scroll to zoom'}
              </div>
              
              {/* Scale info */}
              <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-3 py-2 rounded backdrop-blur-sm">
                {Math.round(scale * 100)}% • {canvasSize.width} × {canvasSize.height}
              </div>
            </div>
          </div>
        </div>

        {/* Adjustments Panel */}
        {showAdjustments && (
          <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <h3 className="text-white text-lg font-semibold mb-6 flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Adjustments
              </h3>
              
              <div className="space-y-6">
                {/* Brightness */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-300 text-sm flex items-center">
                      <Sun className="w-4 h-4 mr-2" />
                      Brightness
                    </label>
                    <span className="text-gray-400 text-sm">{adjustments.brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={adjustments.brightness}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-300 text-sm flex items-center">
                      <Contrast className="w-4 h-4 mr-2" />
                      Contrast
                    </label>
                    <span className="text-gray-400 text-sm">{adjustments.contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={adjustments.contrast}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Saturation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-300 text-sm flex items-center">
                      <Droplets className="w-4 h-4 mr-2" />
                      Saturation
                    </label>
                    <span className="text-gray-400 text-sm">{adjustments.saturation}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={adjustments.saturation}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Hue */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-300 text-sm flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      Hue
                    </label>
                    <span className="text-gray-400 text-sm">{adjustments.hue}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={adjustments.hue}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, hue: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Blur */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-300 text-sm flex items-center">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Blur
                    </label>
                    <span className="text-gray-400 text-sm">{adjustments.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={adjustments.blur}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, blur: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Quick Adjustment Buttons */}
                <div className="pt-4 border-t border-gray-700">
                  <h4 className="text-gray-300 text-sm font-medium mb-3">Quick Adjustments</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setAdjustments(prev => ({ ...prev, brightness: 20, contrast: 15 }))}
                      className="px-3 py-2 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700 transition-colors"
                    >
                      Brighten
                    </button>
                    <button
                      onClick={() => setAdjustments(prev => ({ ...prev, brightness: -15, contrast: 20 }))}
                      className="px-3 py-2 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700 transition-colors"
                    >
                      Darken
                    </button>
                    <button
                      onClick={() => setAdjustments(prev => ({ ...prev, saturation: 30, contrast: 10 }))}
                      className="px-3 py-2 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700 transition-colors"
                    >
                      Vibrant
                    </button>
                    <button
                      onClick={() => setAdjustments(prev => ({ ...prev, saturation: -80, contrast: 15 }))}
                      className="px-3 py-2 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700 transition-colors"
                    >
                      B&W
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-gray-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 text-sm">
            {image.title || image.original_filename}
          </span>
          <span className="text-gray-500 text-sm">
            {image.width} × {image.height}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={resetTransforms}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}
