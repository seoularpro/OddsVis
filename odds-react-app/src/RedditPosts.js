import Week1123 from "./PostArchive/Week1123";
import Week1223 from "./PostArchive/Week1223";
import Week124 from "./PostArchive/Week124";
import Week1323 from "./PostArchive/Week1323";
import Week1423 from "./PostArchive/Week1423";
import Week1523 from "./PostArchive/Week1523";
import Week1623 from "./PostArchive/Week1623";
import Week1723 from "./PostArchive/Week1723";
import Week224 from "./PostArchive/Week224";
import Week324 from "./PostArchive/Week324";
import Week424 from "./PostArchive/Week424";
import Week524 from "./PostArchive/Week524";
import Week624 from "./PostArchive/Week624";
import Week724 from "./PostArchive/Week724";
import React, { useState, useEffect } from "react";
import ThemeToggleDropdown from "./ThemeToggleDropdown";
import { BrowserRouter as Router, Route, Routes, useParams, useNavigate } from 'react-router-dom';
import Week824 from "./PostArchive/Week824";
import Week924 from "./PostArchive/Week924";


export default function RedditPosts(props) {
    document.title = "Reddit Posts"
    const [postIndex, setPostIndex] = useState(0);
    const params = useParams();
    const navigate = useNavigate();
    const postIndices = [
        '924', '824', '724', '624', '524', '424', '324', '224', '124', '1723', '1623', '1523', '1423', '1323', '1223', '1123'
    ]
    const WeeklyPostComponents = {
        Week924, Week824, Week724, Week624, Week524, Week424, Week324, Week224, Week124, Week1723, Week1623, Week1523,
        Week1423, Week1323, Week1223, Week1123

    }
    const movePastWeek = () => {

        const { week } = params;
        let tempSt = week.slice(4);
        let tempIndex = postIndices.findIndex((elem) => elem == tempSt);

        navigate(`/redditPosts/Week${postIndices[tempIndex + 1]}`);
    }
    const moveNextWeek = () => {
        const { week } = params;
        let tempSt = week.slice(4);
        let tempIndex = postIndices.findIndex((elem) => elem == tempSt);

        navigate(`/redditPosts/Week${postIndices[tempIndex - 1]}`);
    }

    const DynamicComponent = () => {
        const { week } = useParams();
        const Component = WeeklyPostComponents[`${week}`]; // dynamically choose the component

        return Component ? <Component movePastWeek={movePastWeek} moveNextWeek={moveNextWeek} /> : <div>Not found</div>;
    };

    
    // useEffect(() => document.title = "Reddit Posts" , [])

    return (
        <div>
            <div className="trade-value-theme">
                <ThemeToggleDropdown />
            </div>
            <DynamicComponent />
        </div>
    );
}
