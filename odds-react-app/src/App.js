import GoogleSheetEmbed from "./GoogleSheetEmbed";
import "./styles.css";
import TotalContainer from './TotalContainer'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RedditPosts from "./RedditPosts";
// import Navbar from "./Navbar";

export default function App() {
  return (
    <div className="App">
      <Router>
        {/* <Navbar/> */}
        <Routes>
          <Route path="/" element={
            <TotalContainer />}
          />
          <Route path="/tradeValues" element={<GoogleSheetEmbed />} />
          <Route path="/redditPosts" element={<RedditPosts/>} />
        </Routes>
      </Router>
    </div>
  );
}
