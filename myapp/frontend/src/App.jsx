import { BrowserRouter, Routes, Route } from "react-router-dom"
import Input from "./pages/Input"
import Story from "./pages/Story"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Input />} />
        <Route path="/story" element={<Story />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App