import { StartGameRequest } from 'auto-traffic-control'
import { gameService } from './services'
import { subscribeToEvents } from './events'
import { Logger } from './logging/logger'

function startGame() {
    gameService.startGame(new StartGameRequest(), (err) => {
        if (err != null) {
            throw err
        }
        Logger.info('Started a new game. Good luck!')
    })
}

function main() {
    startGame()
    subscribeToEvents()
}

main()
