chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Function to get the current date in the format YYYY-MM-DD
function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Set up event listeners for sport and date selection
document.getElementById("sport-select").addEventListener("change", function () {
  const selectedSport = this.value;
  const selectedDate = document.getElementById("date-select").value;
  fetchData(selectedSport, selectedDate);
});

document.getElementById("date-select").addEventListener("change", function () {
  const selectedSport = document.getElementById("sport-select").value;
  const selectedDate = this.value;
  fetchData(selectedSport, selectedDate);
});

// Handle checkbox changes
document
  .getElementById("hide-finished")
  .addEventListener("change", function () {
    const selectedSport = document.getElementById("sport-select").value;
    const selectedDate = document.getElementById("date-select").value;
    fetchData(selectedSport, selectedDate);
  });

document
  .getElementById("hide-not-started")
  .addEventListener("change", function () {
    const selectedSport = document.getElementById("sport-select").value;
    const selectedDate = document.getElementById("date-select").value;
    fetchData(selectedSport, selectedDate);
  });

// Handle longnames checkbox changes and reload the extension
document.getElementById("longnames").addEventListener("change", function () {
  const selectedSport = document.getElementById("sport-select").value;
  const selectedDate = document.getElementById("date-select").value;
  fetchData(selectedSport, selectedDate); // Reload data with new names
});

async function fetchData(sport, date) {
  try {
    const response = await fetch(
      `https://api.sofascore.com/api/v1/sport/${sport}/scheduled-events/${date}`
    );
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    const scoresDiv = document.getElementById("scores");
    scoresDiv.innerHTML = "";

    const hideFinished = document.getElementById("hide-finished").checked;
    const hideNotStarted = document.getElementById("hide-not-started").checked;
    const longnames = document.getElementById("longnames").checked;

    // Get the current date
    const currentDate = new Date();

    // Adjust the time to UTC (GMT 0) since the API returns timestamps in EST (GMT -4)
    const currentDateString = currentDate
      .toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .split("/")
      .reverse()
      .join("-");

    // Filter out events from yesterday
    data.events = data.events.filter((event) => {
      const eventDate = new Date(event.startTimestamp * 1000); // Convert to milliseconds
      const eventDateString = eventDate
        .toLocaleDateString("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .split("/")
        .reverse()
        .join("-");

      // Check if the event is from today
      return eventDateString === currentDateString; // Only include today's events
    });

    // If no events are found, display a message
    if (data.events.length === 0) {
      const noEventsMessage = document.createElement("p");
      noEventsMessage.textContent = "No events are scheduled for today.";
      scoresDiv.appendChild(noEventsMessage);
      return; // Exit the function early
    }

    // Define the priority list for major leagues
    const majorLeagues = ["NBA", "MLB", "NHL", "NFL"];

    // Track the leagues displayed
    const displayedLeagues = new Set();

    // Sort events: Major leagues first
    data.events.sort((a, b) => {
      const leagueA = a.tournament.name;
      const leagueB = b.tournament.name;

      const isMajorA = majorLeagues.some((major) => leagueA.includes(major));
      const isMajorB = majorLeagues.some((major) => leagueB.includes(major));

      // If both leagues are major leagues or neither are, sort by order in the array
      if (isMajorA && isMajorB) {
        return 0;
      } else if (isMajorA) {
        return -1;
      } else if (isMajorB) {
        return 1;
      }
      return 0;
    });

    data.events.forEach((event) => {
      const eventType = event.status.type;
      if (
        (hideFinished && eventType === "finished") ||
        (hideNotStarted && eventType === "notstarted")
      ) {
        return; // Skip if the game should be hidden
      }

      const league = event.tournament.name;

      // Only display the league name for the first game of the league
      if (!displayedLeagues.has(league)) {
        displayedLeagues.add(league);
        const leagueTitle = document.createElement("h3");
        leagueTitle.style.fontWeight = "bold";
        leagueTitle.textContent = league;
        scoresDiv.appendChild(leagueTitle);
      }

      const homeTeam = longnames
        ? event.homeTeam.name
        : event.homeTeam.shortName;
      const awayTeam = longnames
        ? event.awayTeam.name
        : event.awayTeam.shortName;
      const homeID = event.homeTeam.id;
      const awayID = event.awayTeam.id;
      const startTime = event.startTimestamp;

      let winner = null;
      if (event.winnerCode === 1) {
        winner = homeTeam;
      } else if (event.winnerCode === 2) {
        winner = awayTeam;
      }

      const homeScore =
        event.homeScore && Object.keys(event.homeScore).length > 0
          ? event.homeScore.display
          : "TBD";
      const awayScore =
        event.awayScore && Object.keys(event.awayScore).length > 0
          ? event.awayScore.display
          : "TBD";

      // Create game container
      const gameContainer = document.createElement("div");
      gameContainer.style.display = "flex";
      gameContainer.style.alignItems = "center"; // Center vertically
      gameContainer.style.marginBottom = "10px";

      // Create a column for time and type
      const eventInfoContainer = document.createElement("div");
      eventInfoContainer.style.display = "flex";
      eventInfoContainer.style.flexDirection = "column";
      eventInfoContainer.style.alignItems = "center"; // Center items vertically
      eventInfoContainer.style.marginRight = "20px"; // Space between time/type and teams

      // Event timestamp section
      const eventTimestamp = document.createElement("span");
      const eventDate = new Date(startTime * 1000); // Convert to milliseconds
      let hours = eventDate.getHours();
      const minutes = eventDate.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // The hour '0' should be '12'
      eventTimestamp.textContent = `${hours}:${minutes} ${ampm}`;
      eventTimestamp.style.marginBottom = "5px"; // Space between timestamp and event type

      // Event type section
      const eventTypeText = document.createElement("span");

      // Color the event type based on its status
      if (eventType === "inprogress") {
        eventTypeText.style.color = "orange";
        eventTypeText.textContent = "In Progress";
      } else if (eventType === "finished") {
        eventTypeText.style.color = "green";
        eventTypeText.textContent = "Finished";
      } else if (eventType === "notstarted") {
        eventTypeText.style.color = "white";
        eventTypeText.textContent = "Not Started";
      } else if (eventType === "postponed") {
        eventTypeText.style.color = "red";
        eventTypeText.textContent = "Postponed";
      }

      // Append timestamp and event type to the info container
      eventInfoContainer.appendChild(eventTimestamp);
      eventInfoContainer.appendChild(eventTypeText);

      // Append the info container to the game container
      gameContainer.appendChild(eventInfoContainer);

      // Teams container
      const teamsContainer = document.createElement("div");
      teamsContainer.style.display = "flex";
      teamsContainer.style.flexDirection = "column";
      teamsContainer.style.alignItems = "flex-start"; // Align teams to the start

      // Home team section
      const homeTeamDiv = document.createElement("div");
      homeTeamDiv.style.display = "flex";
      homeTeamDiv.style.alignItems = "center";

      const homeLogo = document.createElement("img");
      homeLogo.src = `https://api.sofascore.app/api/v1/team/${homeID}/image`;
      homeLogo.alt = `${homeTeam} logo`;
      homeLogo.style.width = "24px";
      homeLogo.style.height = "24px";
      homeLogo.style.marginRight = "10px";

      const homeTeamText = document.createElement("span");
      homeTeamText.textContent = `${homeTeam} (${homeScore})`;
      homeTeamDiv.appendChild(homeLogo);
      homeTeamDiv.appendChild(homeTeamText);
      teamsContainer.appendChild(homeTeamDiv);

      // Away team section
      const awayTeamDiv = document.createElement("div");
      awayTeamDiv.style.display = "flex";
      awayTeamDiv.style.alignItems = "center";

      const awayLogo = document.createElement("img");
      awayLogo.src = `https://api.sofascore.app/api/v1/team/${awayID}/image`;
      awayLogo.alt = `${awayTeam} logo`;
      awayLogo.style.width = "24px";
      awayLogo.style.height = "24px";
      awayLogo.style.marginRight = "10px";

      const awayTeamText = document.createElement("span");
      awayTeamText.textContent = `${awayTeam} (${awayScore})`;
      awayTeamDiv.appendChild(awayLogo);
      awayTeamDiv.appendChild(awayTeamText);
      teamsContainer.appendChild(awayTeamDiv);

      // Dim the losing team's text
      if (winner) {
        if (winner === homeTeam) {
          awayTeamText.style.opacity = "0.5"; // Dim the away team text
        } else if (winner === awayTeam) {
          homeTeamText.style.opacity = "0.5"; // Dim the home team text
        }
      }

      // Append the teams container to the game container
      gameContainer.appendChild(teamsContainer);
      scoresDiv.appendChild(gameContainer);
    });
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

// Set up event listeners for sport and date selection
document.getElementById("sport-select").addEventListener("change", function () {
  const selectedSport = this.value;
  const selectedDate = document.getElementById("date-select").value;
  fetchData(selectedSport, selectedDate);
});

document.getElementById("date-select").addEventListener("change", function () {
  const selectedSport = document.getElementById("sport-select").value;
  const selectedDate = this.value;
  fetchData(selectedSport, selectedDate);
});

// Set defaults
document.getElementById("date-select").value = getCurrentDate();
fetchData("american-football", getCurrentDate());

// Chrome-specific behavior for opening sidePanel
if (typeof chrome.sidePanel !== "undefined") {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

// Re-fetch the data every minute
setInterval(() => {
  const selectedSport = document.getElementById("sport-select").value;
  const selectedDate = document.getElementById("date-select").value;
  fetchData(selectedSport, selectedDate);
}, 60000);
