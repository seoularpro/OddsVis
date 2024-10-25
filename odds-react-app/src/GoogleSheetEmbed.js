import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ThemeToggleDropdown from './ThemeToggleDropdown';

const GoogleSheetStyled = () => {
    document.title = "Trade Values"
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const sheetId = '1768uTvRzSMq_NuW31qf0H7bItSjTRYcEw9KiaPf1qR0';
            const apiKey = process.env.REACT_APP_SHEETS_API_KEY;
            const range = 'Sheet1!A1:F113';

            const response = await axios.get(
                `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?ranges=${range}&includeGridData=true&key=${apiKey}`
            );

            // Extract grid data (values + formatting) from the response
            const sheetData = response.data.sheets[0].data[0].rowData;
            setData(sheetData);
        };

        fetchData();
    }, []);

    // Function to extract background color and apply styling
    const getCellStyle = (cell) => {
        const { backgroundColor, textFormat } = cell.effectiveFormat || {};
        const isWhiteBackground = backgroundColor &&
            backgroundColor.red === 1 &&
            backgroundColor.green === 1 &&
            backgroundColor.blue === 1;

        // Apply transparent background if the color is white, otherwise use the provided background color
        const bgColor = backgroundColor && !isWhiteBackground
            ? `rgba(${backgroundColor.red * 255 || 0}, ${backgroundColor.green * 255 || 0}, ${backgroundColor.blue * 255 || 0}, ${backgroundColor.alpha || 1})`
            : 'transparent'; // Default to transparent if the background is white or undefined


        const fontStyle = textFormat ? textFormat.fontFamily : 'inherit'; // Default font
        const fontSize = textFormat ? `${textFormat.fontSize}px` : 'inherit'; // Default size
        const fontWeight = textFormat?.bold ? 'bold' : 'inherit'; // Default size

        return {
            backgroundColor: bgColor,
            fontFamily: fontStyle,
            fontSize: fontSize,
            fontWeight: fontWeight,
            height: "17px"
        };
    };

    return (
        <div>
            <h2 style={{ textAlign: "left", fontSize: "12px", marginLeft: "15px", marginTop: "10px" }}>
                Values are based on a $200 auction draft budget so multiple trade values should add up to the value of a single player.
            </h2>
            <div className="trade-value-theme">
                <ThemeToggleDropdown />
            </div>
            <table>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.values ? row.values.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    style={getCellStyle(cell)}
                                >
                                    {cell.formattedValue || ''}
                                </td>
                            )) : <td> </td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default GoogleSheetStyled;
