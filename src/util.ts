import { Point, Node, Map, Airplane, Airport } from 'auto-traffic-control'
import { Logger } from './logger'
import { MapVisualizer } from './map_visualizer'

/**
 *
 * @param stop Last value (inclusive) of the array
 * @param start Starting value of the array.
 * @returns An array from start to stop (inclusive)
 */
export function range(stop: number, start: number) {
    const size = Math.abs(start - stop) + 1
    return [...Array(size).keys()].map((i) => i + start)
}

export enum Direction {
    NORTH = 'N',
    EAST = 'E',
    SOUTH = 'S',
    WEST = 'W',
    NORTH_EAST = 'NE',
    NORTH_WEST = 'NW',
    SOUTH_EAST = 'SE',
    SOUTH_WEST = 'SW',
}

export const unitMove = {
    [Direction.EAST]: [1, 0],
    [Direction.WEST]: [-1, 0],
    [Direction.NORTH]: [0, 1],
    [Direction.SOUTH]: [0, -1],
    [Direction.NORTH_EAST]: [1, 1],
    [Direction.SOUTH_EAST]: [1, -1],
    [Direction.NORTH_WEST]: [-1, 1],
    [Direction.SOUTH_WEST]: [-1, -1],
}

export function direction(from: Point, to: Point): Direction {
    const x = from.getX() - to.getX()
    const y = from.getY() - to.getY()

    if (x == 0) {
        if (y <= 0) {
            return Direction.SOUTH
        }
        if (y > 0) {
            return Direction.NORTH
        }
    }
    if (x < 0) {
        if (y == 0) {
            return Direction.WEST
        }
        if (y < 0) {
            return Direction.SOUTH_WEST
        }
        if (y > 0) {
            return Direction.NORTH_WEST
        }
    }
    if (x > 0) {
        if (y == 0) {
            return Direction.EAST
        }
        if (y < 0) {
            return Direction.SOUTH_EAST
        }
        if (y > 0) {
            return Direction.NORTH_EAST
        }
    }
    // Default to get nice typing
    return Direction.EAST
}

/**
 * Converts a set of coordinates into the routing grid node.
 * @param map Current map
 * @param longitude Longitude of the node to get
 * @param latitude Latitude of the node to get
 * @returns A reference to the node at the given long/lat
 */
export function getNodeAt(map: Map, longitude: number, latitude: number): Node {
    const { x, y } = getStandardizedCoordinates(map, longitude, latitude)
    const index = y * map.getWidth() + x
    return map.getRoutingGridList()[index]
}

/**
 * Converts longitude/latitude into 0-based coordinates
 *
 * e.g. -11,4 => 0,12
 * @param map
 * @param longitude
 * @param latitude
 * @returns
 */
export function getStandardizedCoordinates(
    map: Map,
    longitude: number,
    latitude: number,
) {
    const x = longitude + (map.getWidth() - 1) / 2
    const y = latitude + (map.getHeight() - 1) / 2

    return { x, y }
}

export function getAirportForAirplane(map: Map, airplane: Airplane): Airport {
    const airports = map.getAirportsList()
    const matchingAirport = airports.find(
        (airport) => airport.getTag() == airplane.getTag(),
    )
    if (!matchingAirport) {
        throw new Error('No matching airport for airplane ' + airplane)
    }

    return matchingAirport
}

export function nodeStr(node: Node) {
    return `(${node.getLongitude()}, ${node.getLatitude()})`
}
// TODO: function to print out a debug map to see where the pathing is going
export function nodeListStr(nodes: Node[]) {
    return nodes.map(nodeStr).join(' -> ')
}

export function mapDebugString(map: Map, nodes: Node[]) {
    const width = map.getWidth()
    const height = map.getHeight()
    const airports = map.getAirportsList()
    const restrictedNodes = map
        .getRoutingGridList()
        .filter((node) => node.getRestricted())
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const index = nodes.findIndex((node) => {
                const coordinates = getStandardizedCoordinates(
                    map,
                    node.getLongitude(),
                    node.getLatitude(),
                )
                return x === coordinates.x && y === coordinates.y
            })
            const airportIndex = airports.findIndex((airport) => {
                const coordinates = getStandardizedCoordinates(
                    map,
                    airport.getNode()!.getLongitude(),
                    airport.getNode()!.getLatitude(),
                )
                return x === coordinates.x && y === coordinates.y
            })
            const restrictedIndex = restrictedNodes.findIndex((node) => {
                const coordinates = getStandardizedCoordinates(
                    map,
                    node.getLongitude(),
                    node.getLatitude(),
                )
                return x === coordinates.x && y === coordinates.y
            })
            if (restrictedIndex > -1) {
                process.stdout.write('    ')
            } else if (airportIndex > -1) {
                MapVisualizer.airport()
            } else if (index > -1) {
                MapVisualizer.path(index)
                // process.stdout.write(
                //     ` ${(index + 1).toString().padStart(2, ' ')} `,
                // )
            } else {
                MapVisualizer.empty()
            }
        }
        MapVisualizer.endRow()
    }
}
