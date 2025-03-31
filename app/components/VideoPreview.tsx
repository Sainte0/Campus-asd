'use client';

import { useState, useEffect } from 'react';

interface VideoPreviewProps {
  videoId: string;
  title: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    // Handle standard YouTube URLs (watch?v=)
    let videoId = url.split('v=')[1]?.split('&')[0];
    
    if (!videoId) {
      // Handle youtu.be URLs
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    
    if (!videoId) {
      // Handle embed URLs
      videoId = url.split('embed/')[1]?.split('?')[0];
    }
    
    if (!videoId) {
      // Handle shorts URLs
      videoId = url.split('shorts/')[1]?.split('?')[0];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export default function VideoPreview({ videoId, title }: VideoPreviewProps) {
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const embedUrl = getYouTubeEmbedUrl(videoId);

  useEffect(() => {
    setIsError(!embedUrl);
    setIsLoading(false);
  }, [embedUrl]);

  if (isLoading) {
    return (
      <div className="relative w-full pt-[56.25%] bg-gray-100 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
        </div>
      </div>
    );
  }

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
            <p className="text-sm text-gray-500 mt-1">No se pudo cargar el video de YouTube</p>
            <a 
              href={videoId} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-sm mt-2 inline-block"
            >
              Ver en YouTube
            </a>
          </div>
        </div>
      ) : embedUrl ? (
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => setIsError(true)}
          onLoad={() => setIsLoading(false)}
        />
      ) : null}
    </div>
  );
} 