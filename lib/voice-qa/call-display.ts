type CallAgent = { name: string } | { name: string }[] | null | undefined;

export function formatCallOutcome(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

export function formatCallMeta(agents: CallAgent, createdAt: string) {
  const agent = Array.isArray(agents) ? agents[0]?.name : agents?.name;
  const date = new Date(createdAt).toLocaleDateString("en-US");
  return agent ? `${agent} · ${date}` : date;
}
