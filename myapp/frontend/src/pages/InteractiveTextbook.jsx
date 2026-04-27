import { useState, useEffect } from 'react';
import Header from '../Components/Header.jsx';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const pdfOptions = {
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

function InteractiveTextbook() {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [containerWidth, setContainerWidth] = useState();
    const [inputPage, setInputPage] = useState(pageNumber);
    const [extractedLines, setExtractedLines] = useState([]);
    const [isLoadingText, setIsLoadingText] = useState(false);

    const fileUrl = "https://verbose-spork-gwgjqjxqpw5fw656-8000.app.github.dev/api/static/SejongKorean1.pdf";

    // --- NAVIGATION ---
    const zoomIn = () => setZoomLevel(prev => prev + 0.2);
    const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.4));
    const nextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
    const prevPage = () => setPageNumber(prev => Math.max(1, prev - 1));

    // Sync input box with page state
    useEffect(() => {
        setInputPage(pageNumber);
    }, [pageNumber]);

    // --- BACKEND OCR FETCH ---
    const fetchPageText = async (page) => {
        setIsLoadingText(true);
        try {
            const response = await fetch('/api/ocr-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    page_number: page,
                    pdf_filename: fileUrl // Sending the filename dynamically
                }),
                signal: AbortSignal.timeout(120000)
            });
            const data = await response.json();
            
            if (data.lines && Array.isArray(data.lines)) {
                setExtractedLines(data.lines);
            } else {
                setExtractedLines([]);
            }
        } catch (error) {
            console.error("OCR Fetch failed:", error);
            setExtractedLines([]);
        } finally {
            setIsLoadingText(false);
        }
    };

    // Trigger OCR whenever pageNumber changes
    useEffect(() => {
        fetchPageText(pageNumber);
    }, [pageNumber]);

    const handlePageSubmit = (e) => {
        if (e.key === 'Enter') {
            const newPage = parseInt(inputPage, 10);
            if (newPage >= 1 && newPage <= numPages) {
                setPageNumber(newPage);
            } else {
                setInputPage(pageNumber); 
            }
        }
    };

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    return (
        <div className="page-layout">
            <Header />

            <div className="interactive-textbook-container">
                {/* LEFT SIDE: PDF VIEW */}
                <div className="textbook-pdf-container" ref={(ref) => setContainerWidth(ref?.clientWidth)}>
                    <div className="pdf-controls-header">
                        <button onClick={zoomIn}>Zoom In</button>
                        <button onClick={zoomOut}>Zoom Out</button>
                        <button onClick={prevPage}>Prev Page</button>
                        <input 
                            type="number" 
                            value={inputPage}
                            onChange={(e) => setInputPage(e.target.value)}
                            onKeyDown={handlePageSubmit}
                            style={{ width: '60px', textAlign: 'center', margin: '0 10px' }}
                        />
                        <span style={{color: 'white'}}> / {numPages || '--'}</span>  
                        <button onClick={nextPage}>Next Page</button>
                    </div>

                    <Document 
                        file={fileUrl} 
                        onLoadSuccess={onDocumentLoadSuccess}
                        options={pdfOptions}
                    >
                        <Page 
                            pageNumber={pageNumber} 
                            width={containerWidth ? containerWidth : undefined}
                            scale={zoomLevel}
                            renderAnnotationLayer={false} 
                            renderTextLayer={false} // We don't need the browser's text layer anymore!
                        />
                    </Document>
                </div>

                {/* RIGHT SIDE: INTERACTIVE OCR LINES */}
                <div className="textbook-interactive-container" style={{ padding: '20px', overflowY: 'auto', background: '#f9f9f9' }}>
                    <h2>Practice Lines</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                        {isLoadingText ? (
                            <p>Reading page with OCR... (This takes a moment the first time)</p>
                        ) : extractedLines.length === 0 ? (
                            <p>No Korean text found on this page.</p>
                        ) : (
                            extractedLines.map((line, index) => (
                                <div key={index} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <p style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#333' }}>{line}</p>
                                    
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {/* You can now plug in your existing backend audio/translate functions here */}
                                        <button className="action-btn">Play Audio</button>
                                        <button className="action-btn">Translate</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InteractiveTextbook;