// Constants
const BASE_API_URL = "https://api.sofascore.com/api/v1";
const BASE_APP_URL = "https://api.sofascore.app/api/v1";
const BASE_WEBSITE_URL = "https://www.sofascore.com";
const MAJOR_LEAGUES = ["NBA", "MLB", "NHL", "NFL"];
const REFRESH_INTERVAL = 60000; // 1 minute

// DOM Elements
const sportSelect = document.getElementById("sport-select");
const dateSelect = document.getElementById("date-select");
const hideFinishedCheckbox = document.getElementById("hide-finished");
const hideNotStartedCheckbox = document.getElementById("hide-not-started");
const longnamesCheckbox = document.getElementById("longnames");

// Utility Functions
function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatEventTime(timestamp) {
  const eventDate = new Date(timestamp * 1000);
  let hours = eventDate.getHours();
  const minutes = eventDate.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // Convert 0 to 12
  return `${hours}:${minutes} ${ampm}`;
}

// Settings Management
function loadSettings() {
  const sport = localStorage.getItem("selectedSport") || "american-football";
  const hideFinished = localStorage.getItem("hideFinished") === "true";
  const hideNotStarted = localStorage.getItem("hideNotStarted") === "true";
  const longnames = localStorage.getItem("longnames") === "true";

  sportSelect.value = sport;
  hideFinishedCheckbox.checked = hideFinished;
  hideNotStartedCheckbox.checked = hideNotStarted;
  longnamesCheckbox.checked = longnames;
}

function saveSettings() {
  localStorage.setItem("selectedSport", sportSelect.value);
  localStorage.setItem("hideFinished", hideFinishedCheckbox.checked);
  localStorage.setItem("hideNotStarted", hideNotStartedCheckbox.checked);
  localStorage.setItem("longnames", longnamesCheckbox.checked);
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
  saveSettings();
  fetchData(sportSelect.value, dateSelect.value);
}

function handleDateChange() {
  saveSettings();
  fetchData(sportSelect.value, this.value);
}

function handleFilterChange() {
  saveSettings();
  fetchData(sportSelect.value, dateSelect.value);
}

function handleLongNamesChange() {
  saveSettings();
  fetchData(sportSelect.value, dateSelect.value);
}

// Data Fetching and Processing
async function fetchData(sport, date) {
  try {
    const data = await fetchEventData(sport, date);
    const scoresDiv = document.getElementById("scores");
    scoresDiv.innerHTML = "";

    const filters = {
      date,
      hideFinished: hideFinishedCheckbox.checked,
      hideNotStarted: hideNotStartedCheckbox.checked,
      longnames: longnamesCheckbox.checked,
    };

    if (data.events.length === 0) {
      displayNoEventsMessage(scoresDiv, "No events are scheduled for today.");
      return;
    }

    const sortedEvents = sortEvents(data.events);
    renderEvents(sortedEvents, filters);

    if (scoresDiv.children.length === 0) {
      displayNoEventsMessage(
        scoresDiv,
        "No events match the selected filters."
      );
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function fetchEventData(sport, date) {
  const response = await fetch(
    `${BASE_API_URL}/sport/${sport}/scheduled-events/${date}`
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
}

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

// Rendering Functions
function renderEvents(events, filters) {
  const scoresDiv = document.getElementById("scores");
  const displayedLeagues = new Set();

  events.forEach((event) => {
    const eventDateObj = new Date((event.startTimestamp - 4 * 3600) * 1000); // shift to EST
    const selectedDateObj = new Date(filters.date);

    if (
      shouldFilterEvent(event, { ...filters, eventDateObj, selectedDateObj })
    ) {
      return;
    }

    const league = event.tournament.name;
    if (!displayedLeagues.has(league)) {
      addLeagueHeader(scoresDiv, league);
      displayedLeagues.add(league);
    }

    renderEvent(scoresDiv, event, filters.longnames);
  });
}

function shouldFilterEvent(event, filters) {
  const { hideFinished, hideNotStarted, eventDateObj, selectedDateObj } =
    filters;
  const eventType = event.status.type;

  return (
    eventDateObj < selectedDateObj ||
    (hideFinished && eventType === "finished") ||
    (hideNotStarted && eventType === "notstarted")
  );
}

function displayNoEventsMessage(scoresDiv, message) {
  const noEventsMessage = document.createElement("p");
  noEventsMessage.textContent = message;
  scoresDiv.appendChild(noEventsMessage);
}

function addLeagueHeader(scoresDiv, league) {
  const leagueTitle = document.createElement("h3");
  leagueTitle.style.fontWeight = "bold";
  leagueTitle.textContent = league;
  scoresDiv.appendChild(leagueTitle);
}

function renderEvent(scoresDiv, event, longnames) {
  const gameContainer = createGameContainer();
  const eventInfoContainer = createEventInfoContainer(
    event.startTimestamp,
    event.status.type
  );
  const teamsContainer = createTeamsContainer(event, longnames);

  gameContainer.onclick = () => {
    const sport = sportSelect.value;
    const url = `${BASE_WEBSITE_URL}/${sport}/match/${event.slug}/${event.customId}`;
    window.open(url, "_blank");
  };
  gameContainer.style.cursor = "pointer";

  gameContainer.appendChild(eventInfoContainer);
  gameContainer.appendChild(teamsContainer);
  scoresDiv.appendChild(gameContainer);
}

function createGameContainer() {
  const gameContainer = document.createElement("div");
  gameContainer.style.display = "flex";
  gameContainer.style.alignItems = "center";
  gameContainer.style.marginBottom = "10px";
  return gameContainer;
}

function createEventInfoContainer(startTime, eventType) {
  const eventInfoContainer = document.createElement("div");
  eventInfoContainer.style.display = "flex";
  eventInfoContainer.style.flexDirection = "column";
  eventInfoContainer.style.alignItems = "center";
  eventInfoContainer.style.marginRight = "20px";

  const eventTimestamp = document.createElement("span");
  eventTimestamp.textContent = formatEventTime(startTime);
  eventInfoContainer.appendChild(eventTimestamp);

  const eventTypeText = createEventTypeText(eventType);
  eventInfoContainer.appendChild(eventTypeText);

  return eventInfoContainer;
}

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

function createTeamsContainer(event, longnames) {
  const teamsContainer = document.createElement("div");
  teamsContainer.style.display = "flex";
  teamsContainer.style.flexDirection = "column";
  teamsContainer.style.alignItems = "flex-start";

  const homeTeamDiv = createTeamDiv(event.homeTeam, event.homeScore, longnames);
  const awayTeamDiv = createTeamDiv(event.awayTeam, event.awayScore, longnames);

  dimLosingTeam(event, homeTeamDiv, awayTeamDiv);

  teamsContainer.appendChild(homeTeamDiv);
  teamsContainer.appendChild(awayTeamDiv);

  return teamsContainer;
}

function createTeamDiv(team, score, longnames) {
  const teamDiv = document.createElement("div");
  teamDiv.style.display = "flex";
  teamDiv.style.alignItems = "center";
  teamDiv.style.justifyContent = "space-between";
  teamDiv.style.width = "100%";

  const teamInfoDiv = document.createElement("div");
  teamInfoDiv.style.display = "flex";
  teamInfoDiv.style.alignItems = "center";

  const teamLogo = document.createElement("img");
  teamLogo.src = `${BASE_APP_URL}/team/${team.id}/image`;
  teamLogo.alt = `${team.name} logo`;
  teamLogo.style.width = "24px";
  teamLogo.style.height = "24px";
  teamLogo.style.marginRight = "10px";
  teamLogo.style.marginBottom = "5px";

  const teamName = longnames ? team.name : team.shortName;

  const teamNameText = document.createElement("span");
  teamNameText.textContent = teamName;
  teamNameText.style.width = "150px";
  teamNameText.style.whiteSpace = "nowrap";
  teamNameText.style.overflow = "hidden";
  teamNameText.style.textOverflow = "ellipsis";
  teamNameText.style.textAlign = "left";

  teamInfoDiv.appendChild(teamLogo);
  teamInfoDiv.appendChild(teamNameText);

  const scoreDiv = document.createElement("div");
  scoreDiv.style.textAlign = "right";
  scoreDiv.style.minWidth = "40px";
  const teamScore = score?.display || "TBD";
  scoreDiv.textContent = teamScore;

  teamDiv.appendChild(teamInfoDiv);
  teamDiv.appendChild(scoreDiv);

  return teamDiv;
}

function dimLosingTeam(event, homeTeamDiv, awayTeamDiv) {
  const homeTeamText = homeTeamDiv.querySelector("span");
  const awayTeamText = awayTeamDiv.querySelector("span");

  if (event.winnerCode === 1) {
    awayTeamText.style.opacity = "0.5";
  } else if (event.winnerCode === 2) {
    homeTeamText.style.opacity = "0.5";
  }
}

// Initialization and Refresh
function initializeApp() {
  loadSettings();
  const currentDate = getCurrentDate();
  dateSelect.value = currentDate;
  fetchData(sportSelect.value, currentDate);

  setupSidePanel();

  setInterval(refreshData, REFRESH_INTERVAL);
}

function refreshData() {
  fetchData(sportSelect.value, dateSelect.value);
}

function setupSidePanel() {
  if (chrome && chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
}

// Initialize the application
initializeApp();
setupEventListeners();
