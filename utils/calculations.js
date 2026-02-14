const getSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 3600 + m * 60 + s;
};

const formatTime = (totalSeconds, showSeconds = false) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (showSeconds) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const calculateTotalSeconds = (startTime, pigeonTimes, scoringCount = 0) => {
    const effectiveStartTime = startTime || '06:00';
    const startSeconds = getSeconds(effectiveStartTime);
    let totalSeconds = 0;

    const enteredTimes = (pigeonTimes || []).filter(t => t && t !== '');
    const k = enteredTimes.length;
    const skip = Math.max(0, k - scoringCount);
    const scoringEntries = enteredTimes.slice(skip);

    scoringEntries.forEach((time) => {
      let landSeconds = getSeconds(time);
      if (landSeconds < startSeconds) {
        landSeconds += 24 * 3600;
      }
      const diff = landSeconds - startSeconds;
      if (diff > 0) totalSeconds += diff;
    });

    return totalSeconds;
};

const calculateGrandTotal = (pigeonTimes, pigeonsPerDay, startTime, numDays, scoringPigeons) => {
    let totalSeconds = 0;
    for (let d = 0; d < numDays; d++) {
      const dayTimes = (pigeonTimes || []).slice(d * pigeonsPerDay, (d + 1) * pigeonsPerDay);
      totalSeconds += calculateTotalSeconds(startTime, dayTimes, scoringPigeons);
    }
    return formatTime(totalSeconds, false);
};

const calculateWinners = (participants, startTime, dateIndex = null, pigeonsPerDay = 0) => {
    let latestFirstElapsed = -1;
    let firstWinnerName = "";
    let latestLastElapsed = -1;
    let lastWinnerName = "";

    const startSeconds = getSeconds(startTime || '06:00');

    (participants || []).forEach(p => {
      let relevantTimes = [];
      if (dateIndex !== null && dateIndex !== 'total') {
        relevantTimes = (p.pigeonTimes || []).slice(dateIndex * pigeonsPerDay, (dateIndex + 1) * pigeonsPerDay).filter(t => t && t !== '');
      } else {
        relevantTimes = (p.pigeonTimes || []).filter(t => t && t !== '');
      }
      
      if (relevantTimes.length > 0) {
        let firstLandSeconds = getSeconds(relevantTimes[0]);
        if (firstLandSeconds < startSeconds) firstLandSeconds += 24 * 3600;
        const firstElapsed = firstLandSeconds - startSeconds;
        
        if (firstElapsed > latestFirstElapsed) {
          latestFirstElapsed = firstElapsed;
          firstWinnerName = p.name;
        }

        let lastLandSeconds = getSeconds(relevantTimes[relevantTimes.length - 1]);
        if (lastLandSeconds < startSeconds) lastLandSeconds += 24 * 3600;
        const lastElapsed = lastLandSeconds - startSeconds;

        if (lastElapsed > latestLastElapsed) {
          latestLastElapsed = lastElapsed;
          lastWinnerName = p.name;
        }
      }
    });

    return { 
      firstWinner: firstWinnerName, 
      firstTime: latestFirstElapsed >= 0 ? formatTime(latestFirstElapsed) : "",
      lastWinner: lastWinnerName,
      lastTime: latestLastElapsed >= 0 ? formatTime(latestLastElapsed) : ""
    };
};

module.exports = {
  calculateGrandTotal,
  calculateWinners
};
