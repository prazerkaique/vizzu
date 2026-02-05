import React, { createContext, useContext, useState, useCallback } from 'react';

interface ImageViewerOptions {
  alt?: string;
  onDownload?: () => void;
}

interface ImageViewerState {
  isOpen: boolean;
  src: string;
  alt: string;
  onDownload?: () => void;
}

interface ImageViewerContextType {
  state: ImageViewerState;
  openViewer: (src: string, options?: ImageViewerOptions) => void;
  closeViewer: () => void;
}

const INITIAL_STATE: ImageViewerState = {
  isOpen: false,
  src: '',
  alt: '',
};

const ImageViewerContext = createContext<ImageViewerContextType | null>(null);

export function ImageViewerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ImageViewerState>(INITIAL_STATE);

  const openViewer = useCallback((src: string, options?: ImageViewerOptions) => {
    setState({
      isOpen: true,
      src,
      alt: options?.alt ?? '',
      onDownload: options?.onDownload,
    });
  }, []);

  const closeViewer = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return (
    <ImageViewerContext.Provider value={{ state, openViewer, closeViewer }}>
      {children}
    </ImageViewerContext.Provider>
  );
}

export function useImageViewer() {
  const ctx = useContext(ImageViewerContext);
  if (!ctx) throw new Error('useImageViewer must be used within ImageViewerProvider');
  return ctx;
}
