import React, { useState, useEffect } from 'react';

// Data pools for the randomizer. 
const KOREAN_DATA = {
  syllable: {
    hard: ['어', '오', '아', '자', '짜', '차', '사', '싸', '과', '줘', '의', '이'],
    any: ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하']
  },
  word: {
    hard: ['커피', '코피', '소리', '꼬리', '바다', '빠르다', '사다', '싸다', '방', '빵'],
    any: ['학교', '사람', '친구', '가족', '오늘', '내일', '집', '물', '우유', '사과']
  },
  sentence: {
    hard: ['오징어와 어묵을 샀어요.', '진짜 짜장면을 찾았어요.', '쌀을 사서 삶았어요.'],
    any: ['안녕하세요.', '밥 먹었어요?', '날씨가 참 좋네요.', '어디에 가고 싶어요?']
  }
};

export default function ListeningPractice() {
  const [unit, setUnit] = useState('syllable');
  const [difficulty, setDifficulty] = useState('hard');
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [lastGuess, setLastGuess] = useState(''); // Tracks the exact guess they submitted
  const [feedback, setFeedback] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadNewSound();
  }, [unit, difficulty]);

  const loadNewSound = () => {
    const options = KOREAN_DATA[unit][difficulty];
    const randomIndex = Math.floor(Math.random() * options.length);
    const newText = options[randomIndex];
    
    setCurrentText(newText);
    setUserInput('');
    setLastGuess('');
    setFeedback(null);
    
    console.log(`[DEBUG] Current Answer: ${newText}`);
  };

  const playSound = async (textToPlay) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: typeof textToPlay === 'string' ? textToPlay : currentText })
      });

      if (!response.ok) throw new Error('Audio fetch failed');

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const guess = userInput.trim();
    if (!guess) return;

    setLastGuess(guess); // Save the guess so they can play it back

    if (guess === currentText) {
      setFeedback('correct');
      setTimeout(() => {
        loadNewSound();
      }, 1500);
    } else {
      setFeedback('incorrect');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Korean Listening Practice</h2>

      {/* --- TOGGLES --- */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div>
          <strong>Unit:</strong>
          <label style={{ display: 'block' }}>
            <input type="radio" value="syllable" checked={unit === 'syllable'} onChange={(e) => setUnit(e.target.value)} /> Syllable
          </label>
          <label style={{ display: 'block' }}>
            <input type="radio" value="word" checked={unit === 'word'} onChange={(e) => setUnit(e.target.value)} /> Word
          </label>
          <label style={{ display: 'block' }}>
            <input type="radio" value="sentence" checked={unit === 'sentence'} onChange={(e) => setUnit(e.target.value)} /> Sentence
          </label>
        </div>

        <div>
          <strong>Focus:</strong>
          <label style={{ display: 'block' }}>
            <input type="radio" value="hard" checked={difficulty === 'hard'} onChange={(e) => setDifficulty(e.target.value)} /> Hard Sounds
          </label>
          <label style={{ display: 'block' }}>
            <input type="radio" value="any" checked={difficulty === 'any'} onChange={(e) => setDifficulty(e.target.value)} /> Any Sound
          </label>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button 
          onClick={() => playSound()} 
          disabled={isLoading}
          style={{ padding: '10px', fontSize: '16px', cursor: 'pointer' }}
        >
          {isLoading ? 'Loading...' : '🔊 Play Target Sound'}
        </button>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type the Hangul here..."
            style={{ flex: 1, padding: '10px', fontSize: '16px' }}
          />
          <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>Check</button>
        </form>

        <button onClick={loadNewSound} style={{ padding: '8px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc' }}>
          Skip / Next Sound
        </button>
      </div>

      {/* --- FEEDBACK --- */}
      {feedback && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          textAlign: 'center',
          borderRadius: '4px',
          backgroundColor: feedback === 'correct' ? '#d4edda' : '#f8d7da',
          color: feedback === 'correct' ? '#155724' : '#721c24'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: feedback === 'incorrect' ? '10px' : '0' }}>
            {feedback === 'correct' ? '🎉 Correct!' : '❌ Not quite. Listen again!'}
          </div>
          
          {/* Compare Sounds Feature */}
          {feedback === 'incorrect' && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
               <button 
                 onClick={() => playSound(lastGuess)}
                 disabled={isLoading}
                 style={{ padding: '5px 10px', cursor: 'pointer', fontSize: '14px' }}
               >
                 🔊 Hear what you typed ({lastGuess})
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}