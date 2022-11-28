import { LogColorOption, Logger } from './logger'
import { Node, Map } from 'auto-traffic-control'
import { getStandardizedCoordinates } from '../util'

export class MapVisualizer {
    public static visualizeFlightPlan(map: Map, flightPlan: Node[]) {
        const width = map.getWidth()
        const height = map.getHeight()
        const airports = map.getAirportsList()
        const restrictedNodes = map
            .getRoutingGridList()
            .filter((node) => node.getRestricted())
        for (let y = height - 1; y >= 0; y--) {
            for (let x = 0; x < width; x++) {
                const index = flightPlan.findIndex((node) => {
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
                    MapVisualizer.invalid()
                } else if (airportIndex > -1) {
                    MapVisualizer.airport()
                } else if (index > -1) {
                    MapVisualizer.path(index)
                } else {
                    MapVisualizer.empty()
                }
            }
            MapVisualizer.endRow()
        }
    }

    public static airport() {
        Logger.write(' A', LogColorOption.FgRed)
    }

    public static path(index: number) {
        Logger.write(
            `${(index + 1).toString().padStart(2, ' ')}`,
            LogColorOption.FgGreen,
        )
    }

    public static empty() {
        Logger.write(' •', LogColorOption.Dim)
    }

    public static endRow() {
        Logger.write('\n')
    }

    public static invalid() {
        Logger.write('  ')
    }
}
