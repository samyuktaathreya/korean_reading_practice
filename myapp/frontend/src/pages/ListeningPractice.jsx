import React, { useState, useEffect } from 'react';
import Header from '../Components/Header'

// Data pools for the randomizer. 
const KOREAN_DATA = {
  syllable: {
    consonant: [
    '가','까','나','다','따','라','마','바','빠',
    '사','싸','아','자','짜','차','카','타','파','하'
    ],
    hard: [
    '가','개','갸','거','게','겨','고','과','괘','괴','교','구','궈','궤','귀','규','그','긔','기',
    '까','깨','꺄','꺼','께','껴','꼬','꽈','꽤','꾀','꾜','꾸','꿔','꿰','뀌','뀨','끄','끼',
    '카','캐','캬','커','케','켜','코','콰','쾌','쾨','쿄','쿠','쿼','퀘','퀴','큐','크','키', '표',

    '다','대','댜','더','데','뎌','도','돠','돼','되','됴','두','둬','뒈','뒤','듀','드','디',
    '따','때','땨','떠','떼','뗘','또','똬','뙈','뙤','뚀','뚜','뚸','뛔','뛰','뜌','뜨','띠',
    '타','태','탸','터','테','텨','토','톼','퇘','퇴','툐','투','퉈','퉤','튀','튜','트','티',

    '바','배','뱌','버','베','벼','보','봐','봬','뵈','뵤','부','붜','붸','뷔','뷰','브','비',
    '빠','빼','뺘','뻐','뻬','뼈','뽀','뽜','뽸','뾰','뿌','뿨','쀼','쁘','삐',
    '파','패','퍄','퍼','페','펴','포','퐈','퐤','푀','표','푸','풔','풰','퓌','퓨','프','피',

    '사','새','샤','서','세','셔','소','솨','쇄','쇠','쇼','수','숴','쉐','쉬','슈','스','시',
    '싸','쌔','쌰','써','쎄','쎠','쏘','쏴','쐐','쐬','쑈','쑤','쒀','쒜','쒸','쓔','쓰','씨',

    '자','재','쟈','저','제','져','조','좌','좨','죄','죠','주','줘','줴','쥐','쥬','즈','지',
    '짜','째','쨔','쩌','쩨','쪄','쪼','쫘','쫴','쬐','쬬','쭈','쭤','쮜','쮸','쯔','찌',
    '차','채','챠','처','체','쳐','초','촤','쵀','최','쵸','추','춰','췌','취','츄','츠','치',

    '나','내','냐','너','네','녀','노','놔','놰','뇌','뇨','누','눠','눼','뉘','뉴','느','니',
    '라','래','랴','러','레','려','로','롸','뢔','뢰','료','루','뤄','뤠','뤼','류','르','리',
    '마','매','먀','머','메','며','모','뫄','뫼','묘','무','뭐','뭬','뮈','뮤','므','미',

    '아','애','야','어','에','여','오','와','왜','외','요','우','워','웨','위','유','으','이',
    '하','해','햐','허','헤','혀','호','화','홰','회','효','후','훠','훼','휘','휴','흐','히'
    ],
    any: [
      '가','나','다','라','마','바','사','아','자','차','카','타','파','하',
      '거','너','더','러','머','버','서','어','저','처','커','터','퍼','허',
      '고','노','도','로','모','보','소','오','조','초','코','토','포','호',
      '구','누','두','루','무','부','수','우','주','추','쿠','투','푸','후',
      '기','니','디','리','미','비','시','이','지','치','키','티','피','히',

      '강','남','동','서','중','국','인','민','한','일','대','정','전','후',
      '상','하','시','간','것','들','이','그','저','수','등','문','생','학',
      '자','기','위','외','내','고','도','에','서','로','와','과','면','요',
      '은','는','을','를','의','에서','까지','보다','보다도','처럼',

      '각','간','갈','감','갑','값','갓','갔','강','개','객','걔','거','건',
      '걸','검','겁','것','게','겨','격','견','결','경','계','고','곡','곤',
      '골','곰','곳','공','과','관','광','괜','괴','교','구','국','군','굴',
      '굳','궁','권','귀','규','균','그','극','근','글','금','급','긋','기',

      '긴','길','김','깁','깃','까','깐','깔','깜','깝','깡','깨','껌','껏',
      '껑','께','껴','꼬','꼭','꼴','꼼','꼽','꽂','꽃','꽉','꽤','꾸','꾼',
      '꿀','꿈','꿔','꿨','끄','끈','끌','끓','끔','끗','끝','끼','낀','낄',
      '낌','나','난','날','남','납','낫','났','낭','내','냄','냅','냇','냈',
      '냉','너','넉','넌','널','넘','넙','넛','넣','네','넥','넷','녀','녁',
      '년','념','녕','노','녹','논','놀','놈','농','높','놓','놔','뇌','누',

      '눈','눌','눕','눠','눴','느','늑','는','늘','늙','늠','능','늦','니',
      '닉','닌','닐','님','다','닥','단','달','닮','담','답','닷','당','대',
      '댁','댄','댈','댐','댑','댓','댔','더','덕','던','덜','덤','덥','덧',
      '덩','데','덴','델','뎀','뎅','도','독','돈','돌','돔','돕','돗','동',
      '돼','됐','되','된','될','됨','됩','두','둔','둘','둠','둡','둥','둬',

      '뒀','뒤','뒷','드','득','든','들','듬','듭','듯','등','디','딘','딜',
      '딤','딥','딩','따','딱','딴','딸','땀','땅','때','땐','땜','떠','떡',
      '떤','떨','떼','또','똑','똔','똘','뚜','뚝','뚫','뚱','뛰','뜨','뜬',
      '뜰','뜸','뜻','띄','라','락','란','랄','람','랍','랏','랑','래','랜',
      '램','랩','랫','랭','러','럭','런','럴','럼','럽','럿','렀','렁','레',

      '렉','렌','렐','렘','롭','롯','롱','뢰','료','루','룩','룬','룰','룸',
      '룹','룻','뤄','뤘','류','륙','륜','률','륭','르','른','를','름','릇',
      '릉','리','릭','린','릴','림','립','릿','링','마','막','만','말','맘',
      '맙','맛','망','매','맥','맨','맬','맴','맵','맷','맹','머','먹','먼',
      '멀','멈','멋','멍','메','멘','멜','멤','멧','며','면','멸','명','모',

      '목','몬','몰','몸','몹','못','몽','묘','무','묵','문','물','묻','묶',
      '묵','묻','묻','묻','묻','묻','묻','묻','묻','묻','묻','묻','묻','묻'
      ], 
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
  const [lastGuess, setLastGuess] = useState(''); 
  const [feedback, setFeedback] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  
  // NEW: State for tracking score
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Added safety wrapper to prevent KOREAN_DATA from throwing an error if state is mid-transition
  useEffect(() => {
    if (KOREAN_DATA[unit] && KOREAN_DATA[unit][difficulty]) {
      loadNewSound();
    }
  }, [unit, difficulty]);

  // Handle unit switching and provide a fallback if they had 'consonant' selected
  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    setUnit(newUnit);
    
    // NEW: Reset counters when unit changes
    setCorrectCount(0);
    setTotalCount(0);
    
    // If they switch away from syllable while consonant is selected, fallback to 'any'
    if (newUnit !== 'syllable' && difficulty === 'consonant') {
      setDifficulty('any');
    }
  };

  const loadNewSound = () => {
    if (!KOREAN_DATA[unit] || !KOREAN_DATA[unit][difficulty]) return;

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

    setLastGuess(guess); 
    
    // NEW: Increment the total attempts counter
    setTotalCount(prev => prev + 1);

    if (guess === currentText) {
      // NEW: Increment correct guesses
      setCorrectCount(prev => prev + 1);
      
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
      <Header />
      
      {/* NEW: Score Display next to the Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Korean Listening Practice</h2>
        <div style={{ background: '#e0e0e0', padding: '5px 12px', borderRadius: '15px', fontWeight: 'bold' }}>
          Score: {correctCount} / {totalCount}
        </div>
      </div>

      {/* --- TOGGLES --- */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div>
          <strong>Unit:</strong>
          <label style={{ display: 'block' }}>
            <input type="radio" value="syllable" checked={unit === 'syllable'} onChange={handleUnitChange} /> Syllable
          </label>
          <label style={{ display: 'block' }}>
            <input type="radio" value="word" checked={unit === 'word'} onChange={handleUnitChange} /> Word
          </label>
          <label style={{ display: 'block' }}>
            <input type="radio" value="sentence" checked={unit === 'sentence'} onChange={handleUnitChange} /> Sentence
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
          {/* New Consonant Toggle */}
          <label style={{ display: 'block', color: unit !== 'syllable' ? '#aaa' : '#000' }}>
            <input 
              type="radio" 
              value="consonant" 
              checked={difficulty === 'consonant'} 
              onChange={(e) => setDifficulty(e.target.value)} 
              disabled={unit !== 'syllable'} 
            /> 
            Consonants (Syllables only)
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