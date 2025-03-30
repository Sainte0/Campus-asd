'use client';

import { useState } from 'react';

interface VideoPreviewProps {
  videoId: string;
  title: string;
}

export default function VideoPreview({ videoId, title }: VideoPreviewProps) {
  const [isError, setIsError] = useState(false);

  return (
    <div className="relative w-full pt-[56.25%] bg-gray-100 rounded-lg overflow-hidden">
      {isError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400 mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <p className="text-gray-600 font-medium">Vista previa no disponible</p>
            <p className="text-sm text-gray-500 mt-1">El video no está disponible en este momento</p>
          </div>
        </div>
      ) : (
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => setIsError(true)}
        />
      )}
    </div>
  );
} 