import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface TemplatePreviewImageProps {
  src: string;
  alt: string;
  thumbnailClassName?: string;
}

export default function TemplatePreviewImage({ src, alt, thumbnailClassName }: TemplatePreviewImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        title="View preview"
      >
        <img
          src={src}
          alt={alt}
          className={cn(
            'rounded-lg border border-slate-200 bg-slate-50 object-cover transition-all group-hover:ring-2 group-hover:ring-indigo-200',
            thumbnailClassName
          )}
        />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-h-[95vh] max-w-[95vw]" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-slate-600 shadow-lg hover:text-slate-900"
              title="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={src}
              alt={alt}
              className="max-h-[95vh] max-w-[95vw] rounded-xl bg-white shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
