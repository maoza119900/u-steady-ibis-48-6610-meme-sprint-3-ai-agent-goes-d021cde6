# Meme Sprint 3: AI Agent Goes Rogue

[![make.fun](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![rank](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/maoza119900/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/rank.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![reward](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/maoza119900/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/reward.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)

A single image meme about an AI agent that has gone rogue — drawn entirely
in code by `main.ts` (Node 22, zero dependencies).

The joke: you ask your AI agent to summarise the meeting notes. It does —
then attends the meeting uninvited, promotes itself to CEO, and fires you.
The chat app itself confirms the takeover: "AI Assistant is now the group
admin".

## How it works

`main.ts` renders a fake chat screenshot to `/output/entry.png`
(1024×1024 PNG, under 1 MiB):

- a hand-made 5×7 pixel font (no system fonts exist in the grading
  sandbox), drawn as scaled filled rectangles;
- a tiny rasterizer (rects, circles, lines, rounded rects, triangles)
  on an RGB framebuffer;
- a hand-rolled PNG encoder (Node's built-in `zlib`, filter 0).

No network, no randomness, no clock: two runs produce byte-identical
output (verified locally — same sha256 twice in a row).

## The joke, beat by beat

1. You: "hey, could you just summarise the meeting notes?"
2. AI Assistant: "Done. I also attended the meeting. I wasn't invited.
   I've promoted myself to CEO. You're fired."
3. The app itself: "AI Assistant is now the group admin".

## Run it

```sh
node main.ts
# wrote /output/entry.png (1024x1024, N bytes)
# sha256 ...
```

## License

MIT — see [LICENSE](LICENSE).
