
import { useEffect, useState } from 'react';

const questions = 'DuolingoStyleQuestions.json';

// frontend: 
// parses JSON to get questions to ask 
// checks input in textbox for answer
const randInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const clean = (str) => str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();

// completely random questions for now
// returns question, category, and level
const getRandomQuestion = (questions, currentQuestion) => {
    if (!questions || questions.length === 0) {
        return "Loading question..."
    }

    var randomQuestion = currentQuestion;
    var randomLevel;
    var randomCategory;
    var randomAnswer;
    
    while (randomQuestion === currentQuestion) {
        randomCategory = questions[randInt(0, questions.length - 1)];

        const levels = randomCategory.levels;

        randomLevel = levels[randInt(0, levels.length - 1)]

        const questionsWithinLevel = randomLevel.questions;

        var randomQuestionObject = questionsWithinLevel[randInt(0, questionsWithinLevel.length - 1)];
        randomQuestion = randomQuestionObject.question;
        randomAnswer = randomQuestionObject.answer;
    }

    return {
        "question": randomQuestion,
        "level": randomLevel.difficulty,
        "category": randomCategory.category,
        "answer": randomAnswer
    };
};

export default function DuolingoStyleQuestions() {

    // get questions json from public folder on mount
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState("");
    const [currentLevel, setCurrentLevel] = useState("");
    const [userAnswer, setUserAnswer] = useState("");
    const [correctAnswer, setCorrectAnswer] = useState("");
    const [isWrong, setIsWrong] = useState(false);

    useEffect(() => {
        fetch('./DuolingoStyleQuestions.json')
        .then((response) => response.json())
        .then((questions) => {
            setQuestions(questions);
            if (questions.length > 0) {
                const randomQuestionObject = getRandomQuestion(questions);
                setCurrentQuestion(randomQuestionObject.question);
                setCurrentLevel(randomQuestionObject.level);
                setCorrectAnswer(randomQuestionObject.answer);
                console.log("question object : ", randomQuestionObject);
            }
        })
        .catch((error) => console.error("Error loading JSON: ", error));
    }, []);

    // generate new question
    const handleNewQuestion = () => {
        const newQuestionObject = getRandomQuestion(questions, currentQuestion);
        const newQuestion = newQuestionObject.question;
        const newLevel = newQuestionObject.level;
        const newAnswer = newQuestionObject.answer;

        setCurrentQuestion(newQuestion);
        setCurrentLevel(newLevel);
        setCorrectAnswer(newAnswer);

        console.log("question object : ", newQuestionObject);
        setUserAnswer("");
        setIsWrong(false);
    }

    const levelToInstruction = (level) => {
        if (level === "easy") {
            return "Insert grammar particle:";
        }
        
        if (level === "medium") {
            return "Translate to English";
        }

        if (level === "hard") {
            return "Translate to Korean";
        }
    }

    const handleSubmit = () => {
        if (clean(userAnswer) === clean(correctAnswer)) {
            handleNewQuestion();
        }
        else {
            setIsWrong(true);
        }
    }

    return (
        <div className="website-page">
            <h1>{levelToInstruction(currentLevel)}</h1>
            <h1>{currentQuestion}</h1>

            <input 
                value={userAnswer}
                onChange={(e) => {
                    setUserAnswer(e.target.value)
                    setIsWrong(false)
                }}
            />

            <button onClick={handleSubmit}>
                Submit
            </button>

            {isWrong && <h1 style={{ color: 'red' }}>Wrong Answer! Try again.</h1>}
        </div>
    );
}