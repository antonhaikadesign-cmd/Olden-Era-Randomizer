# Olden Era Hero Randomizer

Local mini-site for rolling random Olden Era heroes and faction castles for two opponents.

## Run

Start any simple local server in this folder, for example:

```bash
python3 -m http.server 4173
```

Then open:

`http://localhost:4173`

On macOS you can also run:

```bash
./start.command
```

## Refresh assets

The loader downloads hero portraits and faction icons from `https://www.olden-era.com/en/heroes` and rebuilds the local data files:

```bash
node scripts/fetch-data.mjs
```
