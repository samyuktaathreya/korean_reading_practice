import { useEffect, useRef, useState } from 'react';
import Header from '../Components/Header';
import * as Hangul from 'hangul-js'; 

const USER_ID = 1;

const clean = (str) => {
    return str
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")  
        .replace(/[。、！？「」『』【】]/g, "")            
        .replace(/\bim\b/g, "i am")
        .replace(/\byoure\b/g, "you are")
        .replace(/\bhes\b/g, "he is")
        .replace(/\bshes\b/g, "she is")
        .replace(/\ba\b|\ban\b|\bthe\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

const speechContainsAnswer = (transcript, correctAnswer) => {
    if (!transcript || !correctAnswer) return false;

    const normalize = (str) => clean(str).replace(/\s+/g, "").trim();
    const cleanTranscript = normalize(transcript);
    const cleanAnswer = normalize(correctAnswer);

    if (cleanTranscript.includes(cleanAnswer)) return true;

    const transcriptJamo = Hangul.disassemble(cleanTranscript);
    const answerJamo = Hangul.disassemble(cleanAnswer);

    let aIdx = 0;
    for (let tIdx = 0; tIdx < transcriptJamo.length && aIdx < answerJamo.length; tIdx++) {
        if (transcriptJamo[tIdx] === answerJamo[aIdx]) aIdx++;
    }
    return aIdx === answerJamo.length;
};

// Map question types to human-readable prompts if level defaults aren't precise enough
const typeToInstruction = (type, level) => {
    switch(type) {
        case "conversation": return "Select the best response:";
        case "error correction": return "Click on the incorrect word, then type its correction:";
        case "fill in the blank":
        case "vocab fill in the blank": return "Fill in the blank:";
        case "listening":
        case "listening sentence blocks":
        case "listening vocab": return "Listen closely and solve:";
        case "speaking":
        case "speaking sentence":
        case "speaking vocab": return "Tap mic and repeat aloud:";
        case "translate english to korean": return "Translate this to Korean:";
        case "translate korean to english": return "Translate this to English:";
        case "vocab define": return "Choose the correct definition:";
        default: return levelToInstruction(level);
    }
};

const levelToInstruction = (level) => {
    if (level === "easy")   return "Insert grammar particle:";
    if (level === "medium") return "Translate to English:";
    if (level === "hard")   return "Translate to Korean:";
    return "Answer the question:";
};

const isQuestionInKorean = (text) => {
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    return koreanRegex.test(text);
};

function diffSegments(correct, userAns) {
    if (!correct) return [];
    const correctWords = correct.split(" ");
    const userWords = (userAns || "").trim().split(" ");
    return correctWords.map((word, i) => ({
        text: word,
        underline: clean(word) !== clean(userWords[i] ?? ""),
    }));
}

function WordWithTooltip({ word, wordCache, setWordCache }) {
    const [info, setInfo] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = async () => {
        setIsHovered(true);
        if (wordCache[word]) { setInfo(wordCache[word]); return; }
        try {
            const response = await fetch('/api/parse-word', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: word })
            });
            const data = await response.json();
            setInfo(data);
            setWordCache(prev => ({ ...prev, [word]: data }));
        } catch (e) { console.error(e); }
    };

    const handleMouseClicked = async (e) => {
        e.stopPropagation();
        try {
            const response = await fetch('/api/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: word })
            });
            new Audio(URL.createObjectURL(await response.blob())).play();
        } catch (e) { console.error(e); }
    };

    return (
        <span
            className="word-tooltip-wrapper"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleMouseClicked}
        >
            {word}
            {isHovered && info && (
                <span className="word-tooltip">
                    <strong>{info.base_word}: {info.translation}</strong>
                    {info.romanization && (
                        <span className="word-tooltip-romanization"> ({info.romanization})</span>
                    )}
                    <p>Click to hear</p>
                </span>
            )}
        </span>
    );
}

function SmartInput({ value, onChange, disabled, isCorrect, hasSubmitted, needsKorean }) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (!disabled && inputRef.current) inputRef.current.focus();
    }, [disabled, needsKorean]);

    const handleKeyDown = (e) => {
        if (!needsKorean || hasSubmitted) return;

        if (e.key === 'Backspace') {
            e.preventDefault();
            const jamos = Hangul.disassemble(value);
            jamos.pop();
            onChange(Hangul.assemble(jamos));
            return;
        }

        if (e.key.length === 1) {
            e.preventDefault();
            const jamo = QWERTY_TO_HANGUL[e.key];
            const jamos = Hangul.disassemble(value);
            if (jamo) {
                onChange(Hangul.assemble([...jamos, jamo]));
            } else {
                onChange(Hangul.assemble([...jamos, e.key]));
            }
        }
    };

    return (
        <div className="input-container">
            <input
                ref={inputRef}
                value={value}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                    if (!needsKorean) onChange(e.target.value);
                }}
                disabled={disabled}
                placeholder={needsKorean ? "Type using Korean QWERTY layout..." : "Type your answer..."}
                className={`answer-input ${hasSubmitted ? (isCorrect ? "correct" : "wrong") : ""}`}
                autoComplete="off"
            />
        </div>
    );
}

const QWERTY_TO_HANGUL = {
  'r':'ㄱ','R':'ㄲ','s':'ㄴ','e':'ㄷ','E':'ㄸ','f':'ㄹ','a':'ㅁ','q':'ㅂ','Q':'ㅃ',
  't':'ㅅ','T':'ㅆ','d':'ㅇ','w':'ㅈ','W':'ㅉ','c':'ㅊ','z':'ㅋ','x':'ㅌ','v':'ㅍ','g':'ㅎ',
  'k':'ㅏ','o':'ㅐ','i':'ㅑ','O':'ㅒ','j':'ㅓ','p':'ㅔ','u':'ㅕ','P':'ㅖ','h':'ㅗ','y':'요',
  'n':'ㅜ','b':'ㅠ','m':'ㅡ','l':'ㅣ','K':'ㅘ','H':'ㅙ','Y':'ㅚ','J':'ㅝ','N':'ㅞ','B':'ㅟ','M':'ㅢ',
  ' ': ' ', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '0': '0'
};

function DiffAnswer({ correctAnswer, userAnswer }) {
    const segments = diffSegments(correctAnswer, userAnswer);
    if (!segments || segments.length === 0) {
        return <p className="diff-answer">{correctAnswer}</p>;
    }
    return (
        <p className="diff-answer">
            {segments.map((seg, i) => (
                <span key={i}>
                    {seg.underline
                        ? <span className="diff-answer__underline">{seg.text}</span>
                        : seg.text}
                    {i < segments.length - 1 ? " " : ""}
                </span>
            ))}
        </p>
    );
}

// ── NEW HELPER COMPONENT FOR MULTIPLE CHOICE UI ──
function ChoiceSelector({ choices, selectedChoice, onSelect, disabled }) {
    return (
        <div className="choices-grid">
            {choices.map((choice, index) => (
                <button
                    key={index}
                    type="button"
                    className={`choice-button ${selectedChoice === choice ? 'selected' : ''}`}
                    onClick={() => !disabled && onSelect(choice)}
                    disabled={disabled}
                >
                    <span className="choice-index">{index + 1}</span>
                    <span className="choice-text">{choice}</span>
                </button>
            ))}
        </div>
    );
}

// ── NEW HELPER COMPONENT FOR WORD/SENTENCE BLOCKS (Duolingo Style UI) ──
function SentenceBlocksUI({ blocks, value, onChange, disabled }) {
    const selectedWords = value ? value.split(" ").filter(w => w.length > 0) : [];

    // Tracks available blocks based on how many times a word option is clicked vs remains
    const handleBlockClick = (word) => {
        if (disabled) return;
        const updated = [...selectedWords, word];
        onChange(updated.join(" "));
    };

    const handleRemoveWord = (index) => {
        if (disabled) return;
        const updated = [...selectedWords];
        updated.splice(index, 1);
        onChange(updated.join(" "));
    };

    return (
        <div className="sentence-blocks-container">
            {/* Upper display tray: builds up sentence array output */}
            <div className="blocks-answer-tray">
                {selectedWords.map((word, index) => (
                    <button 
                        key={index} 
                        type="button" 
                        className="block-tile active-tile"
                        onClick={() => handleRemoveWord(index)}
                        disabled={disabled}
                    >
                        {word}
                    </button>
                ))}
                {selectedWords.length === 0 && <span className="tray-placeholder">Click tokens below to build string</span>}
            </div>

            {/* Lower choice tray: remaining items array pool selection buttons */}
            <div className="blocks-pool-tray">
                {blocks.map((word, index) => {
                    // Count how many times this precise string appears in options pool vs output selection tray
                    const occurrencesInPool = blocks.filter(w => w === word).length;
                    const occurrencesInSelection = selectedWords.filter(w => w === word).length;
                    const isUsedUp = occurrencesInSelection >= occurrencesInPool;

                    return (
                        <button
                            key={index}
                            type="button"
                            className={`block-tile ${isUsedUp ? 'tile-disabled' : ''}`}
                            onClick={() => !isUsedUp && handleBlockClick(word)}
                            disabled={disabled || isUsedUp}
                        >
                            {word}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function Question({
    currentQuestionObj, currentIndex, totalQuestions, userAnswer,
    setUserAnswer, handleSubmit, handleSkip, handleContinue,
    wordCache, setWordCache, hasSubmitted, isCorrect, lastUserAnswer,
    onPlayAudio,
}) {
    const qType = currentQuestionObj.question_type;
    const words = currentQuestionObj.question ? currentQuestionObj.question.split(" ") : [];
    
    // Config switches for determining whether to present Hangul standard QWERTY translator script logic engine values
    const questionIsKorean = isQuestionInKorean(currentQuestionObj.question || "");
    const answerNeedsKorean = qType === "translate english to korean" || qType === "fill in the blank";

    // ── ERROR CORRECTION LOCAL COMPONENT STATE ──
    const [selectedErrorWordIndex, setSelectedErrorWordIndex] = useState(null);
    const [errorWordCorrection, setErrorWordCorrection] = useState("");

    // ── DICTATION SPEAKING STATE ──
    const [isListeningSpeech, setIsListeningSpeech] = useState(false);
    const recognitionRef = useRef(null);

    // Sync sub-state variables when index steps onward or rolls backward
    useEffect(() => {
        setSelectedErrorWordIndex(null);
        setErrorWordCorrection("");
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e){}
            setIsListeningSpeech(false);
        }
    }, [currentIndex]);

    // Handle interactive click tracking for 'error correction'
    const handleWordClickErrorCorrection = (word, index) => {
        if (hasSubmitted) return;
        setSelectedErrorWordIndex(index);
        setErrorWordCorrection("");
        setUserAnswer(`Word index ${index}: `); // Placeholder initial assignment for answer evaluation check logic
    };

    // Update payload submission string when custom correction item text changes
    const handleCorrectionTextChange = (newVal) => {
        setErrorWordCorrection(newVal);
        // Pack combined data payload token for comparison check
        const targetedWord = words[selectedErrorWordIndex] || "";
        setUserAnswer(`${targetedWord} -> ${newVal}`);
    };

    // ── WEB SPEECH DICTATION HANDLERS (Speaking Question Modes) ──
    const latestTranscriptRef = useRef("");

    const startSpeechRecognition = () => {
        if (hasSubmitted) return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported on this browser device framework layout.");
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }

        latestTranscriptRef.current = "";

        const recognition = new SpeechRecognition();
        recognition.lang = (qType === "speaking" || qType === "speaking sentence" || qType === "speaking vocab") ? "ko-KR" : "en-US";
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = true;

        recognition.onstart = () => setIsListeningSpeech(true);
        recognition.onerror = (e) => { console.error(e); setIsListeningSpeech(false); };

        recognition.onresult = (event) => {
            let fullTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
                fullTranscript += event.results[i][0].transcript;
            }
            latestTranscriptRef.current = fullTranscript.trim();
            setUserAnswer(fullTranscript.trim());
        };

        // onend is the reliable place to commit — always fires after stop()
        recognition.onend = () => {
            setIsListeningSpeech(false);
            if (latestTranscriptRef.current) {
                setUserAnswer(latestTranscriptRef.current);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
            // Don't set isListeningSpeech(false) here — let onend handle it
            // so the transcript is committed first
        }
    };
    // ── RENDER DYNAMIC PROMPT ELEMENT (BASED ON TYPE) ──
    const renderQuestionDisplayPrompt = () => {
        // Listening type items obscure direct visual output string references
        const isListeningMode = ["listening", "listening sentence blocks", "listening vocab"].includes(qType);
        
        if (isListeningMode) {
            return (
                <div className="audio-prompt-container">
                    <button type="button" className="audio-btn dynamic-audio-hero" onClick={onPlayAudio}>
                        🔊 Tap to Play Audio
                    </button>
                </div>
            );
        }

        if (qType === "error correction") {
            return (
                <div className="error-sentence-strip">
                    {words.map((w, i) => {
                        const isSelected = selectedErrorWordIndex === i;
                        return (
                            <span 
                                key={i} 
                                className={`interactive-error-token ${isSelected ? 'selected-err-token' : ''}`}
                                onClick={() => handleWordClickErrorCorrection(w, i)}
                            >
                                {w}{" "}
                            </span>
                        );
                    })}
                </div>
            );
        }

        // Default layout displays base words with dictionary tooltip options
        return (
            <h1 className="question-h1">
                {questionIsKorean
                    ? words.map((w, i) => (
                        <WordWithTooltip key={i} word={w} wordCache={wordCache} setWordCache={setWordCache} />
                      ))
                    : currentQuestionObj.question
                }
            </h1>
        );
    };

    // ── RENDER DYNAMIC ANSWER INPUT ELEMENT (BASED ON TYPE) ──
    const renderAnswerInputUI = () => {
        // 1. Multiple Choice Interfaces
        if (["conversation", "listening vocab", "vocab define", "vocab fill in the blank"].includes(qType)) {
            return (
                <ChoiceSelector 
                    choices={currentQuestionObj.choices || []}
                    selectedChoice={userAnswer}
                    onSelect={setUserAnswer}
                    disabled={hasSubmitted}
                />
            );
        }

        // 2. Clickable Word Block Interfaces
        if (qType === "listening sentence blocks") {
            return (
                <SentenceBlocksUI 
                    blocks={currentQuestionObj.blocks || []}
                    value={userAnswer}
                    onChange={setUserAnswer}
                    disabled={hasSubmitted}
                />
            );
        }

        // 3. Error Correction Custom Input Box Override
        if (qType === "error correction") {
            return (
                <div className="error-correction-input-zone">
                    {selectedErrorWordIndex !== null ? (
                        <div className="correction-field-box">
                            <p className="sub-tag">Correcting word: <strong>{words[selectedErrorWordIndex]}</strong></p>
                            <SmartInput 
                                value={errorWordCorrection}
                                onChange={handleCorrectionTextChange}
                                disabled={hasSubmitted}
                                isCorrect={isCorrect}
                                hasSubmitted={hasSubmitted}
                                needsKorean={isQuestionInKorean(currentQuestionObj.question)}
                            />
                        </div>
                    ) : (
                        <p className="prompt-fallback-notice">Click on the incorrect word in the sentence display frame above.</p>
                    )}
                </div>
            );
        }

        // 4. Voice Dictation Interfaces
        if (["speaking", "speaking sentence", "speaking vocab"].includes(qType)) {
            return (
                <div className="speech-dictation-control-panel">
                    <button 
                        type="button" 
                        className={`mic-trigger-btn ${isListeningSpeech ? 'mic-active-pulse' : ''}`}
                        onClick={isListeningSpeech ? stopSpeechRecognition : startSpeechRecognition}
                        disabled={hasSubmitted}
                    >
                        {isListeningSpeech ? "⏹ Stop Recording" : (userAnswer ? "🔄 Re-record" : "🎤 Tap to Speak")}
                    </button>

                    {userAnswer && (
                        <div className="speech-transcription-preview">
                            <p className="preview-label">{isListeningSpeech ? "🎙️ Listening..." : "Detected Transcription:"}</p>
                            <p className="preview-string">"{userAnswer}"</p>
                        </div>
                    )}

                    {userAnswer && !hasSubmitted && !isListeningSpeech && (
                        <button type="submit" className="btn btn--check speech-submit-btn">
                            ✓ Submit Answer
                        </button>
                    )}
                </div>
            );
        }

        // 5. Default Fallback standard Keyboard Box Inputs
        return (
            <SmartInput
                value={userAnswer}
                onChange={setUserAnswer}
                disabled={hasSubmitted}
                isCorrect={isCorrect}
                hasSubmitted={hasSubmitted}
                needsKorean={answerNeedsKorean}
            />
        );
    };

    return (
        <div className="question-page">
            {currentQuestionObj.was_wrong && (
                <p className="repeat-indicator">⚠️ Previously answered wrong</p>
            )}

            <p className="question-counter">Question {currentIndex + 1} of {totalQuestions}</p>
            <h2 className="question-instruction">
                {typeToInstruction(qType, currentQuestionObj.level)}
            </h2>

            <div className="question-text">
                {renderQuestionDisplayPrompt()}
                {questionIsKorean && !currentQuestionObj.question.includes("___") && !["listening", "listening sentence blocks", "listening vocab"].includes(qType) && (
                    <button type="button" className="audio-btn" onClick={onPlayAudio}>
                        🔈 Play Audio
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="answer-form">
                {renderAnswerInputUI()}

                {!hasSubmitted && (
                    <div className="answer-actions">
                        {!["speaking", "speaking sentence", "speaking vocab"].includes(qType) && (
                            <button type="submit" className="btn btn--check" disabled={!userAnswer}>CHECK</button>
                        )}
                        <button type="button" className="btn btn--skip" onClick={handleSkip}>SKIP</button>
                    </div>
                )}
            </form>

            {hasSubmitted && (
                <div className={`result-bar ${isCorrect ? "result-bar--correct" : "result-bar--wrong"}`}>
                    <div className="result-bar__text">
                        <h2 className="result-bar__title">
                            {isCorrect ? "Excellent!" : "Correct solution:"}
                        </h2>
                        {!isCorrect && (
                            <DiffAnswer
                                correctAnswer={currentQuestionObj.answer}
                                userAnswer={lastUserAnswer}
                            />
                        )}
                    </div>
                    <button
                        onClick={handleContinue}
                        className={`btn btn--continue ${isCorrect ? "btn--continue-correct" : "btn--continue-wrong"}`}
                    >
                        CONTINUE
                    </button>
                </div>
            )}
        </div>
    );
}

// ── ProgressDashboard Component (Unchanged) ──
function ProgressDashboard({ progressData, onStartSession, isLoading }) {
    const [selectedBucket, setSelectedBucket] = useState(null);

    if (!progressData) return <div className="loading-screen">Loading your setup...</div>;

    const { current_unit, milestone_summary, knowledge_grid } = progressData;
    
    let progressPercent = 0;
    if (milestone_summary.current_step === "intro_rounds") {
        progressPercent = (milestone_summary.intro_rounds_completed / 2) * 100;
    } else {
        progressPercent = (milestone_summary.stable_tags_in_unit / milestone_summary.total_tags_in_unit) * 100;
    }

    const buckets = [
        { label: "0-20%", min: 0.0, max: 0.2, key: "b1", statusClass: "chart-bar--weak" },
        { label: "21-40%", min: 0.2, max: 0.4, key: "b2", statusClass: "chart-bar--weak" },
        { label: "41-60%", min: 0.4, max: 0.6, key: "b3", statusClass: "chart-bar--weak" },
        { label: "61-80%", min: 0.6, max: 0.8, key: "b4", statusClass: "chart-bar--cooling" },
        { label: "81-100%", min: 0.8, max: 1.01, key: "b5", statusClass: "chart-bar--stable" }
    ];

    const bucketData = buckets.map(b => {
        const tagsInBucket = knowledge_grid.filter(item => item.strength >= b.min && item.strength < b.max);
        return { ...b, tags: tagsInBucket, count: tagsInBucket.length };
    });

    const maxCount = Math.max(...bucketData.map(b => b.count), 1);
    const activeBucketInfo = bucketData.find(b => b.key === selectedBucket);

    return (
        <div className="dashboard-container">
            <div className="unit-badge">📍 Current Unit: {current_unit}</div>
            <div className="milestone-card">
                <h3 className="objective-title">Current Objective</h3>
                <p className="objective-text">{milestone_summary.status_message}</p>
                <div className="progress-track-wrapper">
                    <div 
                        className={`progress-track-fill ${milestone_summary.current_step === 'unit_test_ready' ? 'fill-success' : 'fill-primary'}`}
                        style={{ width: `${progressPercent}%` }} 
                    />
                </div>
            </div>

            <div className="chart-section">
                <h4 className="chart-heading">Concept Mastery Breakdown</h4>
                <p className="chart-subheading">Click on any bar to inspect underlying tags</p>
                <div className="histogram-chart">
                    {bucketData.map((b) => {
                        const barHeightPercent = (b.count / maxCount) * 100;
                        const isBarActive = selectedBucket === b.key;
                        return (
                            <div 
                                key={b.key} 
                                className={`chart-column-wrapper ${isBarActive ? 'column-active' : ''}`}
                                onClick={() => setSelectedBucket(isBarActive ? null : b.key)}
                            >
                                <div className="chart-value-label">{b.count}</div>
                                <div className="chart-bar-container">
                                    <div className={`chart-bar-fill ${b.statusClass}`} style={{ height: `${barHeightPercent}%` }}/>
                                </div>
                                <div className="chart-axis-label">{b.label}</div>
                            </div>
                        );
                    })}
                </div>

                {activeBucketInfo && (
                    <div className="inspection-panel">
                        <h5 className="inspection-title">Tags at {activeBucketInfo.label} Strength ({activeBucketInfo.count})</h5>
                        {activeBucketInfo.count === 0 ? (
                            <p className="empty-inspection-text">No tags currently within this range.</p>
                        ) : (
                            <div className="inspection-list">
                                {activeBucketInfo.tags.map(t => (
                                    <div key={t.tag} className={`inspection-item-tag border-${t.status}`}>
                                        <span className="inspection-tag-name">{t.tag}</span>
                                        <span className="inspection-tag-val">{(t.strength * 100).toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="action-wrapper">
                <button onClick={onStartSession} disabled={isLoading} className="btn btn--start full-width-btn">
                    {isLoading ? "Generating..." : milestone_summary.current_step === "unit_test_ready" ? "🏆 START GRADUATION TEST" : "🚀 START PRACTICE SESSION"}
                </button>
            </div>
        </div>
    );
}

export default function DuolingoStyleQuestions() {
    const [questions, setQuestions]               = useState([]);
    const [currentIndex, setCurrentIndex]         = useState(0);
    const [userAnswer, setUserAnswer]             = useState("");
    const [lastUserAnswer, setLastUserAnswer]     = useState("");
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isLoading, setIsLoading]               = useState(false);
    const [score, setScore]                       = useState(0);
    const [answerLog, setAnswerLog]               = useState([]);
    const [wordCache, setWordCache]               = useState({});
    const [isUnitTest, setIsUnitTest]             = useState(false);
    const [hasSubmitted, setHasSubmitted]         = useState(false);
    const [isCorrect, setIsCorrect]               = useState(false);
    const [progressData, setProgressData]         = useState(null);
    const [sessionType, setSessionType]           = useState("");

    useEffect(() => {
        if (!isSessionStarted) fetchProgress();
    }, [isSessionStarted]);

    const fetchProgress = async () => {
        try {
            const response = await fetch(`/api/user_progress/${USER_ID}`);
            const data = await response.json();
            setProgressData(data);
        } catch (e) { console.error("Error pulling progress summary:", e); }
    };

    const currentQuestionObj = questions[currentIndex] ?? null;

    // Auto-play audio rule modification
    useEffect(() => {
        if (!currentQuestionObj) return;
        
        // Auto-triggers for listening variants or standard Korean sentences
        const isListeningMode = ["listening", "listening sentence blocks", "listening vocab"].includes(currentQuestionObj.question_type);
        const shouldPlay = isListeningMode || (isQuestionInKorean(currentQuestionObj.question || "") && !currentQuestionObj.question.includes("___"));
        
        if (!shouldPlay) return;

        let cancelled = false;
        (async () => {
            try {
                const textToVoice = isListeningMode ? currentQuestionObj.answer : currentQuestionObj.question;
                const resp = await fetch('/api/audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: textToVoice })
                });
                if (cancelled) return;
                new Audio(URL.createObjectURL(await resp.blob())).play();
            } catch (e) { console.error(e); }
        })();

        return () => { cancelled = true; };
    }, [currentIndex, questions]);

    const playQuestionAudio = async () => {
        if (!currentQuestionObj) return;
        const isListeningMode = ["listening", "listening sentence blocks", "listening vocab"].includes(currentQuestionObj.question_type);
        const textToVoice = isListeningMode ? currentQuestionObj.answer : currentQuestionObj.question;
        try {
            const resp = await fetch('/api/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToVoice })
            });
            new Audio(URL.createObjectURL(await resp.blob())).play();
        } catch (e) { console.error(e); }
    };

    const startSession = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/generate_session/${USER_ID}`);
            const data = await response.json();
            setQuestions(data.question_set);
            setIsUnitTest(data.session_type === "unit_test");
            setCurrentIndex(0);
            setScore(0);
            setAnswerLog([]);
            setUserAnswer("");
            setLastUserAnswer("");
            setHasSubmitted(false);
            setIsSessionStarted(true);
            setSessionType(data.session_type);
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!currentQuestionObj || hasSubmitted) return;

        // Custom matching rules based on question structure
        const isSpeakingType = ["speaking", "speaking sentence", "speaking vocab"].includes(currentQuestionObj.question_type);

        let correct = false;
        if (isSpeakingType) {
            correct = speechContainsAnswer(userAnswer, currentQuestionObj.answer);
        } else if (currentQuestionObj.question_type === "error correction") {
            // Evaluates structured dynamic output payload against explicit solution values 
            correct = clean(userAnswer) === clean(currentQuestionObj.answer);
        } else {
            correct = clean(userAnswer) === clean(currentQuestionObj.answer);
        }
        
        setLastUserAnswer(userAnswer);
        setIsCorrect(correct);
        setHasSubmitted(true);
        if (correct && !currentQuestionObj.was_wrong) setScore(s => s + 1);
    };

    const handleContinue = async () => {
        let currentLog = [...answerLog, { question_data: currentQuestionObj, is_correct: isCorrect }];
        if (!isUnitTest && !isCorrect) {
            setQuestions(prev => [...prev, { ...currentQuestionObj, was_wrong: true }]);
        }
        setAnswerLog(currentLog);
        const nextIndex = currentIndex + 1;
        
        if (nextIndex >= questions.length) {
            try {
                await fetch(`/api/practice/submit_session/${USER_ID}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        list_of_question_data: currentLog.map(item => item.question_data),
                        is_correct: currentLog.map(item => item.is_correct),
                        session_type: sessionType,
                    })
                });
            } catch (error) { console.error("Failed to submit session results", error); }
        }

        setCurrentIndex(nextIndex);
        setUserAnswer("");
        setLastUserAnswer("");
        setHasSubmitted(false);
        setIsCorrect(false);
    };

    const renderContent = () => {
        if (!isSessionStarted) return (
            <ProgressDashboard progressData={progressData} onStartSession={startSession} isLoading={isLoading} />
        );
        if (isLoading && questions.length === 0) return (
            <div className="loading-screen">Loading Session Setup...</div>
        );
        if (currentIndex >= questions.length) return (
            <div className="complete-screen">
                <h1>🎉 Session Complete!</h1>
                <p>Final Accuracy: {score} / {questions.filter(q => !q.was_wrong).length}</p>
                <button className="btn btn--start" onClick={() => setIsSessionStarted(false)}>Return to Dashboard</button>
            </div>
        );

        return (
            <Question
                currentQuestionObj={currentQuestionObj}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                userAnswer={userAnswer}
                setUserAnswer={setUserAnswer}
                handleSubmit={handleSubmit}
                handleSkip={() => {
                    const isSpeakingType = ["speaking", "speaking sentence", "speaking vocab"].includes(currentQuestionObj.question_type);
                    setLastUserAnswer(userAnswer);
                    setIsCorrect(isSpeakingType);
                    setHasSubmitted(true);
                }}
                handleContinue={handleContinue}
                hasSubmitted={hasSubmitted}
                isCorrect={isCorrect}
                lastUserAnswer={lastUserAnswer}
                wordCache={wordCache}
                setWordCache={setWordCache}
                onPlayAudio={playQuestionAudio}
            />
        );
    };

    return (
        <div className="website-page">
            <Header />
            <div className="content-viewport">{renderContent()}</div>
        </div>
    );
}