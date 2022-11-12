import {
  getCredentials,
  GameServiceClient,
  StartGameRequest,
  StreamResponse,
  AirplaneDetected,
  GameStopped,
  MapServiceClient,
  EventServiceClient,
  StreamRequest,
  GetMapRequest,
  Airport,
  Node,
} from "auto-traffic-control";

function generateFlightPlan(id: string, nextNode: Node, destAirpot: Airport) {}

function updateFlightPlan(event: AirplaneDetected) {
  const airplane = event.getAirplane();
  if (airplane == undefined) {
    throw new Error("Received AirplaneDetected event without an airplane");
  }

  const id = airplane.getId();
  const flightPlan = airplane.getFlightPlanList();
  const nextNode = flightPlan[0];
  if (!nextNode) {
    return;
  }
  // TODO: inject the map service, instead of creating a new instance here
  const mapService = new MapServiceClient("localhost:4747", getCredentials());

  mapService.getMap(new GetMapRequest(), (err, response) => {
    if (err != null) {
      throw err;
    }
    if (!response.hasMap()) {
      return;
    }
    const map = response.getMap();
    const airports = map?.getAirportsList();
    if (airports) {
      const matchingAirport = airports.find(
        (airport) => airport.getTag() == airplane.getTag()
      );
      if (matchingAirport) {
        generateFlightPlan(id, nextNode, matchingAirport);
      }
    }
  });

  console.log(`Detected airplane ${id} heading towards ${nextNode}.`);

  return;
}
function exit(event: GameStopped): void {
  const score = event.getScore();

  console.log(`Game stopped! Score: ${score}`);
  process.exit();
}
function processMessage(streamResponse: StreamResponse): void {
  const airplaneDetected = streamResponse.getAirplaneDetected();
  if (airplaneDetected != undefined) {
    updateFlightPlan(airplaneDetected);
  }

  const gameStopped = streamResponse.getGameStopped();
  if (gameStopped != undefined) {
    exit(gameStopped);
  }
}

function streamClosed() {
  console.log("Event stream closed.");
}

function subscribeToEvents(): void {
  const eventService = new EventServiceClient(
    "localhost:4747",
    getCredentials()
  );

  const stream = eventService.stream(new StreamRequest());
  stream.on("data", processMessage);
  stream.on("end", streamClosed);
}

function startGame() {
  const gameService = new GameServiceClient("localhost:4747", getCredentials());

  gameService.startGame(new StartGameRequest(), (err) => {
    if (err != null) {
      throw err;
    }
    console.log("Started a new game. Good luck!");
  });
}

function main() {
  startGame();
  subscribeToEvents();
}

main();
