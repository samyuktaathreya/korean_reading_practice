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

function RightBarInteractiveTextbook({ 
    selectedText, 
    playAudio, 
    handleTranslate, 
    translation, 
    isProcessing,
    activeTarget,
    setActiveTarget
}) {
    const [sentences, setSentences] = useState([]);
    
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');

    // Tracks if the user has highlighted text at least once.
    const [hasStarted, setHasStarted] = useState(false);

    useEffect(() => {
        // CRITICAL FIX: If the selection clears (like when clicking the edit box), DO NOTHING.
        // This ensures the sidebar holds onto the last selected valid text.
        if (!selectedText || selectedText.trim() === '') {
            return; 
        }

        const cleanText = selectedText
            .replace(/\n/g, ' ') 
            .replace(/[^가-힣a-zA-Z\s.?!,'"]/g, ' ') 
            .replace(/\s{2,}/g, ' ') 
            .trim();

        const derivedSentences = cleanText
            .replace(/([.!?])/g, "$1|")
            .split("|")
            .map(s => s.trim())
            .filter(s => /[가-힣]/.test(s) && s.length > 1);

        setSentences(derivedSentences);
        setHasStarted(true); // Locks the UI into the active state
        setEditingIndex(null); 
    }, [selectedText]);

    // --- Actions ---
    const onWordClick = (word) => {
        const cleanWord = word.replace(/[.,!?\"']/g, '');
        if (!cleanWord) return;

        setActiveTarget(cleanWord);
        playAudio(cleanWord);
        handleTranslate(cleanWord);
    };

    const onSentenceAction = (sentence, actionType) => {
        setActiveTarget(sentence);
        if (actionType === 'audio') playAudio(sentence);
        if (actionType === 'translate') handleTranslate(sentence);
    };

    // --- Editing Handlers ---
    const startEditing = (index, currentSentence) => {
        setEditingIndex(index);
        setEditValue(currentSentence);
    };

    const saveEdit = (index) => {
        if (!editValue.trim()) return; 

        const updatedSentences = [...sentences];
        updatedSentences[index] = editValue.trim();
        setSentences(updatedSentences);
        setEditingIndex(null);
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditValue('');
    };

    return (
        <div 
            className="textbook-interactive-container" 
            style={{ padding: '20px', overflowY: 'auto', background: '#f9f9f9', minWidth: '400px', display: 'flex', flexDirection: 'column' }}
        >
            <h2>Study Panel</h2>
            
            {/* Uses hasStarted instead of selectedText to control the empty state */}
            {!hasStarted ? (
                <div style={{ marginTop: '30px', textAlign: 'center', color: '#666' }}>
                    <p style={{ fontSize: '16px' }}>
                        <em>Highlight dialogue or paragraphs on the PDF to begin studying.</em>
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', paddingBottom: '150px' }}>
                    
                    <p style={{ fontSize: '14px', color: '#888', margin: '0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Last Selected Sentences
                    </p>

                    {sentences.length === 0 ? (
                        <p style={{ color: '#d9534f', fontSize: '14px', padding: '10px', background: '#fdf0f0', borderRadius: '4px' }}>
                            Could not extract readable Korean text from this selection. Try highlighting a different area.
                        </p>
                    ) : (
                        sentences.map((sentence, sIndex) => (
                            <div key={sIndex} style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                
                                {editingIndex === sIndex ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <textarea 
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '10px', 
                                                fontSize: '18px', 
                                                borderRadius: '4px', 
                                                border: '1px solid #007bff',
                                                minHeight: '60px',
                                                resize: 'vertical',
                                                fontFamily: 'inherit'
                                            }}
                                            autoFocus
                                        />
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={cancelEdit}
                                                style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: '#f9f9f9' }}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={() => saveEdit(sIndex)}
                                                style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: '#28a745', color: 'white' }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <p style={{ fontSize: '22px', margin: '0', color: '#333', lineHeight: '1.6', flex: 1 }}>
                                                {sentence.split(' ').map((word, wIndex) => (
                                                    <span 
                                                        key={wIndex} 
                                                        onClick={() => onWordClick(word)}
                                                        style={{ 
                                                            cursor: 'pointer', 
                                                            marginRight: '6px', 
                                                            display: 'inline-block',
                                                            transition: 'color 0.2s, background 0.2s',
                                                            borderRadius: '4px',
                                                            padding: '0 2px'
                                                        }}
                                                        onMouseOver={(e) => e.target.style.background = '#e0f0ff'}
                                                        onMouseOut={(e) => e.target.style.background = 'transparent'}
                                                        title="Click to study word"
                                                    >
                                                        {word}
                                                    </span>
                                                ))}
                                            </p>
                                            
                                            <button 
                                                onClick={() => startEditing(sIndex, sentence)}
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    cursor: 'pointer', 
                                                    color: '#6c757d', 
                                                    fontSize: '14px',
                                                    padding: '4px 8px',
                                                }}
                                                title="Edit transcription"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                                            <button 
                                                onClick={() => onSentenceAction(sentence, 'audio')} 
                                                disabled={isProcessing || editingIndex !== null}
                                                style={{ flex: 1, padding: '8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }}
                                            >
                                                🔊 Play Sentence
                                            </button>
                                            <button 
                                                onClick={() => onSentenceAction(sentence, 'translate')} 
                                                disabled={isProcessing || editingIndex !== null}
                                                style={{ flex: 1, padding: '8px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: '#007bff', color: 'white' }}
                                            >
                                                🌐 Translate Sentence
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Uses hasStarted to keep the translation box visible even if browser selection clears */}
            {(translation || isProcessing) && hasStarted && sentences.length > 0 && (
                <div style={{ 
                    position: 'sticky', 
                    bottom: '0', 
                    marginTop: 'auto',
                    padding: '15px', 
                    borderRadius: '8px 8px 0 0', 
                    background: '#eef6fc', 
                    border: '1px solid #cce4f7',
                    boxShadow: '0 -4px 10px rgba(0,0,0,0.05)'
                }}>
                    <p style={{ fontSize: '13px', color: '#555', margin: '0 0 8px 0' }}>
                        Result for: <strong>{activeTarget}</strong>
                    </p>
                    <p style={{ fontSize: '16px', margin: '0', color: '#111' }}>
                        {isProcessing ? "Processing..." : translation}
                    </p>
                </div>
            )}
        </div>
    );
}

function InteractiveTextbook() {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [containerWidth, setContainerWidth] = useState();
    const [inputPage, setInputPage] = useState(pageNumber);

    // --- REFINED STATES FOR RIGHT BAR ---
    const [selectedText, setSelectedText] = useState('');
    const [activeTarget, setActiveTarget] = useState(''); 
    const [translation, setTranslation] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const fileUrl = "https://verbose-spork-gwgjqjxqpw5fw656-8000.app.github.dev/api/static/SejongKorean1.pdf";

    // --- NAVIGATION ---
    const zoomIn = () => setZoomLevel(prev => prev + 0.2);
    const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.4));
    const nextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
    const prevPage = () => setPageNumber(prev => Math.max(1, prev - 1));

    useEffect(() => {
        setInputPage(pageNumber);
        setSelectedText('');
        setTranslation('');
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

    // --- TEXT SELECTION HANDLER ---
    const handleTextSelection = () => {
        const text = window.getSelection().toString().trim();
        if (text) {
            setSelectedText(text);
            setTranslation(''); 
            setActiveTarget('');
        }
    };

    // --- AUDIO & TRANSLATION ACTIONS ---
    const playAudio = async (textToPlay) => {
        if (!textToPlay) return;
        setIsProcessing(true);
        try {
            const response = await fetch('/api/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToPlay })
            });
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
        } catch (error) {
            console.error("Audio error:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTranslate = async (textToTranslate) => {
        if (!textToTranslate) return;
        setIsProcessing(true);
        try {
            const isSingleWord = !textToTranslate.includes(' ');
            const endpoint = isSingleWord ? '/api/parse-word' : '/api/translate-sentence';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToTranslate })
            });
            const data = await response.json();
            setTranslation(data.translation);
        } catch (error) {
            console.error("Translation error:", error);
            setTranslation("Error translating.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="page-layout">
            <Header />

            <div className="interactive-textbook-container" style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
                {/* LEFT SIDE: PDF VIEW */}
                <div 
                    className="textbook-pdf-container" 
                    ref={(ref) => setContainerWidth(ref?.clientWidth)}
                    onMouseUp={handleTextSelection} 
                    style={{ flex: 1, position: 'relative', overflowY: 'auto' }} 
                >
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
                            renderTextLayer={true} 
                        />
                    </Document>
                </div>

                {/* RIGHT SIDE: STUDY PANEL */}
                <RightBarInteractiveTextbook 
                    selectedText={selectedText}
                    playAudio={playAudio}
                    handleTranslate={handleTranslate}
                    translation={translation}
                    isProcessing={isProcessing}
                    activeTarget={activeTarget}
                    setActiveTarget={setActiveTarget}
                />
            </div>
        </div>
    );
}

export default InteractiveTextbook;