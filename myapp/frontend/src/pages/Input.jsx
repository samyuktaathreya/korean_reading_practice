import { useEffect, useState } from 'react'
import { useNavigate } from "react-router-dom"
import '../App.css'

function Input() {
  const [data, setData] = useState("")
  const navigate = useNavigate()

  return (
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
  )
}

export default Input