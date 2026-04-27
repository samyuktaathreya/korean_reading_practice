import { BrowserRouter, Routes, Route } from "react-router-dom"
import Input from "./pages/Input"
import Story from "./pages/Story"
import InteractiveTextbook from "./pages/InteractiveTextbook"
import ListeningPractice from "./pages/ListeningPractice"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Input />} />
        <Route path="/story" element={<Story />} />
        <Route path="/interactive-textbook" element={<InteractiveTextbook />} />
        <Route path="/listening-practice" element={<ListeningPractice />} />
        <Route path="*" element={<div>I am lost! Current path: {window.location.pathname}</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
