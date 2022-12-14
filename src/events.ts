import {
    GameStopped,
    StreamRequest,
    StreamResponse,
} from 'auto-traffic-control'
import { updateFlightPlan } from './flight_planning'
import { Logger } from './logging/logger'
import { eventService } from './services'

function exit(event: GameStopped): void {
    const score = event.getScore()

    Logger.info(`Game stopped! Score: ${score}`)
    process.exit()
}

function processMessage(streamResponse: StreamResponse) {
    const airplaneDetected = streamResponse.getAirplaneDetected()
    if (airplaneDetected != undefined) {
        updateFlightPlan(airplaneDetected)
    }

    const gameStopped = streamResponse.getGameStopped()
    if (gameStopped != undefined) {
        exit(gameStopped)
    }
}

function streamClosed() {
    Logger.info('Event stream closed.')
}

export function subscribeToEvents(): void {
    const stream = eventService.stream(new StreamRequest())
    stream.on('data', processMessage)
    stream.on('end', streamClosed)
}
