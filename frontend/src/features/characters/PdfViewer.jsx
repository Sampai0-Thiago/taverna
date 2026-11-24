import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Spinner } from '../../components/ui/index.jsx';

// Worker do pdf.js empacotado pelo Vite (renderização fora da thread principal).
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * Visualizador de PDF com pdf.js: funciona igual em desktop e celular
 * (iOS/Android não exibem PDF de forma confiável dentro de <iframe>).
 */
export default function PdfViewer({ url }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(800);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(entry.contentRect.width, 1000)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="pdf-viewer">
      <Document
        file={url}
        loading={<Spinner label="Abrindo a ficha…" />}
        error={<p className="alert alert--error">Não foi possível exibir o PDF. Use o botão “Abrir”.</p>}
        onLoadSuccess={({ numPages }) => setPages(numPages)}
      >
        {Array.from({ length: pages }, (_, i) => (
          <Page
            key={i}
            pageNumber={i + 1}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pdf-viewer__page"
          />
        ))}
      </Document>
    </div>
  );
}
