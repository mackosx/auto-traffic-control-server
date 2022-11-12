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
  AirplaneServiceClient,
  UpdateFlightPlanRequest,
  UpdateFlightPlanError,
} from "auto-traffic-control";

function generateFlightPlan(
  id: string,
  start: Node,
  destAirport: Airport
): Node[] {
  return [];
}

function updateFlightPlan(
  event: AirplaneDetected,
  mapService: MapServiceClient,
  airplaneService: AirplaneServiceClient
) {
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

  mapService.getMap(new GetMapRequest(), (err, response) => {
    if (err != null) {
      throw err;
    }
    const map = response.getMap();
    const airports = map?.getAirportsList();
    if (!airports) {
      return;
    }
    const matchingAirport = airports.find(
      (airport) => airport.getTag() == airplane.getTag()
    );
    if (!matchingAirport) {
      console.log("No matching airport for airplane " + airplane);
      return;
    }
    const newFlightPlan = generateFlightPlan(id, nextNode, matchingAirport);
    airplaneService.updateFlightPlan(
      new UpdateFlightPlanRequest()
        .setId(airplane.getId())
        .setFlightPlanList(newFlightPlan),
      (err, response) => {
        if (err != null) {
          throw err;
        }
        // Log any validation errors with the flight plan
        const error = response.getError();
        if (error) {
          const errorsList = error.getErrorsList();
          console.log(errorsList);
          return;
        }
        console.log("Updated " + airplane + "'s flight plan.");
      }
    );
  });

  console.log(`Detected airplane ${id} heading towards ${nextNode}.`);

  return;
}
function exit(event: GameStopped): void {
  const score = event.getScore();

  console.log(`Game stopped! Score: ${score}`);
  process.exit();
}
const processMessage =
  (mapService: MapServiceClient, airplaneService: AirplaneServiceClient) =>
  (streamResponse: StreamResponse) => {
    const airplaneDetected = streamResponse.getAirplaneDetected();
    if (airplaneDetected != undefined) {
      updateFlightPlan(airplaneDetected, mapService, airplaneService);
    }

    const gameStopped = streamResponse.getGameStopped();
    if (gameStopped != undefined) {
      exit(gameStopped);
    }
  };

function streamClosed() {
  console.log("Event stream closed.");
}

function subscribeToEvents(): void {
  const eventService = new EventServiceClient(
    "localhost:4747",
    getCredentials()
  );
  const mapService = new MapServiceClient("localhost:4747", getCredentials());
  const airplaneService = new AirplaneServiceClient(
    "localhost:4747",
    getCredentials()
  );

  const stream = eventService.stream(new StreamRequest());
  stream.on("data", processMessage(mapService, airplaneService));
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
