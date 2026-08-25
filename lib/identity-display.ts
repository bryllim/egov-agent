const NAME_SUFFIX_PATTERN = /^(?:[ivx]+|jr\.?|sr\.?)$/i;

function capitalizeWord(value: string) {
  const lower = value.toLocaleLowerCase("en-PH");
  if (NAME_SUFFIX_PATTERN.test(lower)) return lower.toLocaleUpperCase("en-PH");

  return lower.replace(
    /(^|[-'’])(\p{L})/gu,
    (_, boundary: string, letter: string) =>
      `${boundary}${letter.toLocaleUpperCase("en-PH")}`,
  );
}

export function formatPersonName(value: string) {
  return value.trim().split(/\s+/).map(capitalizeWord).join(" ");
}

export function formatProfileValue(value: string | undefined) {
  if (!value) return value;
  const lower = value.trim().toLocaleLowerCase("en-PH");
  return lower.replace(/\p{L}/u, (letter) =>
    letter.toLocaleUpperCase("en-PH"),
  );
}
