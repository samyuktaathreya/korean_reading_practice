import { useEffect, useState } from 'react';
import Header from '../Components/Header';

const USER_ID = 1; // PLACEHOLDER
const NUM_QUESTIONS = 10;

const clean = (str) => {
    return str
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
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

export default function DuolingoStyleQuestions() {
    const [questions, setQuestions] = useState([]);       // flat array from API
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState("");
    const [isWrong, setIsWrong] = useState(false);
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [score, setScore] = useState(0);
    // Track correctness per question for submit_session
    const [answerLog, setAnswerLog] = useState([]); // [{ question_data, is_correct }]
    const [sessionType, setSessionType] = useState("practice_session");

    // Derived current question from flat list
    const currentQuestionObj = questions[currentIndex] ?? null;

    const startSession = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/generate_session/${USER_ID}`);
            const data = await response.json();
            // Backend returns { user_id, session_type, question_set: [...] }
            setQuestions(data.question_set);
            setSessionType(data.session_type);
            setCurrentIndex(0);
            setScore(0);
            setAnswerLog([]);
            setUserAnswer("");
            setIsWrong(false);
            setIsSessionStarted(true);
        } catch (error) {
            console.error("Failed to load questions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const submitSession = async (finalAnswerLog) => {
        try {
            await fetch(`/api/practice/submit_session/${USER_ID}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    list_of_question_data: finalAnswerLog.map(e => e.question_data),
                    is_correct: finalAnswerLog.map(e => e.is_correct),
                    is_unit_test: sessionType === "unit_test",
                }),
            });
        } catch (error) {
            console.error("Failed to submit session", error);
        }
    };

    const handleNewQuestion = (wasCorrect) => {
        const log = [
            ...answerLog,
            { question_data: currentQuestionObj, is_correct: wasCorrect }
        ];
        setAnswerLog(log);
        if (wasCorrect) setScore(s => s + 1);

        const nextIndex = currentIndex + 1;
        if (nextIndex >= questions.length) {
            // Session complete — submit results
            submitSession(log);
        }
        setCurrentIndex(nextIndex);
        setUserAnswer("");
        setIsWrong(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!currentQuestionObj) return;

        if (clean(userAnswer) === clean(currentQuestionObj.answer)) {
            handleNewQuestion(true);
        } else {
            setIsWrong(true);
        }
    };

    const handleSkip = () => {
        handleNewQuestion(false);
    };

    // ── Sub-components ──────────────────────────────────────────────

    function Menu() {
        return (
            <div>
                <button onClick={startSession}>
                    Start Session
                </button>
            </div>
        );
    }

    function LoadingSpinner() {
        return <div>Loading questions...</div>;
    }

    function Question() {
        return (
            <div>
                <p>Question {currentIndex + 1} of {questions.length}</p>
                <h1>{levelToInstruction(currentQuestionObj.level)}</h1>
                <h1>{currentQuestionObj.question}</h1>

                <form onSubmit={handleSubmit}>
                    <input
                        value={userAnswer}
                        onChange={(e) => {
                            setUserAnswer(e.target.value);
                            setIsWrong(false);
                        }}
                        autoFocus
                    />
                    <button type="submit">Submit</button>
                </form>

                {isWrong && (
                    <h3 style={{ color: "red" }}>
                        Wrong answer! Try again.
                    </h3>
                )}

                <button type="button" onClick={handleSkip}>
                    Skip
                </button>
            </div>
        );
    }

    function Results() {
        return (
            <div>
                <h1>Session Complete!</h1>
                <h2>Score: {score} / {questions.length}</h2>
                <p>
                    {sessionType === "unit_test"
                        ? "Unit test results submitted."
                        : "Practice session results saved."}
                </p>
                <button onClick={() => {
                    setIsSessionStarted(false);
                    setQuestions([]);
                }}>
                    Back to Menu
                </button>
            </div>
        );
    }

    // ── Render ──────────────────────────────────────────────────────

    const renderContent = () => {
        if (!isSessionStarted)                      return <Menu />;
        if (isLoading || questions.length === 0)    return <LoadingSpinner />;
        if (currentIndex >= questions.length)       return <Results />;
        return <Question />;
    };

    return (
        <div className="website-page">
            <Header />
            {renderContent()}
        </div>
    );
}
