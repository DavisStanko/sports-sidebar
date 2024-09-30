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

    if (data.events.length === 0) {
      scoresDiv.innerHTML = "<p>No games available for the selected date.</p>";
      return;
    }

    const hideFinished = document.getElementById("hide-finished").checked;
    const hideNotStarted = document.getElementById("hide-not-started").checked;

    // Track the leagues displayed
    const displayedLeagues = new Set();

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

      const homeTeam = event.homeTeam.name;
      const awayTeam = event.awayTeam.name;
      const homeScore =
        event.homeScore && Object.keys(event.homeScore).length > 0
          ? event.homeScore.display
          : "TBD";
      const awayScore =
        event.awayScore && Object.keys(event.awayScore).length > 0
          ? event.awayScore.display
          : "TBD";

      const gameText = document.createElement("p");
      gameText.textContent = `${homeTeam} (${homeScore}) vs ${awayTeam} (${awayScore})`;

      if (eventType === "inprogress") {
        gameText.style.color = "orange";
      } else if (eventType === "finished") {
        gameText.style.color = "green";
      } else if (eventType === "notstarted") {
        gameText.style.color = "white";
      } else if (eventType === "postponed") {
        gameText.style.color = "red";
      }

      gameText.style.cursor = "pointer";
      gameText.addEventListener("click", () => fetchEventDetails(event.id));
      scoresDiv.appendChild(gameText);
    });
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

// Function to fetch event details based on the event ID
async function fetchEventDetails(eventId) {
  try {
    const response = await fetch(
      `https://api.sofascore.com/api/v1/event/${eventId}`
    );
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const eventDetails = await response.json();

    // Handle displaying the event details here
    // For example, log the details or update a div with the info
    console.log(eventDetails);
    alert(JSON.stringify(eventDetails, null, 2)); // Display details in a simple alert (for demo)
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

// Set default date to current date
document.getElementById("date-select").value = getCurrentDate();

// Fetch initial data for the default sport (American Football) and current date
fetchData("american-football", getCurrentDate());

// Handle Firefox compatibility (Note: Firefox does not have chrome.sidePanel API)
if (
  typeof browser !== "undefined" &&
  typeof browser.sidebarAction !== "undefined"
) {
  browser.sidebarAction.open();
} else if (typeof chrome.sidePanel !== "undefined") {
  // Chrome-specific behavior for opening sidePanel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}
