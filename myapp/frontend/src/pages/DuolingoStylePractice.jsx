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

function Question({
    currentQuestionObj, currentIndex, totalQuestions, userAnswer,
    setUserAnswer, handleSubmit, handleSkip, handleContinue,
    wordCache, setWordCache, hasSubmitted, isCorrect, lastUserAnswer,
    onPlayAudio,
}) {
    const words = currentQuestionObj.question.split(" ");
    const questionIsKorean = isQuestionInKorean(currentQuestionObj.question);
    const answerNeedsKorean = !questionIsKorean || currentQuestionObj.question_type === "fill in the blank";
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
                {questionIsKorean && !isGrammarParticleQuestion && (
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

// ── ProgressDashboard Component (With Histogram Chart) ──
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

    // Define 5 clean bucket ranges for strength
    const buckets = [
        { label: "0-20%", min: 0.0, max: 0.2, key: "b1", statusClass: "chart-bar--weak" },
        { label: "21-40%", min: 0.2, max: 0.4, key: "b2", statusClass: "chart-bar--weak" },
        { label: "41-60%", min: 0.4, max: 0.6, key: "b3", statusClass: "chart-bar--weak" },
        { label: "61-80%", min: 0.6, max: 0.8, key: "b4", statusClass: "chart-bar--cooling" },
        { label: "81-100%", min: 0.8, max: 1.01, key: "b5", statusClass: "chart-bar--stable" }
    ];

    // Distribute tags across buckets
    const bucketData = buckets.map(b => {
        const tagsInBucket = knowledge_grid.filter(item => item.strength >= b.min && item.strength < b.max);
        return { ...b, tags: tagsInBucket, count: tagsInBucket.length };
    });

    // Determine max count to compute relative heights scaling up to 100%
    const maxCount = Math.max(...bucketData.map(b => b.count), 1);

    const activeBucketInfo = bucketData.find(b => b.key === selectedBucket);

    return (
        <div className="dashboard-container">
            <div className="unit-badge">
                📍 Current Unit: {current_unit}
            </div>

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

            {/* Histogram Layout Structure */}
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
                                    <div 
                                        className={`chart-bar-fill ${b.statusClass}`} 
                                        style={{ height: `${barHeightPercent}%` }}
                                    />
                                </div>
                                <div className="chart-axis-label">{b.label}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Conditional Inspection List Block */}
                {activeBucketInfo && (
                    <div className="inspection-panel">
                        <h5 className="inspection-title">
                            Tags at {activeBucketInfo.label} Strength ({activeBucketInfo.count})
                        </h5>
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
                <button 
                    onClick={onStartSession} 
                    disabled={isLoading}
                    className="btn btn--start full-width-btn"
                >
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
    const [hasSubmitted, setHasSubmitted]     = useState(false);
    const [isCorrect, setIsCorrect]               = useState(false);
    const [progressData, setProgressData]         = useState(null);

    useEffect(() => {
        if (!isSessionStarted) {
            fetchProgress();
        }
    }, [isSessionStarted]);

    const fetchProgress = async () => {
        try {
            const response = await fetch(`/api/user_progress/${USER_ID}`);
            const data = await response.json();
            setProgressData(data);
        } catch (e) {
            console.error("Error pulling progress summary:", e);
        }
    };

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

    const currentQuestionObj = questions[currentIndex] ?? null;

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
                        is_unit_test: isUnitTest
                    })
                });
            } catch (error) {
                console.error("Failed to submit session results", error);
            }
        }

        setCurrentIndex(nextIndex);
        setUserAnswer("");
        setLastUserAnswer("");
        setHasSubmitted(false);
        setIsCorrect(false);
    };

    const renderContent = () => {
        if (!isSessionStarted) return (
            <ProgressDashboard 
                progressData={progressData} 
                onStartSession={startSession} 
                isLoading={isLoading} 
            />
        );

        if (isLoading && questions.length === 0) return (
            <div className="loading-screen">Loading Session Setup...</div>
        );

        if (currentIndex >= questions.length) return (
            <div className="complete-screen">
                <h1>🎉 Session Complete!</h1>
                <p>Final Accuracy: {score} / {questions.filter(q => !q.was_wrong).length}</p>
                <button className="btn btn--start" onClick={() => setIsSessionStarted(false)}>
                    Return to Dashboard
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
            <div className="content-viewport">
                {renderContent()}
            </div>
        </div>
    );
}