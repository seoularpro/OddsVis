import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ThemeToggleDropdown from './ThemeToggleDropdown';

const GoogleSheetStyled = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const sheetId = '1768uTvRzSMq_NuW31qf0H7bItSjTRYcEw9KiaPf1qR0';
            const apiKey = 'AIzaSyCyFhvdHUpx1C0V7B746SB7807SAIuKdu4';
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
