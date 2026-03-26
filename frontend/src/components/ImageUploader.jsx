import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImagePlus, UploadCloud } from "lucide-react";

const MAX_MB = 5;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.84;

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image."));
    };
    image.src = objectUrl;
  });

const getResizedDimensions = (width, height) => {
  const longestSide = Math.max(width, height);
  if (longestSide <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_IMAGE_DIMENSION / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const optimizeImage = async (file) => {
  const image = await loadImageFromFile(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  const { width, height } = getResizedDimensions(originalWidth, originalHeight);
  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const dataUrl =
    outputType === "image/png"
      ? canvas.toDataURL(outputType)
      : canvas.toDataURL(outputType, JPEG_QUALITY);

  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error("Invalid image data URL.");
  }

  return {
    dataUrl,
    width,
    height,
    originalWidth,
    originalHeight,
  };
};

const ImageUploader = ({ onFileSelected, imagePreview, onProcessingChange }) => {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(null);

  const validateAndSet = async (file) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLocalError("Please choose a PNG, JPEG, or WEBP image.");
      setProcessingMessage(null);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`Image is too large. Max ${MAX_MB}MB.`);
      setProcessingMessage(null);
      return;
    }

    setIsProcessing(true);
    setLocalError(null);
    setProcessingMessage("Optimizing image for faster upload...");
    onProcessingChange?.(true);

    try {
      const optimizedImage = await optimizeImage(file);
      const wasResized =
        optimizedImage.width !== optimizedImage.originalWidth ||
        optimizedImage.height !== optimizedImage.originalHeight;

      setProcessingMessage(
        wasResized
          ? `Image ready. Resized to ${optimizedImage.width}x${optimizedImage.height} for faster responses.`
          : `Image ready. ${optimizedImage.width}x${optimizedImage.height}.`,
      );
      onFileSelected(optimizedImage.dataUrl);
    } catch {
      setLocalError("Couldn't read that image. Please try another file.");
      setProcessingMessage(null);
    } finally {
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    validateAndSet(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    validateAndSet(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="uppercase tracking-[0.2em] text-xs text-sky-200">Upload</p>
          <h3 className="text-lg font-semibold text-white">Pick an image to explore</h3>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isProcessing}
          onClick={() => inputRef.current?.click()}
          aria-label="Select image"
        >
          <UploadCloud className="h-4 w-4" />
          {isProcessing ? "Optimizing..." : imagePreview ? "Change Image" : "Browse"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          hidden
        />
      </div>

      {localError && (
        <p
          className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
          role="alert"
        >
          {localError}
        </p>
      )}

      {processingMessage && !localError && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            isProcessing
              ? "border border-sky-300/40 bg-sky-400/10 text-sky-100"
              : "border border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
          }`}
          role="status"
        >
          {processingMessage}
        </p>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border border-dashed transition-all ${
          isDragging ? "border-sky-300/60 bg-sky-500/5 shadow-glow" : "border-white/20 bg-white/5"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {!imagePreview ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center text-slate-200">
            <ImagePlus className="h-10 w-10 text-sky-200" />
            <p className="text-sm">
              {isProcessing ? "Preparing your image..." : "Drag & drop an image here or click browse."}
            </p>
            <p className="text-xs text-slate-400">
              PNG, JPEG, WEBP | Max {MAX_MB}MB | Auto-resized to {MAX_IMAGE_DIMENSION}px max
            </p>
          </div>
        ) : (
          <motion.img
            key={imagePreview}
            src={imagePreview}
            alt="Uploaded preview"
            initial={{ opacity: 0.6, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full h-full max-h-[320px] object-cover"
          />
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
