import { useEffect, useRef, useState } from 'react';
import Header from '../Components/Header';
import * as Hangul from 'hangul-js'; // Import the library

const USER_ID = 1;

const clean = (str) => {
    return str
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")  // add ? here
        .replace(/[。、！？「」『』【】]/g, "")            // Korean/CJK punctuation
        .replace(/\bim\b/g, "i am")
        .replace(/\byoure\b/g, "you are")
        .replace(/\bhes\b/g, "he is")
        .replace(/\bshes\b/g, "she is")
        .replace(/\ba\b|\ban\b|\bthe\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

const levelToInstruction = (level) => {
    if (level === "easy")   return "Insert grammar particle:";
    if (level === "medium") return "Translate to English:";
    if (level === "hard")   return "Translate to Korean:";
    return "Answer the question:";
};

const isQuestionInKorean = (text) => {
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    console.log("question text : ", text);
    return koreanRegex.test(text);
};

// Word-level diff: returns segments of {text, underline} so we can
// underline the parts of the correct answer that differed from user's input.
function diffSegments(correct, userAns) {
    // If correct is missing, we can't diff
    if (!correct) return [];
    
    const correctWords = correct.split(" ");
    // If userAns is null/undefined/empty (skip), treat as empty array
    const userWords = (userAns || "").trim().split(" ");
    
    return correctWords.map((word, i) => ({
        text: word,
        underline: clean(word) !== clean(userWords[i] ?? ""),
    }));
}

// ── WordWithTooltip ──────────────────────────────────────────────────

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
                    {/* Shows romanized spelling for names like 마크 → "Mark" */}
                    {info.romanization && (
                        <span className="word-tooltip-romanization"> ({info.romanization})</span>
                    )}
                    <p>Click to hear</p>
                </span>
            )}
        </span>
    );
}

// ── SmartInput ───────────────────────────────────────────────────────
// Signals to the OS/browser which keyboard is needed, so the user
// doesn't have to switch manually between Korean and English.

// Standard Korean QWERTY keyboard layout map
const QWERTY_TO_HANGUL = {
  'r':'ㄱ','R':'ㄲ','s':'ㄴ','e':'ㄷ','E':'ㄸ','f':'ㄹ','a':'ㅁ','q':'ㅂ','Q':'ㅃ',
  't':'ㅅ','T':'ㅆ','d':'ㅇ','w':'ㅈ','W':'ㅉ','c':'ㅊ','z':'ㅋ','x':'ㅌ','v':'ㅍ','g':'ㅎ',
  'k':'ㅏ','o':'ㅐ','i':'ㅑ','O':'ㅒ','j':'ㅓ','p':'ㅔ','u':'ㅕ','P':'ㅖ','h':'ㅗ','y':'ㅛ',
  'n':'ㅜ','b':'ㅠ','m':'ㅡ','l':'ㅣ','K':'ㅘ','H':'ㅙ','Y':'ㅚ','J':'ㅝ','N':'ㅞ','B':'ㅟ','M':'ㅢ',
  ' ': ' ', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '0': '0'
};

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
            }
            // ignore keys with no Korean mapping (numbers, symbols, etc.)
            else {
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

// ── DiffAnswer ───────────────────────────────────────────────────────

function DiffAnswer({ correctAnswer, userAnswer }) {
    // First: Calculate the segments
    const segments = diffSegments(correctAnswer, userAnswer);
    
    // Second: Now you can safely check if segments exists or has length
    if (!segments || segments.length === 0) {
        return <p className="diff-answer">{correctAnswer}</p>;
    }

    return (
        <p className="diff-answer">
            {segments.map((seg, i) => (
                <span key={i}>
                    {seg.underline
                        ? <span className="diff-answer__underline" style={{ textDecoration: 'underline', color: '#ff4b4b' }}>{seg.text}</span>
                        : seg.text}
                    {i < segments.length - 1 ? " " : ""}
                </span>
            ))}
        </p>
    );
}

// ── Question ─────────────────────────────────────────────────────────

function Question({
    currentQuestionObj, currentIndex, totalQuestions, userAnswer,
    setUserAnswer, handleSubmit, handleSkip, handleContinue,
    wordCache, setWordCache, hasSubmitted, isCorrect, lastUserAnswer,
    onPlayAudio,
}) {
    const words = currentQuestionObj.question.split(" ");
    const questionIsKorean = isQuestionInKorean(currentQuestionObj.question);
    const answerNeedsKorean = !questionIsKorean || currentQuestionObj.question_type === "fill in the blank";
    console.log("answer needs korean : ", answerNeedsKorean);
    const isGrammarParticleQuestion = currentQuestionObj.question.includes("___");

    return (
        <div className="question-page">
            {currentQuestionObj.was_wrong && (
                <p className="repeat-indicator">⚠️ Previously answered wrong</p>
            )}

            <p className="question-counter">Question {currentIndex + 1} of {totalQuestions}</p>
            <h2 className="question-instruction">{levelToInstruction(currentQuestionObj.level)}</h2>

            <div className="question-text">
                <h1 className="question-h1">
                    {questionIsKorean
                        ? words.map((w, i) => (
                            <WordWithTooltip key={i} word={w} wordCache={wordCache} setWordCache={setWordCache} />
                          ))
                        : currentQuestionObj.question
                    }
                </h1>
                {questionIsKorean && 
                    !isGrammarParticleQuestion && (
                    <button className="audio-btn" onClick={onPlayAudio}>
                        🔈 Play Audio
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="answer-form">
                <SmartInput
                    value={userAnswer}
                    onChange={setUserAnswer}
                    disabled={hasSubmitted}
                    isCorrect={isCorrect}
                    hasSubmitted={hasSubmitted}
                    needsKorean={answerNeedsKorean}
                />

                {!hasSubmitted && (
                    <div className="answer-actions">
                        <button type="submit" className="btn btn--check">CHECK</button>
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

// ── Main Component ───────────────────────────────────────────────────

export default function DuolingoStyleQuestions() {
    const [questions, setQuestions]           = useState([]);
    const [currentIndex, setCurrentIndex]     = useState(0);
    const [userAnswer, setUserAnswer]         = useState("");
    const [lastUserAnswer, setLastUserAnswer] = useState("");
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isLoading, setIsLoading]           = useState(false);
    const [score, setScore]                   = useState(0);
    const [answerLog, setAnswerLog]           = useState([]);
    const [wordCache, setWordCache]           = useState({});
    const [isUnitTest, setIsUnitTest]         = useState(false);
    const [hasSubmitted, setHasSubmitted]     = useState(false);
    const [isCorrect, setIsCorrect]           = useState(false);

    const currentQuestionObj = questions[currentIndex] ?? null;

    // Auto-play audio whenever a Korean question appears
    useEffect(() => {
        if (!currentQuestionObj) return;
        if (!isQuestionInKorean(currentQuestionObj.question)) return;
        const isGrammarParticleQuestion = currentQuestionObj.question.includes("___");
        if (isGrammarParticleQuestion) return;

        let cancelled = false;
        (async () => {
            try {
                const resp = await fetch('/api/audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: currentQuestionObj.question })
                });
                if (cancelled) return;
                new Audio(URL.createObjectURL(await resp.blob())).play();
            } catch (e) { console.error(e); }
        })();

        return () => { cancelled = true; };
    }, [currentIndex, questions]);

    const playQuestionAudio = async () => {
        if (!currentQuestionObj) return;
        try {
            const resp = await fetch('/api/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: currentQuestionObj.question })
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
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!currentQuestionObj || hasSubmitted) return;
        const correct = clean(userAnswer) === clean(currentQuestionObj.answer);
        setLastUserAnswer(userAnswer);
        setIsCorrect(correct);
        setHasSubmitted(true);
        if (correct && !currentQuestionObj.was_wrong) setScore(s => s + 1);
    };

    const handleContinue = () => {
        if (!isUnitTest && !isCorrect) {
            setQuestions(prev => [...prev, { ...currentQuestionObj, was_wrong: true }]);
        }
        setAnswerLog(prev => [...prev, { question_data: currentQuestionObj, is_correct: isCorrect }]);
        setCurrentIndex(i => i + 1);
        setUserAnswer("");
        setLastUserAnswer("");
        setHasSubmitted(false);
        setIsCorrect(false);
    };

    const renderContent = () => {
        if (!isSessionStarted) return (
            <div className="start-screen">
                <button onClick={startSession} className="btn btn--start">Start Session</button>
            </div>
        );

        if (isLoading || questions.length === 0) return (
            <div className="loading-screen">Loading...</div>
        );

        if (currentIndex >= questions.length) return (
            <div className="complete-screen">
                <h1>Session Complete!</h1>
                <p>Final Accuracy: {score} / {questions.filter(q => !q.was_wrong).length}</p>
                <button className="btn btn--start" onClick={() => setIsSessionStarted(false)}>
                    Back to Menu
                </button>
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
                handleSkip={() => { setLastUserAnswer(userAnswer); setIsCorrect(false); setHasSubmitted(true); }}
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
            {renderContent()}
        </div>
    );
}