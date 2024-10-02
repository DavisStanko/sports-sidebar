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
function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Event Listeners
function setupEventListeners() {
  sportSelect.addEventListener("change", handleSportChange);
  dateSelect.addEventListener("change", handleDateChange);
  hideFinishedCheckbox.addEventListener("change", handleFilterChange);
  hideNotStartedCheckbox.addEventListener("change", handleFilterChange);
  longnamesCheckbox.addEventListener("change", handleLongNamesChange);
}

function handleSportChange() {
  const selectedSport = sportSelect.value;
  const selectedDate = dateSelect.value;
  fetchData(selectedSport, selectedDate);
}

function handleDateChange() {
  const selectedSport = sportSelect.value;
  const selectedDate = this.value;
  fetchData(selectedSport, selectedDate);
}

function handleFilterChange() {
  const selectedSport = sportSelect.value;
  const selectedDate = dateSelect.value;
  fetchData(selectedSport, selectedDate);
}

function handleLongNamesChange() {
  const selectedSport = sportSelect.value;
  const selectedDate = dateSelect.value;
  fetchData(selectedSport, selectedDate);
}

async function fetchData(sport, date) {
  try {
    const data = await fetchEventData(sport, date);

    const scoresDiv = document.getElementById("scores");
    scoresDiv.innerHTML = "";

    const hideFinished = document.getElementById("hide-finished").checked;
    const hideNotStarted = document.getElementById("hide-not-started").checked;
    const longnames = document.getElementById("longnames").checked;

    // If no events, display a message and exit
    if (data.events.length === 0) {
      displayNoEventsMessage(scoresDiv);
      return;
    }

    // Sort events with major leagues first
    const sortedEvents = sortEvents(data.events);

    // Render events
    renderEvents(sortedEvents, {
      date,
      hideFinished,
      hideNotStarted,
      longnames,
    });
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

// Fetch event data from API
async function fetchEventData(sport, date) {
  const response = await fetch(
    `${BASE_API_URL}/sport/${sport}/scheduled-events/${date}`
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
}

// Display message when no events are found
function displayNoEventsMessage(scoresDiv) {
  const noEventsMessage = document.createElement("p");
  noEventsMessage.textContent = "No events are scheduled for today.";
  scoresDiv.appendChild(noEventsMessage);
}

// Sort events: Major leagues first
function sortEvents(events) {
  return events.sort((a, b) => {
    const leagueA = a.tournament.name;
    const leagueB = b.tournament.name;
    const isMajorA = MAJOR_LEAGUES.some((major) => leagueA.includes(major));
    const isMajorB = MAJOR_LEAGUES.some((major) => leagueB.includes(major));

    if (isMajorA && !isMajorB) return -1;
    if (!isMajorA && isMajorB) return 1;
    return 0;
  });
}

// Render events in the DOM
function renderEvents(events, filters) {
  const { date, hideFinished, hideNotStarted, longnames } = filters;
  const scoresDiv = document.getElementById("scores");
  const displayedLeagues = new Set();

  events.forEach((event) => {
    const eventDateObj = new Date((event.startTimestamp - 4 * 3600) * 1000); // shift to EST
    const selectedDateObj = new Date(date);

    // Filter based on finished/not started status and date
    if (
      shouldFilterEvent(event, {
        hideFinished,
        hideNotStarted,
        eventDateObj,
        selectedDateObj,
      })
    ) {
      return;
    }

    // Add league header if it hasn't been displayed
    const league = event.tournament.name;
    if (!displayedLeagues.has(league)) {
      addLeagueHeader(scoresDiv, league);
      displayedLeagues.add(league);
    }

    // Render individual event
    renderEvent(scoresDiv, event, longnames);
  });
}

// Determine if the event should be filtered out
function shouldFilterEvent(event, filters) {
  const { hideFinished, hideNotStarted, eventDateObj, selectedDateObj } =
    filters;
  const eventType = event.status.type;

  return (
    eventDateObj < selectedDateObj || // Event is in the past
    (hideFinished && eventType === "finished") ||
    (hideNotStarted && eventType === "notstarted")
  );
}

// Add a league header to the scoresDiv
function addLeagueHeader(scoresDiv, league) {
  const leagueTitle = document.createElement("h3");
  leagueTitle.style.fontWeight = "bold";
  leagueTitle.textContent = league;
  scoresDiv.appendChild(leagueTitle);
}

// Render an individual event
function renderEvent(scoresDiv, event, longnames) {
  const gameContainer = createGameContainer();
  const eventInfoContainer = createEventInfoContainer(
    event.startTimestamp,
    event.status.type
  );
  const teamsContainer = createTeamsContainer(event, longnames);

  // Add onclick to open the event link
  gameContainer.onclick = () => {
    const sport = sportSelect.value;
    const url = `https://www.sofascore.com/${sport}/match/${event.slug}/${event.customId}`;
    window.open(url, "_blank");
  };
  gameContainer.style.cursor = "pointer";

  gameContainer.appendChild(eventInfoContainer);
  gameContainer.appendChild(teamsContainer);
  scoresDiv.appendChild(gameContainer);
}

// Create the container for the game information
function createGameContainer() {
  const gameContainer = document.createElement("div");
  gameContainer.style.display = "flex";
  gameContainer.style.alignItems = "center";
  gameContainer.style.marginBottom = "10px";
  return gameContainer;
}

// Create the event information (time and status)
function createEventInfoContainer(startTime, eventType) {
  const eventInfoContainer = document.createElement("div");
  eventInfoContainer.style.display = "flex";
  eventInfoContainer.style.flexDirection = "column";
  eventInfoContainer.style.alignItems = "center";
  eventInfoContainer.style.marginRight = "20px";

  // Add time and type
  const eventTimestamp = document.createElement("span");
  eventTimestamp.textContent = formatEventTime(startTime);
  eventInfoContainer.appendChild(eventTimestamp);

  const eventTypeText = createEventTypeText(eventType);
  eventInfoContainer.appendChild(eventTypeText);

  return eventInfoContainer;
}

// Format event start time
function formatEventTime(timestamp) {
  const eventDate = new Date(timestamp * 1000);
  let hours = eventDate.getHours();
  const minutes = eventDate.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // Convert 0 to 12
  return `${hours}:${minutes} ${ampm}`;
}

// Create event type text with color-coding
function createEventTypeText(eventType) {
  const eventTypeText = document.createElement("span");

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
      eventTypeText.textContent = "Unknown";
  }

  return eventTypeText;
}

// Create teams container with logos and scores
function createTeamsContainer(event, longnames) {
  const teamsContainer = document.createElement("div");
  teamsContainer.style.display = "flex";
  teamsContainer.style.flexDirection = "column";
  teamsContainer.style.alignItems = "flex-start";

  const homeTeamDiv = createTeamDiv(event.homeTeam, event.homeScore, longnames);
  const awayTeamDiv = createTeamDiv(event.awayTeam, event.awayScore, longnames);

  // Dim losing team's text
  dimLosingTeam(event, homeTeamDiv, awayTeamDiv);

  teamsContainer.appendChild(homeTeamDiv);
  teamsContainer.appendChild(awayTeamDiv);

  return teamsContainer;
}

// Create individual team div with logo and score
function createTeamDiv(team, score, longnames) {
  const teamDiv = document.createElement("div");
  teamDiv.style.display = "flex";
  teamDiv.style.alignItems = "center";

  const teamLogo = document.createElement("img");
  teamLogo.src = `${BASE_APP_URL}/team/${team.id}/image`;
  teamLogo.alt = `${team.name} logo`;
  teamLogo.style.width = "24px";
  teamLogo.style.height = "24px";
  teamLogo.style.marginRight = "10px";

  const teamName = longnames ? team.name : team.shortName;
  const teamScore = score?.display || "TBD";
  const teamText = document.createElement("span");
  teamText.textContent = `${teamName} (${teamScore})`;

  teamDiv.appendChild(teamLogo);
  teamDiv.appendChild(teamText);

  return teamDiv;
}

// Dim the losing team's text
function dimLosingTeam(event, homeTeamDiv, awayTeamDiv) {
  const homeTeamText = homeTeamDiv.querySelector("span");
  const awayTeamText = awayTeamDiv.querySelector("span");

  if (event.winnerCode === 1) {
    awayTeamText.style.opacity = "0.5";
  } else if (event.winnerCode === 2) {
    homeTeamText.style.opacity = "0.5";
  }
}

// Set default date and fetch initial data
function initializeApp() {
  const currentDate = getCurrentDate();
  dateSelect.value = currentDate;
  fetchData("american-football", currentDate);

  // Set up the side panel (Chrome-based browsers only)
  setupSidePanel();

  // Start refreshing data
  setInterval(refreshData, REFRESH_INTERVAL);
}

// Refresh data
function refreshData() {
  const selectedSport = sportSelect.value;
  const selectedDate = dateSelect.value;
  fetchData(selectedSport, selectedDate);
}

// Set up the side panel (Chrome only)
function setupSidePanel() {
  if (chrome && chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
}

// Init
initializeApp();
setupEventListeners();
