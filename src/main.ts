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
  Map,
  Airplane,
} from "auto-traffic-control";
import { range } from "./util";

/**
 * Converts a set of coordinates into the routing grid node.
 * @param map Current map
 * @param longitude Longitude of the node to get
 * @param latitude Latitude of the node to get
 * @returns A reference to the node at the given long/lat
 */
function getNodeAt(map: Map, longitude: number, latitude: number): Node {
  const x = longitude + map.getWidth() / 2;
  const y = latitude + map.getHeight() / 2;
  const index = y * map.getWidth() + x;
  return map.getRoutingGridList()[index];
}

/**
 *
 * @param node Node we are getting the neighbours of
 * @param map Map to look for nodes in
 * @returns A list of all nodes surrounding the current node.
 */
function getNeighbours(node: Node, map: Map): Node[] {
  console.log(map.getHeight(), map.getWidth());
  const width_range = range(
    Math.min((map.getWidth() - 1) / 2, node.getLongitude() + 1),
    Math.max(-1 * ((map.getWidth() - 1) / 2), node.getLongitude() - 1)
  );
  const height_range = range(
    Math.min((map.getHeight() - 1) / 2, node.getLatitude() + 1),
    Math.max(-1 * ((map.getHeight() - 1) / 2), node.getLatitude() - 1)
  );
  const neighbours: Node[] = [];
  height_range.forEach((y) => {
    width_range.forEach((x) => {
      if (x !== node.getLongitude() && y !== node.getLatitude()) {
        neighbours.push(getNodeAt(map, x, y));
      }
    });
  });
  return neighbours;
}

function generateFlightPlan(
  id: string,
  start: Node,
  destAirport: Airport,
  map: Map
): Node[] {
  // Testing with sending any nodes
  return getNeighbours(start, map).filter((node) => !node.getRestricted());
}

function getAirportForAirplane(map: Map, airplane: Airplane): Airport {
  const airports = map.getAirportsList();
  const matchingAirport = airports.find(
    (airport) => airport.getTag() == airplane.getTag()
  );
  if (!matchingAirport) {
    throw new Error("No matching airport for airplane " + airplane);
  }

  return matchingAirport;
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
    if (!map) {
      console.error("No map...");
      return;
    }
    const airport = getAirportForAirplane(map, airplane);
    const newFlightPlan = generateFlightPlan(id, nextNode, airport, map);
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
          console.log("Flight plan invalid. Errors: " + errorsList);
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
