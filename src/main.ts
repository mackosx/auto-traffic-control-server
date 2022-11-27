import { StartGameRequest } from 'auto-traffic-control'
import { gameService } from './services'
import { subscribeToEvents } from './events'

function startGame() {
    gameService.startGame(new StartGameRequest(), (err) => {
        if (err != null) {
            throw err
        }
        console.log('Started a new game. Good luck!')
    })
}

function main() {
    startGame()
    subscribeToEvents()
}

main()
