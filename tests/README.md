# Adding Tests

This guide explains how to add new tests to the ICS plugin test suite.

## Test Structure

### Test Files
- `tests/recurring-events.test.ts` - Tests for recurring event functionality
- `tests/icalUtils.test.ts` - Unit tests for icalUtils functions
- `tests/__mocks__/obsidian.ts` - Minimal mock (just exports moment for headless testing)

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode for development
npm run test:coverage   # Generate coverage report
```

## Adding New Tests

### For Recurring Event Issues

When adding tests for recurring event bugs:

1. **Get Real ICS Data**: Use actual ICS content from bug reports when possible
2. **Create Comprehensive Test Cases**: Include both working and broken examples
3. **Test Edge Cases**: Consider timezone transitions, exclusions (EXDATE), and complex recurrence rules

Example structure:
```typescript
describe('New Bug Description', () => {
  it('should handle the specific case that was broken', () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
SUMMARY:Test Event
DTSTART;TZID=America/New_York:20250301T120000
DTEND;TZID=America/New_York:20250301T130000
RRULE:FREQ=WEEKLY;COUNT=3
UID:test-event
END:VEVENT
END:VCALENDAR`;

    const parsedEvents = parseIcs(icsContent);
    const matchingEvents = filterMatchingEvents(parsedEvents, ['2025-03-01'], false);
    
    expect(matchingEvents).toHaveLength(1);
    expect(matchingEvents[0].summary).toBe('Test Event');
  });
});
```

### For Unit Tests

When adding unit tests for individual functions:

1. **Test Function Inputs/Outputs**: Cover different parameter combinations
2. **Test Pure Functions**: Focus on ICS parsing and event filtering logic
3. **Test Error Cases**: Include tests for invalid inputs and error conditions

Example:
```typescript
describe('functionName', () => {
  it('should handle normal case', () => {
    const result = functionName(validInput);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle edge case', () => {
    const result = functionName(edgeCaseInput);
    expect(result).toEqual(expectedEdgeCaseOutput);
  });
});
```

## Best Practices

### ICS Test Data
- Use realistic timezone names (e.g., `America/New_York`, `Pacific Standard Time`)
- Include proper VCALENDAR wrapper with VERSION and PRODID
- Test with both simple and complex recurrence rules
- Include EXDATE properties when testing exclusions

### Test Assertions
- Be specific about what you're testing
- Use descriptive test names that explain the scenario
- Include both positive and negative test cases
- Add debug output for complex timezone calculations

### Debugging Tests
- Use `console.debug()` statements to understand what's happening
- Test with real dates that are relevant to the bug being fixed
- Consider timezone implications when setting test dates

## Common Patterns

### Testing Recurring Events
```typescript
const testDate = '2025-03-01'; // Use specific dates
const matchingEvents = filterMatchingEvents(parsedEvents, [testDate], false);
expect(matchingEvents).toHaveLength(1);
expect(matchingEvents[0].recurrent).toBe(true);
```

### Testing Timezone Handling
```typescript
// Test events that span timezone changes (e.g., DST)
const beforeDST = '2025-03-09';
const afterDST = '2025-03-16';
// Assert times remain consistent despite timezone changes
```

### Testing Exclusions
```typescript
// Test that EXDATE exclusions work properly
const excludedDate = '2025-03-15';
const matchingEvents = filterMatchingEvents(parsedEvents, [excludedDate], false);
expect(matchingEvents).toHaveLength(0); // Should be excluded
```

## Adding Regression Guards

When fixing bugs, add tests that:
1. **Demonstrate the fix works** - Test cases that were previously failing
2. **Prevent future regressions** - Test cases that should continue working
