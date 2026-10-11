# Asyq Atu: Kazakh knucklebones on Solana

**Asyq Atu** (Асық ату) is the game every Kazakh kid grew up playing in the aul: knock sheep's
knucklebones (asyqs) out of a chalk ring with your heavy shooter bone, the *saqa*. This is that
game as a quick physics flicker for the browser and phone, built on the
[iDos Games](https://idosgames.com) engine for the Superteam Kazakhstan × iDos Games track.

## How to play

1. Slide your saqa along the throw line, then drag back from it and let go to flick it.
2. Every asyq you knock out of the ring is yours, and you shoot again from where your saqa stopped.
3. If your saqa stops inside the ring it "burns" and the turn passes.
4. When the ring is empty, whoever holds more asyqs wins.

Beat five opponents in turn, from little Erzhan of the aul to Batyrkhan, champion of the Kurultai.
Each one is worth a bigger score multiplier on the weekly leaderboard.

## Saqas

Kids have always "improved" their saqa: dyed it with madder root, or drilled it and poured lead
inside. In the game each saqa is an item with its own weight, which changes how hard it hits:

| Saqa | Weight | How you get it |
| --- | --- | --- |
| Plain | 2.0 | Everyone starts with it |
| Qyzyl (dyed red) | 2.3 | Shop |
| Qorǵasyn (lead-filled) | 3.1 | Shop |
| Altyn (gilded) | 2.8, bouncier | Shop |
| Aidahar (dragon scales) | 3.4 | Shop |

## Solana

- **Wallet sign-in** with Phantom or any Solana wallet.
- **`$ASYQ` SPL token** on Solana mainnet, bridged 1:1 to the in-game premium currency. Deposit it
  to buy saqas, and withdraw what you earn.
- **Weekly leaderboard** with token prizes for the top players. Scores are submitted by the game and
  ranked server-side by iDos.

## How it's built

- iDos Games SDK (`@idosgames/*`): sign-in, lobby, wallet, shop, inventory, quests, leaderboard.
- The game itself is one module, [`src/modules/asyq/`](src/modules/asyq/):
  - `game/physics.ts`: a small deterministic 2D physics engine (fixed step, mass and bounce per body).
  - `game/match.ts`: the rules and the scoring.
  - `game/bot.ts`: opponents plan a shot by simulating many candidate shots on a copy of the table,
    then throw it with a "human hand" (aim and power noise that shrinks up the ladder).
  - `game/render.ts`: all graphics are drawn in code (the bones, the ram-horn carpet border, the chalk).
  - `game/sound.ts`: the clack of bone on bone is synthesised with Web Audio.
- Built with Claude Code over the iDos MCP.

## Run it locally

```bash
npm install
npm run dev        # the full app (needs the game's iDos title id in src/idos.title.ts)
npm run typecheck
npm run build
```
