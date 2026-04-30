import { useEffect, useState } from 'react'
import { useNavigate } from "react-router-dom"
import Header from '../Components/Header'
import '../App.css'

function Input() {
  const [data, setData] = useState("")
  const navigate = useNavigate()

  return (
    <div>
      <Header />
      <div className="input-page-container">

          <textarea
          className="input-text-box"
          value={data}
          onChange={(e) => setData(e.target.value)}
          />

          <button 
              className="input-submit-btn"
              onClick={() => navigate("/story", { state: { text: data } })}
          >
              Go!
          </button>
      </div>
    </div>
  )
}

export default Input