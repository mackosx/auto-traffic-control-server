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
  NodeToPointRequest,
  NodeToPointResponse,
  GetMapResponse,
} from "auto-traffic-control";
import { Direction, direction, range, unitMove } from "./util";
import { promisify } from "util";

const eventService = new EventServiceClient("localhost:4747", getCredentials());
const mapService = new MapServiceClient("localhost:4747", getCredentials());
const airplaneService = new AirplaneServiceClient(
  "localhost:4747",
  getCredentials()
);
const gameService = new GameServiceClient("localhost:4747", getCredentials());

/**
 * Converts a set of coordinates into the routing grid node.
 * @param map Current map
 * @param longitude Longitude of the node to get
 * @param latitude Latitude of the node to get
 * @returns A reference to the node at the given long/lat
 */
function getNodeAt(map: Map, longitude: number, latitude: number): Node {
  const x = longitude + (map.getWidth() - 1) / 2;
  const y = latitude + (map.getHeight() - 1) / 2;
  const index = y * map.getWidth() + x;
  return map.getRoutingGridList()[index];
}

const filterNeighbourInDirection =
  (inDirection: Direction, origin: Node) => (node: Node) => {
    const newCoords = unitMove[inDirection];
    return !(
      origin.getLongitude() + newCoords[0] === node.getLongitude() &&
      origin.getLatitude() + newCoords[1] === node.getLatitude()
    );
  };

/**
 * The neighbours are a 3 by 3 box surrounding the current node.
 *
 * @param node Node we are getting the neighbours of
 * @param map Map to look for nodes in
 * @returns A list of all nodes surrounding the current node.
 */
function getNeighbours(node: Node, map: Map): Node[] {
  // Origin is at the middle of the map so subtract 1 divide by 2 gives
  // us the range of either side of the origin
  const widthRange = range(
    Math.min((map.getWidth() - 1) / 2, node.getLongitude() + 1),
    Math.max(-1 * ((map.getWidth() - 1) / 2), node.getLongitude() - 1)
  );
  const heightRange = range(
    Math.min((map.getHeight() - 1) / 2, node.getLatitude() + 1),
    Math.max(-1 * ((map.getHeight() - 1) / 2), node.getLatitude() - 1)
  );
  const neighbours: Node[] = [];
  heightRange.forEach((y) => {
    widthRange.forEach((x) => {
      if (x !== node.getLongitude() && y !== node.getLatitude()) {
        neighbours.push(getNodeAt(map, x, y));
      }
    });
  });
  return neighbours;
}

/**
 * Airplanes are not allowed to immediately turn backwards,
 * so we need to know what node they came from so we can
 * filter out that node in our list of valid neighbours.
 *
 * First, convert the airplane's next node into a point.
 *
 * Compare that against the airplanes current location to
 * determine the direction of flight,
 *
 * Once we know the direction, eliminate the node in the reverse of that direction.
 * Example of valid next nodes from a given node with a northern direction (^):
 * ```
 *    * * *
 *    * ^ *
 *    * x *
 * ```
 */
async function generateFlightPlan(
  airplane: Airplane,
  destAirport: Airport,
  map: Map
): Promise<Node[]> {
  const flightPlan = airplane.getFlightPlanList();
  const next = flightPlan[0];
  if (!next) {
    console.error("No node in the flight plan to start from...");
    return flightPlan;
  }
  // @ts-ignore
  mapService.nodeToPointPromise = promisify<
    NodeToPointRequest,
    NodeToPointResponse
  >(mapService.nodeToPoint);
  // @ts-ignore
  const response = await mapService.nodeToPointPromise(
    new NodeToPointRequest().setNode(next)
  );
  const point = response.getPoint();
  if (!point) {
    console.error("Can't determine point of node: " + next);
    return flightPlan;
  }
  const currentAirplanePoint = airplane.getPoint();
  if (!currentAirplanePoint) {
    console.error("Can't determine point of airplane: " + airplane);
    return flightPlan;
  }
  const planeDirection = direction(currentAirplanePoint, point);
  // Testing with sending any nodes
  const filterFromNode = filterNeighbourInDirection(planeDirection, next);
  const possibleNodes = getNeighbours(next, map)
    .filter((node) => !node.getRestricted())
    .filter(filterFromNode);
  console.log("Possible next moves: " + possibleNodes);
  return [next, possibleNodes[0]];
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

async function updateFlightPlan(event: AirplaneDetected) {
  const airplane = event.getAirplane();
  if (airplane == undefined) {
    throw new Error("Received AirplaneDetected event without an airplane");
  }
  const next = airplane.getFlightPlanList()[0];
  // @ts-ignore
  mapService.getMapPromise = promisify<GetMapRequest, GetMapResponse>(
    mapService.getMap
  );
  // @ts-ignore
  const response = await mapService.getMapPromise(new GetMapRequest());
  const map = response.getMap();
  if (!map) {
    console.error("No map...");
    return;
  }
  const airport = getAirportForAirplane(map, airplane);
  const newFlightPlan = await generateFlightPlan(airplane, airport, map);
  console.log("New flight plan acquired " + newFlightPlan + " for " + airplane);

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
  console.log(`Detected airplane ${airplane.getId()} heading towards ${next}.`);

  return;
}

function exit(event: GameStopped): void {
  const score = event.getScore();

  console.log(`Game stopped! Score: ${score}`);
  process.exit();
}

function processMessage(streamResponse: StreamResponse) {
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
  const stream = eventService.stream(new StreamRequest());
  stream.on("data", processMessage);
  stream.on("end", streamClosed);
}

function startGame() {
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
