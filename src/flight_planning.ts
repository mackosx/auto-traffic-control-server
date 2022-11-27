import {
    Airplane,
    AirplaneDetected,
    Airport,
    UpdateFlightPlanRequest,
    Map,
    Node,
    NodeToPointRequest,
    NodeToPointResponse,
    GetMapRequest,
} from 'auto-traffic-control'
import { bfs, filterNeighbourInDirection, getNeighbours } from './pathing'
import { airplaneService, mapService } from './services'
import { direction, getAirportForAirplane, nodeListStr } from './util'
import { promisify } from 'util'

export async function updateFlightPlan(event: AirplaneDetected) {
    const airplane = event.getAirplane()
    if (airplane == undefined) {
        throw new Error('Received AirplaneDetected event without an airplane')
    }
    const next = airplane.getFlightPlanList()[0]
    // @ts-ignore
    mapService.getMapPromise = promisify<GetMapRequest, GetMapResponse>(
        mapService.getMap,
    )
    // @ts-ignore
    const response = await mapService.getMapPromise(new GetMapRequest())
    const map = response.getMap()
    if (!map) {
        console.error('No map...')
        return
    }
    const airport = getAirportForAirplane(map, airplane)
    const newFlightPlan = await generateFlightPlan(airplane, airport, map)
    console.log(
        'New flight plan acquired ' +
            nodeListStr(newFlightPlan) +
            ' for ' +
            airplane,
    )

    airplaneService.updateFlightPlan(
        new UpdateFlightPlanRequest()
            .setId(airplane.getId())
            .setFlightPlanList(newFlightPlan),
        (err, response) => {
            if (err != null) {
                throw err
            }
            // Log any validation errors with the flight plan
            const error = response.getError()
            if (error) {
                const errorsList = error.getErrorsList()
                console.log('Flight plan invalid. Errors: ' + errorsList)
                return
            }
            console.log('Updated ' + airplane + "'s flight plan.")
        },
    )
    console.log(
        `Detected airplane ${airplane.getId()} heading towards ${next}.`,
    )

    return
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
export async function generateFlightPlan(
    airplane: Airplane,
    destAirport: Airport,
    map: Map,
): Promise<Node[]> {
    const airportNode = destAirport.getNode()
    if (!airportNode) {
        console.error('Airport location unknown...')
        return []
    }
    const flightPlan = airplane.getFlightPlanList()
    const next = flightPlan[0]
    if (!next) {
        console.error('No node in the flight plan to start from...')
        return flightPlan
    }
    const nodeToPointPromise = promisify<
        NodeToPointRequest,
        NodeToPointResponse
    >(mapService.nodeToPoint)

    const response = await nodeToPointPromise(
        new NodeToPointRequest().setNode(next),
    )
    const point = response.getPoint()
    if (!point) {
        console.error("Can't determine point of node: " + next)
        return flightPlan
    }
    const currentAirplanePoint = airplane.getPoint()
    if (!currentAirplanePoint) {
        console.error("Can't determine point of airplane: " + airplane)
        return flightPlan
    }
    const planeDirection = direction(currentAirplanePoint, point)
    const filterFromNode = filterNeighbourInDirection(planeDirection, next)
    // TODO: Avoid all other airplanes flight plans? Breaks down pretty quickly
    // avoid routes that intersect? Calculate point of intersection
    function neighbours(node: Node) {
        return getNeighbours(node, map)
        // .filter(filterFromNode);
    }
    const path = bfs(next, airportNode, neighbours)
    return path
}
