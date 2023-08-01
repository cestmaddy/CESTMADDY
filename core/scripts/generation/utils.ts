// #region {SHORT,HOT}CODE REGEX

/*
	(?<!\\)\$ - match $ not preceded by \ (not escaped)
	(\\\$|\$) - match $ or \$ (escaped or not)

	The perfect regex to support any-level nested objects would be:
		{(?:[^{}]|(?R))*} but JS does not support recursive patterns.
	Instead, we need to specify the number of nested levels we want to support
	and generate the regex accordingly.
*/

const NESTED_LEVELS = 50;
export function createNestedRegex(levels = NESTED_LEVELS): string {
	if (levels <= 0) return '';

	const nestedRegex = `(?:[^{}]|${createNestedRegex(levels - 1)})*`;
	return `{${nestedRegex}}`;
}

const NESTED_REGEX_STRING = createNestedRegex();

/* Match a shortcode, but not if it is escaped */
export const SHORTCODE_REGEX_STRING = String.raw`(?<!\\)\$${NESTED_REGEX_STRING}`;
/* Match a hotcode, escaped or not, or the remaining escaped shortcode */
export const HOTCODE_REGEX_STRING = String.raw`(\\\$|\$)(${NESTED_REGEX_STRING})`;

// #endregion {SHORT,HOT}CODE REGEX
