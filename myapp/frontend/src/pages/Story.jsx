import { useMemo } from 'react'
import { useLocation } from "react-router-dom"
import '../App.css'

function Story() {
    const location = useLocation()
    const text = location.state?.text || ""
    const sentences = useMemo(() => {
    return text
        .split(/(?<=[.!?])\s+/)
        .filter(sentence => sentence.trim() !== '')
    }, [text])

    const handleWordClick = (word) => {
    console.log('clicked word:', word)
    }

    const handleAudioClick = (sentence) => {
    console.log('play audio for:', sentence)
    }

    const handleTranslateClick = (sentence) => {
    console.log('translate sentence:', sentence)
    }

    return (
    <div className="story-page-container">
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
    </div>
    )
}

export default Story