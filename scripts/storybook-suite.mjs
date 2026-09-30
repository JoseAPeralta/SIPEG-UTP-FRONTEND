const ID_SEPARATOR = /[\s,]+/;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStoryId(entry) {
  return isRecord(entry) && typeof entry.id === "string" ? entry.id : null;
}

function editDistance(first, second) {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (const [row, firstCharacter] of [...first].entries()) {
    let diagonal = previous[0];
    previous[0] = row + 1;

    for (const [column, secondCharacter] of [...second].entries()) {
      const above = previous[column + 1];
      previous[column + 1] = Math.min(
        previous[column + 1] + 1,
        previous[column] + 1,
        diagonal + (firstCharacter === secondCharacter ? 0 : 1),
      );
      diagonal = above;
    }
  }

  return previous[previous.length - 1];
}

function suggestClosestId(unknownId, knownIds) {
  let bestId = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of knownIds) {
    const distance = editDistance(unknownId, candidate);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = candidate;
    }
  }

  return bestId !== null && bestDistance <= Math.max(2, Math.floor(unknownId.length / 4))
    ? bestId
    : null;
}

/**
 * Parses the story ids accepted on the command line or through `SIPEG_STORY_IDS`, keeping the
 * first occurrence of each id.
 */
export function parseStoryIdList(raw) {
  if (typeof raw !== "string") {
    return [];
  }

  const seen = new Set();

  for (const value of raw.trim().split(ID_SEPARATOR)) {
    if (value) {
      seen.add(value);
    }
  }

  return [...seen];
}

/** Reads the buildable stories of a Storybook index sorted by id. */
export function readStoryEntries(storybookIndex) {
  if (!isRecord(storybookIndex) || !isRecord(storybookIndex.entries)) {
    throw new Error("The Storybook index must contain an entries object.");
  }

  return Object.values(storybookIndex.entries)
    .filter((entry) => isRecord(entry) && entry.type === "story")
    .map((entry) => ({
      id: readStoryId(entry),
      name: typeof entry.name === "string" ? entry.name : "",
      title: typeof entry.title === "string" ? entry.title : "",
    }))
    .filter((entry) => entry.id !== null)
    .sort((first, second) => first.id.localeCompare(second.id));
}

/**
 * Narrows the stories to test. An empty request keeps every story; an unknown id fails loudly with
 * a suggestion instead of silently producing an empty run.
 */
export function selectStoryEntriesById(storyEntries, requestedIds) {
  if (requestedIds.length === 0) {
    return storyEntries;
  }

  const entriesById = new Map(storyEntries.map((entry) => [entry.id, entry]));
  const unknown = requestedIds.filter((id) => !entriesById.has(id));

  if (unknown.length > 0) {
    const knownIds = [...entriesById.keys()];
    const details = unknown
      .map((id) => {
        const suggestion = suggestClosestId(id, knownIds);

        return suggestion ? `${id} (quiso decir ${suggestion}?)` : id;
      })
      .join(", ");

    throw new Error(
      `Unknown Storybook story ids: ${details}. Use pnpm run storybook:list-stories to see the available ids.`,
    );
  }

  return requestedIds
    .map((id) => entriesById.get(id))
    .sort((first, second) => first.id.localeCompare(second.id));
}

/**
 * Decides whether the static catalog has to be rebuilt. Reusing a build older than the sources
 * would silently test stale stories, so a newer source always forces a rebuild.
 */
export function shouldBuildStorybook({ buildExists, buildTimestamp, newestSourceTimestamp }) {
  if (!buildExists) {
    return true;
  }

  if (newestSourceTimestamp === null) {
    return false;
  }

  return buildTimestamp === null || newestSourceTimestamp > buildTimestamp;
}
