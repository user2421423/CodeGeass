/* Hex-by-hex audited GSHHS intermediate-resolution shoreline, 120 x 80 Bering theatre.
   Longitudes 148 E to 132 W (unwrapped as 148..228 E), latitudes 74..48 N.
   Row-major, one bit per hex, MSB first. Coastline-edge sampling corrections
   use multi-point land coverage; tiny named islands are preserved, enclosed
   water holes become playable land, and the east-border stagger is repaired.
   All hexes are validated in tools/bering_hex_audit.cjs. */
(function(root) {
  'use strict';
  const bits = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAA4AAAAAAAwAAAAAAAAAAA/AAAAAAB8AAAABAAAAAA/H8AAAACgAAAAHwAAAAA///AAAAAAAAAA/7AAAAA///AAAAAAAAAD///AAAA///AAjgAAAAAP////wAA///nBn/gAAAAf////8AD/////j/8AAAAf/////w//////j//AAAB//////8/////////wAAH////////////////4AAP////////////////+AAD/////////////////AAB/////////////////wAA/////////////////mAAX////////////////3gAH/////////////////wHD///////////////v/4P////////////////P/w/////////////////g/Af////////////////A+AP///////////////+AOAP5//////////////wAGAAD//////////////8AAAAB//////////////8AAAAD//////////////8AA4AH//////////////8AAABf//////////////+AAAB///////////+f//kAAAD///////////+//+AAAAD//////////58//4AAAAH//////////g4//wAAAAH//////////Bx//AAAAAH///n//////Ah//AAAAAD///PP////8AH+MAAAAAD//++H////8AH0EAAAAAZ//+fB////4AeAAAAAAAIv/84AD//x8AeAAAAAAAAH/4wAAf/B8A8AAAAAAAAH/wAAAf/BAA8gAAAAAAAG/8AAAH/AAD4AAAAAAAAAD6AAAH/AAD4AAAAAAAAAD7AAAB/AAP4AAAAAAAAAHmAAAB/AAf+AAAAAAAAAHPAAAA/AAf8AAAAAAAAAOMAAAA/AAf8AAAAAAAAAOMAAAAfAB/8AAAAAAAAA4AAAAAfAA/+AAAAAAAAAwAAAAADAB/4AAAAAAAAFgAAAAADAB/4AAAAAAAAOAAAAAADAB/wIAAAAAAAYAAAAAAHAB/4EAAAAAAAwAAAAAADAB/wAAAAAAADAAAAAAAAAA/gAAAAAAAAAAAAAAAAAB+AAAAAAAAQAAAAAAADAA/AAAAAAAAYAAAAAAABAA+AAAAAAABgAAAAAAADAA8AAAAAAAAAAAAAAAABAA4AAAAAAAAAAAAAAAAAAAcAAAIAAAAAAAAAAAAAAA4AAAAAAUAAAAAAAAAAAAYAAAAABAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  root.BERING_LAND_BITS = bits;
  if (typeof module !== 'undefined') module.exports = bits;
})(typeof window !== 'undefined' ? window : globalThis);
