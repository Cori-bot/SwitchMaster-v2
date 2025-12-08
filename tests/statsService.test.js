const assert = require('assert');
const { parseRiotId } = require('../statsService');

function testParseRiotId() {
    // Test case with a Riot ID containing spaces
    const riotIdWithSpaces = 'user name#tag line';
    const expected = {
        name: 'user name',
        tag: 'tag line'
    };
    const actual = parseRiotId(riotIdWithSpaces);

    assert.deepStrictEqual(actual, expected, 'Test Case 1 Failed: Riot ID with spaces should not be encoded');

    console.log('All parseRiotId tests passed!');
}

// Run the test
try {
    testParseRiotId();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
