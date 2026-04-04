import { useMemo, useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from "react-router-dom"
import '../App.css'

function Story() {
    const navigate = useNavigate()
    const location = useLocation()
    const text = location.state?.text || ""

    const [dictResult, setDictResult] = useState(null)
    
    // NEW: A reference to hold whatever audio is currently playing
    const activeAudioRef = useRef(null)

    useEffect(() => {
        if (text) {
            fetch("/api/preload-story", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text }),
            })
        }
    }, [text])

    // NEW: Cleanup function to stop audio if the user leaves the page
    useEffect(() => {
        return () => {
            if (activeAudioRef.current) {
                activeAudioRef.current.pause()
            }
        }
    }, [])

    const sentences = useMemo(() => {
    return text
        .split(/(?<=[.!?])\s+/)
        .filter(sentence => sentence.trim() !== '')
    }, [text])

    const handleWordClick = async (word) => {
        const cleanWord = word.replace(/[.!?,"']/g, "")

        const response = await fetch("/api/parse-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanWord }),
        })

        const wordData = await response.json()
        setDictResult(wordData)
    }

    const handleAudioClick = async (sentenceOrWord) => {
        const response = await fetch("/api/audio", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: sentenceOrWord }),
        })

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        // NEW: Stop the currently playing audio if it exists
        if (activeAudioRef.current) {
            activeAudioRef.current.pause()
            activeAudioRef.current.currentTime = 0 // Reset it to the beginning
        }

        const audio = new Audio(audioUrl)
        
        // NEW: Save the new audio to our reference and play it
        activeAudioRef.current = audio
        audio.play()
    }

    const handleTranslateClick = async (sentence) => {
        const response = await fetch("/api/translate-sentence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: sentence }),
        })

        const sentenceData = await response.json()
        setDictResult(sentenceData)
    }

    return (
    <div className="story-page-container">
        {dictResult && (
            <div className="dictionary-popup" style={{ border: '1px solid black', padding: '10px', marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
                <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {dictResult.base_word} 
                    
                    {!dictResult.is_sentence && (
                        <span style={{ fontSize: '12px', color: 'gray' }}>
                            ({dictResult.part_of_speech})
                        </span>
                    )}

                    <button 
                        onClick={() => handleAudioClick(dictResult.base_word)}
                        style={{ fontSize: '14px', padding: '2px 5px', cursor: 'pointer' }}
                    >
                        🔊
                    </button>
                </h3>
                <p style={{ margin: '0 0 10px 0', fontSize: dictResult.is_sentence ? '18px' : '16px', fontWeight: dictResult.is_sentence ? 'bold' : 'normal' }}>
                    {dictResult.translation}
                </p>
                <button onClick={() => setDictResult(null)}>Close</button>
            </div>
        )}

        {sentences.map((sentence, sentenceIndex) => (
        <div key={sentenceIndex} className="sentence-row">
            <div className="sentence-text">
            {sentence.split(' ').map((word, wordIndex) => (
                <span
                key={wordIndex}
                className="story-word"
                onClick={() => handleWordClick(word)}
                >
                {word}{' '}
                </span>
            ))}
            </div>

            <div className="sentence-actions">
            <button onClick={() => handleAudioClick(sentence)}>🔊</button>
            <button onClick={() => handleTranslateClick(sentence)}>Translate</button>
            </div>
        </div>
        ))}

        <button 
            className="go-home-btn"
            onClick={() => navigate("/")}
        >
            Go Back
        </button>
    </div>
    )
}

export default Story