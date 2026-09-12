
function getWeekNumber() {
    // Tuesday before the first Thursday game: a week runs Tue-Mon so
    // the Sat/Sun/Mon snapshots of a slate stay with that slate.
    const startDate = new Date("2026-09-08");
    const currentDate = new Date();
    const diffTime = currentDate - startDate;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    const weekNumber = Math.min(Math.max(diffWeeks + 1, 1), 18);
    return weekNumber;
}
console.log(getWeekNumber());

