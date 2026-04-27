import { useState } from 'react';

function Header() {
  const [count, setCount] = useState(0);

  return (
    <div className="header-container">
        <button onClick={() => navigate("/")}>
            Home
        </button>

        <button onClick={() => navigate("/story")}>
            Custom Story
        </button>

        <button onClick={() => navigate("/interactive-textbook")}>
            Interactive Textbook
        </button>
    </div>
  );
}

export default Header;