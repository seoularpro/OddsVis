import GoogleSheetEmbed from "./GoogleSheetEmbed";
import "./styles.css";
import TotalContainer from './TotalContainer'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

export default function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={
            <TotalContainer />}
          />
          <Route path="/tradeValues" element={<GoogleSheetEmbed />} />
        </Routes>
      </Router>
    </div>
  );
}
