# Calculation rules

- Use `src/lib/b2Percentage.ts` for B2 percentages in monthly data, period summaries and simulations so every consumer shares the same ceiling without changing source counts.
# AI

- AI suggestions run in the `sugerir-acoes` backend function via `@lovable.dev/ai-gateway`; the browser only sends the selected monthly results, never prompts or keys.
