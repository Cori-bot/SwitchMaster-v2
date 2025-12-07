const assert = require('assert');

function validateRiotId(riotId) {
  // This regex is a copy of the one in renderer.js
  const riotIdRegex = /^([^#]+)#([^#]+)$/;
  return riotIdRegex.test(riotId);
}

// Test cases
assert.strictEqual(validateRiotId('user#tag'), true, 'Test Case 1 Failed: Valid Riot ID');
assert.strictEqual(validateRiotId('user#'), false, 'Test Case 2 Failed: Missing tag');
assert.strictEqual(validateRiotId('#tag'), false, 'Test Case 3 Failed: Missing username');
assert.strictEqual(validateRiotId('usertag'), false, 'Test Case 4 Failed: Missing #');
assert.strictEqual(validateRiotId('user#tag#extra'), false, 'Test Case 5 Failed: Extra #');
assert.strictEqual(validateRiotId(''), false, 'Test Case 6 Failed: Empty string');

console.log('All validation tests passed!');