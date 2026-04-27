import { parseNdefPayload } from '../tagParser';

describe('parseNdefPayload', () => {
  const TAG_ID = 'tag-001';

  it('parses a valid tutoria payload', () => {
    const result = parseNdefPayload('tutoria:module-abc', TAG_ID);
    expect(result.isValid).toBe(true);
    expect(result.moduleId).toBe('module-abc');
    expect(result.tagId).toBe(TAG_ID);
    expect(result.rawData).toBe('tutoria:module-abc');
  });

  it('handles a complex module ID', () => {
    const result = parseNdefPayload('tutoria:module-a-1-phonics', TAG_ID);
    expect(result.isValid).toBe(true);
    expect(result.moduleId).toBe('module-a-1-phonics');
  });

  it('returns invalid for an empty moduleId after prefix', () => {
    const result = parseNdefPayload('tutoria:', TAG_ID);
    expect(result.isValid).toBe(false);
    expect(result.moduleId).toBe('');
  });

  it('returns invalid for an unknown prefix', () => {
    const result = parseNdefPayload('invalid:module-abc', TAG_ID);
    expect(result.isValid).toBe(false);
    expect(result.moduleId).toBe('');
  });

  it('returns invalid for an empty payload', () => {
    const result = parseNdefPayload('', TAG_ID);
    expect(result.isValid).toBe(false);
  });

  it('trims leading and trailing whitespace from the payload', () => {
    const result = parseNdefPayload('  tutoria:module-xyz  ', TAG_ID);
    expect(result.isValid).toBe(true);
    expect(result.moduleId).toBe('module-xyz');
  });

  it('preserves the tagId in the result', () => {
    const result = parseNdefPayload('tutoria:module-1', 'unique-tag-id-999');
    expect(result.tagId).toBe('unique-tag-id-999');
  });
});
