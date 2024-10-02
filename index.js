// Consts
const BASE_API_URL = "https://api.sofascore.com/api/v1";
const BASE_APP_URL = "https://api.sofascore.app/api/v1";
const MAJOR_LEAGUES = ["NBA", "MLB", "NHL", "NFL"];
const REFRESH_INTERVAL = 60000; // 1 minute

// DOM elements
const sportSelect = document.getElementById("sport-select");
const dateSelect = document.getElementById("date-select");
const hideFinishedCheckbox = document.getElementById("hide-finished");
const hideNotStartedCheckbox = document.getElementById("hide-not-started");
const longnamesCheckbox = document.getElementById("longnames");

// Utility functions
// Todo: split into get and format functions
function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Listeners
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

document.getElementById("longnames").addEventListener("change", function () {
  const selectedSport = document.getElementById("sport-select").value;
  const selectedDate = document.getElementById("date-select").value;
  fetchData(selectedSport, selectedDate); // Reload data with new names
});

async function fetchData(sport, date) {
  try {
    const response = await fetch(
      `${BASE_API_URL}/sport/${sport}/scheduled-events/${date}`
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

    // If no events are found, display a message
    if (data.events.length === 0) {
      const noEventsMessage = document.createElement("p");
      noEventsMessage.textContent = "No events are scheduled for today.";
      scoresDiv.appendChild(noEventsMessage);
      return; // Exit the function early
    }

    // Track the leagues displayed
    const displayedLeagues = new Set();

    // Sort events: Major leagues first
    data.events.sort((a, b) => {
      const leagueA = a.tournament.name;
      const leagueB = b.tournament.name;

      const isMajorA = MAJOR_LEAGUES.some((major) => leagueA.includes(major));
      const isMajorB = MAJOR_LEAGUES.some((major) => leagueB.includes(major));

      // Sort in case multiple major leagues are present, should never happen
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
      const league = event.tournament.name;

      // check if the event date is before the selected date
      const startTime = event.startTimestamp;
      const eventDateObj = new Date((startTime - 4 * 3600) * 1000); // shift time to EST
      const selectedDateObj = new Date(date);

      if (eventDateObj < selectedDateObj) {
        return;
      }

      // Skip if the game should be hidden
      if (
        (hideFinished && eventType === "finished") ||
        (hideNotStarted && eventType === "notstarted")
      ) {
        return;
      }

      // Only display the league name for the first valid game in the league
      let leagueHasGames = displayedLeagues.has(league);

      if (!leagueHasGames) {
        displayedLeagues.add(league);
        const leagueTitle = document.createElement("h3");
        leagueTitle.style.fontWeight = "bold";
        leagueTitle.textContent = league;
        scoresDiv.appendChild(leagueTitle);
        leagueHasGames = true; // Set flag to true since a game has been added
      }

      const homeTeam = longnames
        ? event.homeTeam.name
        : event.homeTeam.shortName;
      const awayTeam = longnames
        ? event.awayTeam.name
        : event.awayTeam.shortName;
      const homeID = event.homeTeam.id;
      const awayID = event.awayTeam.id;

      // Check if the event date is before the selected date
      if (eventDateObj < selectedDateObj) {
        return;
      }

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
      switch (eventType) {
        case "inprogress":
          eventTypeText.style.color = "orange";
          eventTypeText.textContent = "In Progress";
          break;
        case "finished":
          eventTypeText.style.color = "green";
          eventTypeText.textContent = "Finished";
          break;
        case "notstarted":
          eventTypeText.style.color = "white";
          eventTypeText.textContent = "Not Started";
          break;
        case "postponed":
          eventTypeText.style.color = "red";
          eventTypeText.textContent = "Postponed";
          break;
        default:
          // Do nothing
          break;
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
      homeLogo.src = `${BASE_APP_URL}/team/${homeID}/image`;
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
      awayLogo.src = `${BASE_APP_URL}/team/${awayID}/image`;
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

// Set defaults
document.getElementById("date-select").value = getCurrentDate();
fetchData("american-football", getCurrentDate());

// Set up the side panel (chrome based browsers only)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Refresh data
setInterval(() => {
  const selectedSport = document.getElementById("sport-select").value;
  const selectedDate = document.getElementById("date-select").value;
  fetchData(selectedSport, selectedDate);
}, REFRESH_INTERVAL);
