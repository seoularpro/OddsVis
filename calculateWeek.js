
function getWeekNumber() {
    const startDate = new Date("2024-09-03");
    const currentDate = new Date();
    const diffTime = currentDate - startDate;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const weekNumber = Math.min(Math.max(diffWeeks + 1, 1), 18);
    return weekNumber;
}
console.log(getWeekNumber());

