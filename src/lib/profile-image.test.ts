import { describe, expect, it } from 'vitest';
import { looksLikeOwnUploadUrl, toSameOriginImageUrl } from './profile-image';

describe('looksLikeOwnUploadUrl', () => {
  it('accepts an upload on either kind with its version stamp', () => {
    expect(looksLikeOwnUploadUrl('/v1/users/kane/avatar?v=0123456789abcdef')).toBe(true);
    expect(
      looksLikeOwnUploadUrl('https://reg.example/api/v1/users/kane/banner?v=abcdef0123456789'),
    ).toBe(true);
  });

  it('rejects a link, a missing version, and a foreign path shape', () => {
    expect(looksLikeOwnUploadUrl('https://cdn.example/users/kane/avatar.png')).toBe(false);
    expect(looksLikeOwnUploadUrl('/v1/users/kane/avatar')).toBe(false);
    expect(looksLikeOwnUploadUrl(null)).toBe(false);
  });
});

describe('toSameOriginImageUrl', () => {
  it('passes through no image and an already same-origin address', () => {
    expect(toSameOriginImageUrl(null, 'https://api.test/v1')).toBeNull();
    expect(toSameOriginImageUrl(undefined, 'https://api.test/v1')).toBeUndefined();
    expect(toSameOriginImageUrl('/api/v1/users/kane/avatar?v=0123456789abcdef', '/api/v1')).toBe(
      '/api/v1/users/kane/avatar?v=0123456789abcdef',
    );
  });

  it('rewrites the API origin onto the public prefix when the base is absolute', () => {
    const base = 'https://api.test/v1';
    expect(
      toSameOriginImageUrl('https://api.test/v1/users/kane/avatar?v=0123456789abcdef', base),
    ).toBe('/api/v1/users/kane/avatar?v=0123456789abcdef');
    expect(toSameOriginImageUrl('/v1/users/kane/avatar?v=0123456789abcdef', base)).toBe(
      '/api/v1/users/kane/avatar?v=0123456789abcdef',
    );
    expect(
      toSameOriginImageUrl('https://api.test/api/v1/users/kane/avatar?v=0123456789abcdef', base),
    ).toBe('/api/v1/users/kane/avatar?v=0123456789abcdef');
  });

  it('leaves an address on the API origin outside the base path alone', () => {
    expect(toSameOriginImageUrl('https://api.test/files/kane.png', 'https://api.test/v1')).toBe(
      'https://api.test/files/kane.png',
    );
  });

  it('leaves a linked address on a foreign host alone', () => {
    expect(
      toSameOriginImageUrl('https://cdn.example/users/kane/avatar.png', 'https://api.test/v1'),
    ).toBe('https://cdn.example/users/kane/avatar.png');
  });

  it('serves an upload through the site even when the base is the public prefix', () => {
    expect(
      toSameOriginImageUrl(
        'https://reg.example/api/v1/users/kane/avatar?v=0123456789abcdef',
        '/api/v1',
      ),
    ).toBe('/api/v1/users/kane/avatar?v=0123456789abcdef');
  });

  it('reads the API base back off an upload address when the page base is relative', () => {
    expect(
      toSameOriginImageUrl(
        'http://localhost:3000/v1/users/kane/avatar?v=f2b793f29742e826',
        '/api/v1',
      ),
    ).toBe('/api/v1/users/kane/avatar?v=f2b793f29742e826');
    expect(
      toSameOriginImageUrl(
        'https://reg.example/api/v1/users/kane/avatar?v=0123456789abcdef',
        '/api/v1',
      ),
    ).toBe('/api/v1/users/kane/avatar?v=0123456789abcdef');
  });

  it('keeps a foreign upload address when an absolute base is set', () => {
    expect(
      toSameOriginImageUrl(
        'https://other.example/api/v1/users/kane/avatar?v=0123456789abcdef',
        'https://api.test/v1',
      ),
    ).toBe('https://other.example/api/v1/users/kane/avatar?v=0123456789abcdef');
  });
});
