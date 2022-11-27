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
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
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
                    process.stdout.write('    ')
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

    private static airport() {
        Logger.write('  A ', LogColorOption.FgRed)
    }

    private static path(index: number) {
        Logger.write(
            ` ${(index + 1).toString().padStart(2, ' ')} `,
            LogColorOption.FgGreen,
        )
    }

    private static empty() {
        Logger.write('  * ', LogColorOption.Dim)
    }

    private static endRow() {
        Logger.write('\n\n')
    }
}
