import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImagePlus, UploadCloud } from "lucide-react";

const MAX_MB = 5;

const ImageUploader = ({ onFileSelected, imagePreview }) => {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSet = (file) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLocalError("Please choose a PNG, JPEG, or WEBP image.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`Image is too large. Max ${MAX_MB}MB.`);
      return;
    }
    setLocalError(null);
    onFileSelected(file);
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
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Select image"
        >
          <UploadCloud className="h-4 w-4" />
          {imagePreview ? "Change Image" : "Browse"}
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
            <p className="text-sm">Drag & drop an image here or click browse.</p>
            <p className="text-xs text-slate-400">PNG, JPEG, WEBP | Max {MAX_MB}MB</p>
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
