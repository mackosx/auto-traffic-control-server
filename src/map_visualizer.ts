import { LogColorOption, Logger } from './logger'

export class MapVisualizer {
    public static airport() {
        Logger.write('  A ', LogColorOption.FgRed)
    }

    public static path(index: number) {
        Logger.write(
            ` ${(index + 1).toString().padStart(2, ' ')} `,
            LogColorOption.FgGreen,
        )
    }

    public static empty() {
        Logger.write('  * ', LogColorOption.Dim)
    }

    public static endRow() {
        Logger.write('\n\n')
    }
}
