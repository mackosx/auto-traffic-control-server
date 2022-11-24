# Auto Traffic Control Server

Implementation of the server for https://auto-traffic-control.com.

Running Node.js and TypeScript.

## Setup

Follow the quick start guide at https://auto-traffic-control.com/docs

### Install dependencies

```sh
npm install
```

### Run locally

To run locally using `ts-node`:

```sh
npm install
npm run dev
```

### Build and run

To generate a `dist` directory of compiled JavaScript files and run the server from them, use:

```sh
npm run build
npm start
```

## `TODO`

- [x] Follow the set up tutorial
- [x] Add `tsconfig.json` with strict type checking
- [ ] Add `eslint` and `prettier`
- [ ] Figure out how to generate a flight path
- [ ] Path finding! Dijkstra's, A\*, something else?
- [ ] How to avoid collisions...
- [ ] Tests?
