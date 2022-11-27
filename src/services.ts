import {
    AirplaneServiceClient,
    EventServiceClient,
    GameServiceClient,
    getCredentials,
    MapServiceClient,
} from 'auto-traffic-control'

export const eventService = new EventServiceClient(
    'localhost:4747',
    getCredentials(),
)
export const mapService = new MapServiceClient(
    'localhost:4747',
    getCredentials(),
)
export const airplaneService = new AirplaneServiceClient(
    'localhost:4747',
    getCredentials(),
)
export const gameService = new GameServiceClient(
    'localhost:4747',
    getCredentials(),
)
