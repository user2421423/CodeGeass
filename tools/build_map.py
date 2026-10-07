#!/usr/bin/env python3
"""Rasterize hand-drawn continent outlines onto the Knightmare Conquest world hex grid.

The grid is odd-r offset hexes, 180 columns x 76 rows, wrapping east-west, from 74N to 54S. Odd rows are shifted
half a hex east. Like World Conqueror 4's map, the projection is not uniform: LENSES give Europe, the Mediterranean
and East Asia about twice the hexes per degree and take them from the open oceans and the Arctic, so the countries
that matter keep recognizable shapes without adding hexes. dist/engine.js applies the same projection (hexOf).

Output: the generated block of dist/engine/world.js (WORLD and WORLD_ROWS), one string per row:
  . sea   p plains   f forest   m mountains   d desert   s snow/tundra   x impassable peaks / ice cap

Run:  python3 tools/build_map.py --inject dist/engine/world.js   (prints an ASCII preview on stderr)
Coastlines are hand-drawn for gameplay rather than GIS-precise. FORCE_LAND / FORCE_SEA preserve small islands,
isthmuses and important straits; every edit is given in lon/lat so it survives projection changes.
"""
import bisect
import math
import sys

COLS, ROWS = 180, 76
LON0, LAT0 = -180.0, 74.0
LAT_MIN = -54.0

# Rows of hexes follow latitude only (no row ever tilts): ROW_BANDS give the populated northern mid-latitudes about twice
# the rows per degree of the tropics and the far south, as WC4's Mercator-like map does. (lat centre, half-width at full
# gain, taper, gain); the 76 rows still span 74N-54S, so a gain in one band is paid for by the others.
ROW_BANDS = [
    (68.5, 4.5, 2, -0.29),  # Arctic coasts
    (54, 7, 3, 1.55),  # northern Europe, Russia, Canada
    (39, 5, 3, 1.14),  # the Mediterranean, the United States, Korea and Japan
    (24, 7, 2, 0.02),  # the Sahara, Arabia, northern India
    (-46, 9, 2, -0.59),  # the Southern Ocean
]
# Column lenses: (lon centre, lon half-width at full gain, lon taper, lat centre, lat half-width, lat taper, gain).
# Inside the window a row has (1 + gain) times the hexes per degree of longitude. The lenses come in balanced groups
# that share a latitude window: each enlargement is paid for by compressing open ocean or empty interior beside it on
# the same rows, so every group adds up to zero columns and meridians outside it stay straight. (A window's weight is
# 2 * half-width + taper.) Windows may not cross 180.
LENSES = [
    # Europe and the Mediterranean, paid for by the North Atlantic and the Central Asian steppe.
    (14, 26, 8, 47, 11, 14, 0.5),
    (-33, 14, 6, 47, 11, 14, -0.441),
    (72, 12, 6, 47, 11, 14, -0.5),
    # North America, paid for by the North Pacific.
    (-95, 30, 6, 44, 11, 14, 0.25),
    (-155, 22, 3, 44, 11, 14, -0.351),
    # China's coast, Korea and Japan, paid for by Tibet and the north-west Pacific.
    (130, 13, 6, 37, 10, 10, 0.55),
    (90, 10, 5, 37, 10, 10, -0.352),
    (166, 10, 4, 37, 10, 10, -0.3667),
]


def _ramp(d, inner, taper):
    """Integral of a lens window from -infinity to d: 1 within +-inner, cosine shoulders of width taper."""
    if d <= -inner - taper:
        return 0.0
    if d < -inner:
        s = d + inner + taper
        return s / 2 - taper * math.sin(math.pi * s / taper) / (2 * math.pi)
    if d <= inner:
        return taper / 2 + d + inner
    if d < inner + taper:
        s = d - inner
        return taper / 2 + 2 * inner + s / 2 + taper * math.sin(math.pi * s / taper) / (2 * math.pi)
    return taper + 2 * inner


def _window(d, inner, taper):
    d = abs(d)
    if d <= inner:
        return 1.0
    if d < inner + taper:
        return math.cos(math.pi * (d - inner) / (2 * taper)) ** 2
    return 0.0


def grid_xy(lon, lat):
    """Fractional (column, row) of a point; hex (c, r) is centred on (c + 0.5 + 0.5 * (r & 1), r). Mirrors gridXY()
    in dist/engine.js operation for operation."""
    wraps = math.floor((lon - LON0) / 360)
    lon -= 360 * wraps
    a, a_total = lon - LON0, 360.0
    for lc, lh, lt, tc, th, tt, gain in LENSES:
        w = gain * _window(lat - tc, th, tt)
        base = _ramp(LON0 - lc, lh, lt)
        a += w * (_ramp(lon - lc, lh, lt) - base)
        a_total += w * (_ramp(LON0 + 360 - lc, lh, lt) - base)
    b, b_total = LAT0 - lat, LAT0 - LAT_MIN
    for tc, th, tt, gain in ROW_BANDS:
        top = _ramp(tc - LAT0, th, tt)
        b += gain * (_ramp(tc - lat, th, tt) - top)
        b_total += gain * (_ramp(tc - LAT_MIN, th, tt) - top)
    return COLS * (a / a_total + wraps), (ROWS - 1) * b / b_total


def lonlat_of(c, r):
    """Inverse of grid_xy at a hex centre (Newton steps on each axis)."""
    x, y = c + 0.5 + 0.5 * (r & 1), r
    lon, lat = LON0 + 360 * x / COLS, LAT0 - (LAT0 - LAT_MIN) * y / (ROWS - 1)
    for _ in range(30):
        gx, gy = grid_xy(lon, lat)
        dx = (grid_xy(lon + 0.01, lat)[0] - gx) / 0.01
        dy = (grid_xy(lon, lat - 0.01)[1] - gy) / 0.01
        lon += (x - gx) / dx
        lat -= (y - gy) / dy
    return lon, lat


# ---------------------------------------------------------------- land outlines (lon, lat), clockwise-ish
NORTH_AMERICA = [
    (-166, 68.5), (-162, 70.3), (-156, 71.3), (-150, 70.4), (-142, 69.8), (-136, 69.2), (-130, 70), (-124, 69.6),
    (-117, 68.8), (-110, 68.2), (-104, 68), (-98, 68.4), (-94, 68), (-90, 68.6), (-87, 66.6), (-85, 66),
    (-88, 64.2), (-92, 62.6), (-94.5, 61), (-94.2, 58.8), (-92, 57), (-87, 55.5), (-82.3, 52.9), (-79, 54.5),
    (-78.5, 58.5), (-77.5, 60.5), (-78, 62.4), (-72, 62), (-65, 60.5), (-61, 56.5), (-57, 53.5), (-56, 51.5),
    (-60, 50.2), (-64.5, 49.2), (-66, 45.2), (-61, 45.5), (-65.7, 43.5), (-70, 43.5), (-70, 41.5), (-74, 40.5),
    (-75.5, 37.5), (-76, 35.5), (-79, 33.5), (-81, 31.5), (-80.2, 27), (-80.4, 25.2), (-81.8, 26.2), (-82.7, 28),
    (-84, 30), (-87, 30.3), (-89.5, 29.2), (-94, 29.6), (-97.2, 27.5), (-97.6, 24.5), (-97.4, 21.5), (-96, 19),
    (-94.5, 18.2), (-91, 19), (-90.4, 21), (-87, 21.5), (-87.6, 18.5), (-88.3, 16), (-84, 15.8), (-83.3, 14.5),
    (-83.6, 11), (-82, 9), (-79.5, 9.5), (-77.4, 8.6), (-78, 7), (-80, 7.4), (-82.9, 8.2), (-85.7, 10),
    (-87.5, 13), (-91.5, 14), (-94.5, 16), (-97.5, 16), (-102, 18), (-105.5, 20.5), (-105.5, 23), (-109.2, 25.5),
    (-112.5, 29), (-114.7, 31.5), (-112, 27), (-109.9, 22.9), (-112.1, 24.5), (-114.7, 28), (-116.6, 31.8),
    (-117.2, 32.7), (-120.6, 34.5), (-122.5, 37.7), (-124.2, 40.4), (-124.5, 43), (-124, 46.3), (-124.7, 48.4),
    (-127.5, 50.5), (-130, 54.5), (-134, 57.8), (-137, 58.8), (-140, 59.7), (-145, 60.2), (-149.5, 59.7),
    (-152, 58), (-156, 57), (-162, 55), (-164.5, 54.4), (-158.5, 57.7), (-157.5, 58.8), (-162, 59.9),
    (-164.8, 62.5), (-165, 64.5), (-168, 65.6), (-166, 66.5), (-163.5, 67),
]
BAFFIN = [(-80, 73.5), (-74, 72.5), (-70, 70.5), (-67, 68.5), (-62, 66.8), (-64.5, 65), (-65.5, 62.5), (-71, 62.8),
          (-74.5, 64.5), (-78, 64.4), (-80.5, 67.5), (-82, 69.8), (-85.5, 71.5)]
VICTORIA = [(-119, 71.5), (-111, 73), (-102, 72.5), (-101, 69.5), (-106, 68.8), (-114, 68.9), (-119, 70.5)]
BANKS = [(-125, 71.8), (-121, 74.5), (-116, 73), (-118, 71.4)]
GREENLAND = [(-73, 80), (-73, 76), (-58, 75.8), (-56, 73.5), (-54, 71), (-53.5, 68), (-51, 64), (-49, 61.5),
             (-44, 59.8), (-41, 62), (-38, 65.6), (-31, 68.2), (-25, 70), (-22, 72), (-19, 74.5), (-18, 80)]
ICELAND = [(-24.5, 65.5), (-22, 66.4), (-16, 66.5), (-13.5, 65), (-15, 64.3), (-18.7, 63.4), (-22.7, 63.8)]
CUBA = [(-85, 21.8), (-82, 23.1), (-80, 23.1), (-77, 21.5), (-74.2, 20.2), (-77.5, 19.9), (-80.5, 21.6), (-83.5, 22)]
HISPANIOLA = [(-74.4, 19.8), (-70, 19.9), (-68.4, 18.5), (-71, 17.8), (-74.4, 18.3)]
SOUTH_AMERICA = [
    (-77.4, 8.6), (-75.5, 10.5), (-72, 12), (-71.5, 11), (-68, 10.5), (-64, 10.6), (-61.5, 10.5), (-60, 8.5),
    (-57, 6), (-52, 5), (-50, 1.5), (-49, 0), (-44, -2.5), (-39, -3.5), (-35.2, -5.5), (-35, -9), (-38.5, -13),
    (-39, -17.5), (-40.5, -21.5), (-43, -23), (-48.5, -26), (-48.8, -28.5), (-51, -31), (-53, -33.8),
    (-56.2, -34.9), (-57.5, -36.5), (-57, -38.2), (-62, -39), (-65, -41), (-64, -42.5), (-65.5, -45),
    (-67.5, -46.5), (-65.8, -47.8), (-69, -50.5), (-68.3, -52.4), (-66.5, -55), (-70.5, -55), (-74, -52),
    (-75.5, -48), (-74, -44), (-73.5, -41.5), (-73.6, -37), (-71.6, -33), (-71.4, -30), (-70.3, -23.5),
    (-70.3, -18.5), (-75.5, -15), (-77.2, -12), (-79.5, -7.5), (-81.2, -5), (-80.5, -2), (-80, 0.5), (-79, 1.5),
    (-78, 2.8), (-77.3, 4), (-77.6, 7),
]
EURASIA = [
    (-5.6, 36.0), (-2, 36.7), (0.2, 38.8), (-0.3, 39.5), (0.8, 41), (3.2, 41.9), (3.1, 43.0), (4.8, 43.4),
    # Italy: drawn a little broader than life (as WC4 does) so the boot reads at hex scale.
    (7.5, 43.8), (8.9, 44.4), (9.8, 44.0), (10.3, 43.4), (10.5, 42.8), (11.6, 42.2), (12.3, 41.6), (13.4, 41.1),
    (14.2, 40.7), (14.8, 40.4), (15.4, 39.9), (15.8, 39.2), (15.6, 38.4), (15.7, 37.8), (16.3, 38.2), (16.8, 38.7),
    (17.3, 39.1), (16.9, 39.7), (17.3, 40.3), (18.0, 39.9), (18.6, 39.9), (18.6, 40.4), (17.9, 40.8), (16.9, 41.3),
    (16.2, 41.6), (16.3, 42.0), (15.0, 42.1), (14.2, 42.6), (13.6, 43.6), (12.6, 44.1), (12.5, 44.9), (12.3, 45.4),
    (13.7, 45.7),
    # The Balkans and Greece.
    (14.5, 45.2), (15.2, 44.2), (17.4, 43.0), (19.4, 41.9), (19.3, 40.5), (20.0, 39.6), (20.7, 39.0), (21.1, 38.3),
    (21.3, 37.6), (21.6, 36.8), (22.4, 36.4), (23.1, 36.4), (23.0, 37.2), (24.1, 37.6), (24.3, 38.3), (23.3, 39.0),
    (22.7, 39.6), (22.6, 40.2), (22.9, 40.6), (23.8, 40.1), (24.0, 40.7), (24.4, 40.9),
    (26, 40.8), (26.2, 39.5), (27.2, 37.6), (28.2, 36.7), (30.5, 36.3), (32.5, 36.1), (34.5, 36.8), (36, 36.6),
    (35.8, 35.0), (35.5, 33.8), (34.8, 32), (34.3, 31.3), (34.5, 29.5), (36.5, 26), (39, 21.5), (41.5, 16.5),
    (43.3, 12.7), (45, 12.8), (49, 14.2), (52.2, 15.6), (55.5, 17.5), (57.7, 18.9), (59.8, 22.5), (58.5, 23.6),
    (56.3, 24.8), (56.3, 26.3), (54, 24.2), (51.6, 24.6), (51.5, 25.9), (50, 26.5), (48.5, 28), (48, 29.9),
    (50.3, 30.0), (51, 28.8), (54, 26.6), (56.4, 27.1), (57.5, 25.7), (61.6, 25.2), (66.6, 25.4), (68.2, 23.7),
    (70.3, 22.9), (69, 22.4), (72.6, 21.1), (72.8, 19.0), (73.7, 15.5), (75, 12.8), (76.3, 9.9), (77.5, 8.1),
    (79, 9.2), (80.3, 13.1), (82.2, 16.6), (86.6, 20.3), (88.3, 21.6), (90.5, 22.3), (92.3, 20.7), (94.2, 16.0),
    (97.6, 16.5), (98.2, 13.2), (98.5, 10.0), (98.3, 8.2), (100.3, 5.4), (101.3, 2.9), (103.5, 1.3), (104.2, 1.8),
    (103.4, 4.5), (102.3, 6.2), (100.4, 7.4), (99.9, 9.3), (99.2, 10.5), (100, 12.7), (100.9, 13.4), (102.3, 12.2),
    (103, 11), (104.8, 8.6), (106.7, 10.4), (109.2, 11.6), (109.4, 13.8), (108.3, 15.8), (106.5, 18), (105.7, 19),
    (106.7, 20.8), (108.5, 21.6), (110, 20.3), (111, 21.5), (113.5, 22.2), (116.5, 23), (119, 25.5), (120.3, 27.5),
    (121.9, 29.9), (121.8, 31), (120.8, 32.5), (119.5, 34.5), (120.4, 36.1), (122.5, 37.4), (119, 37.2),
    (118, 38.5), (117.7, 39), (119.5, 39.8), (121.5, 40.8), (121.2, 38.8), (123.5, 39.8), (124.4, 40.1),
    (125.2, 38.0), (126.5, 37.5), (126.4, 34.8), (127.6, 34.6), (129.1, 35.1), (129.4, 36.5), (128.6, 38.5),
    (127.5, 39.8), (129.8, 41), (130.7, 42.3), (131.9, 43.1), (135.5, 43.9), (138.5, 47.2), (140.5, 50),
    (141.4, 52.2), (140.6, 53.5), (137.5, 54), (135.2, 54.7), (138, 56.5), (142, 59.2), (148.5, 59.4),
    (152.5, 59), (155, 59.3), (157, 61.5), (160.4, 61.9), (163, 61.7), (156.4, 57.5), (155.6, 54.5),
    (156.7, 51), (158.6, 52.9), (160, 54.5), (162.2, 56.2), (163.3, 57.8), (164.5, 59.9), (170, 60),
    (173.5, 61.8), (178, 62.3), (182, 64.7), (186.5, 64.3), (190.3, 65.8), (188, 66.8), (185, 67.2), (180, 69),
    (175, 69.8), (170, 70.1), (160, 69.7), (152, 70.9), (146, 72.3), (140, 72.5), (130, 71), (128.5, 72.5),
    (120, 73), (113, 73.6), (110, 76), (100, 77), (80, 75), (70, 73), (66, 69), (60, 69), (55, 68.3), (45, 68.5),
    (44, 66.3), (40, 64.6), (37, 66.2), (41, 67), (33, 69.4), (28, 70.7), (25.8, 71.1), (19, 70), (14, 68),
    (12.5, 65.5), (10, 64), (7, 62.6), (5, 61), (5.3, 59.3), (6, 58.1), (7.0, 57.9), (8.5, 58.3), (10.5, 59.2),
    (11, 58.9), (11.2, 58.3), (12.5, 56.3), (14.3, 55.4), (16, 56.2), (16.5, 57.5), (18.9, 59.3), (17.5, 60.6),
    (17.3, 62.5), (21, 64.5), (22.5, 65.8), (25.3, 65), (24.6, 64.6), (21.4, 63), (21.4, 61), (22.3, 60.3),
    (25, 60.2), (28, 60.5), (30, 59.9), (28, 59.4), (24, 59.3), (23.4, 58.6), (24.2, 57.4), (24.1, 57.0),
    (21.0, 56.8), (21.1, 55.6), (19.6, 54.4), (18.6, 54.4), (16, 54.3), (14, 53.9), (11, 54), (10, 54.5),
    (10.3, 56.2), (10.6, 57.7), (8.6, 57.1), (8.1, 55.5), (8.7, 53.9), (7, 53.5), (4.8, 52.9), (4.3, 52),
    (3.1, 51.3), (1.6, 50.9), (0.1, 49.7), (-1.6, 49.7), (-4.8, 48.4), (-2.2, 47.2), (-1.2, 46), (-1.4, 44.3),
    (-1.8, 43.4), (-4, 43.5), (-8.2, 43.6), (-9.3, 43.0), (-8.9, 41.2), (-9.5, 38.7), (-8.9, 37.0), (-7.4, 37.2),
    (-6.3, 36.5),
]
BLACK_SEA = [(28, 41.2), (28.6, 43.4), (29.6, 45.2), (30.7, 46.5), (32.5, 46.1), (33.5, 44.4), (36.5, 45.2),
             (37.8, 44.7), (39.7, 43.5), (41.6, 41.6), (37, 41.2), (35.2, 42), (31, 41.1)]
CASPIAN = [(47, 44.5), (47.5, 46.5), (49.5, 46.8), (51.5, 47), (53, 45.5), (51.5, 44.3), (52.8, 42), (53.5, 40),
           (53.9, 37.4), (51, 36.7), (49, 37.6), (49.4, 40.3), (48, 42), (47.5, 43)]
AFRICA = [
    (-5.9, 35.8), (-2, 35.1), (3, 36.8), (8.6, 36.9), (10.2, 37.2), (11.1, 35.2), (10.2, 34.1), (11.5, 33.1),
    (15.2, 32.3), (19.2, 30.3), (20.1, 32.1), (23.1, 32.6), (25.2, 31.6), (29.9, 31.2), (32.3, 31.3),
    (34.2, 31.3), (34.9, 29.5), (32.6, 29.9), (33.9, 27.2), (35.6, 23.9), (37.2, 21), (37.2, 19.6), (38.6, 18),
    (40.1, 15.6), (43.1, 12.7), (44, 10.6), (51.2, 11.8), (51, 10.4), (49.6, 6.6), (47.8, 4.1), (45.3, 2.0),
    (42.5, -0.7), (40.1, -3.5), (39.2, -6.8), (40.4, -10.5), (40.6, -14.9), (36.9, -17.9), (34.8, -19.8),
    (35.5, -22.1), (32.9, -25.9), (32.4, -28.6), (31, -29.9), (27.9, -33), (25.6, -34), (22, -34.1),
    (18.5, -34.4), (17.9, -32.8), (16.5, -28.6), (15.2, -26.6), (14.4, -22.9), (11.8, -17.3), (12.3, -13.8),
    (13.2, -8.8), (12.2, -6), (9.4, -0.6), (9.6, 3.8), (8.5, 4.5), (6.3, 4.3), (3.4, 6.4), (1.2, 6.1),
    (-1.7, 4.9), (-4.0, 5.3), (-7.6, 4.4), (-10.8, 6.4), (-13.2, 8.5), (-15.2, 11), (-16.8, 13.8),
    (-17.5, 14.7), (-16.5, 19.4), (-17.1, 20.9), (-16, 23.7), (-14.5, 26.2), (-12.9, 27.9), (-9.8, 29.9),
    (-9.7, 32.3), (-6.8, 34),
]
MADAGASCAR = [(49.3, -12), (50.5, -15.5), (49.4, -17.8), (47.2, -24.8), (45.1, -25.5), (43.6, -23.4), (44, -20),
              (44.4, -16.2), (47.2, -13.6)]
# Great Britain and Ireland follow the real coast (Cornwall, Wales, the Highlands, East Anglia); the Channel, the
# Irish Sea and the North Channel are held open by CHANNELS below.
BRITAIN = [(-5.7, 50.05), (-5.1, 49.95), (-4.1, 50.3), (-3.4, 50.55), (-2.4, 50.55), (-1.3, 50.7), (-0.1, 50.75),
           (1.0, 50.95), (1.45, 51.35), (0.8, 51.55), (1.3, 51.95), (1.75, 52.5), (1.3, 52.95), (0.3, 52.85),
           (0.1, 53.6), (-0.1, 54.15), (-0.6, 54.5), (-1.4, 55.0), (-2.0, 55.8), (-2.6, 56.05), (-2.6, 56.3),
           (-2.1, 57.1), (-1.8, 57.5), (-2.0, 57.7), (-3.5, 57.7), (-4.2, 57.55), (-3.9, 57.85), (-3.1, 58.45),
           (-3.0, 58.65), (-5.0, 58.65), (-5.4, 58.1), (-5.7, 57.6), (-6.3, 57.5), (-5.8, 56.9), (-6.2, 56.5),
           (-5.7, 56.0), (-5.8, 55.3), (-4.9, 55.7), (-4.6, 55.4), (-5.1, 54.8), (-4.4, 54.7), (-3.5, 54.95),
           (-3.6, 54.5), (-3.0, 54.1), (-3.0, 53.4), (-3.9, 53.3), (-4.6, 53.35), (-4.7, 52.8), (-4.1, 52.45),
           (-4.4, 52.15), (-5.3, 51.9), (-5.0, 51.65), (-4.0, 51.55), (-3.2, 51.4), (-2.7, 51.5), (-3.5, 51.2),
           (-4.5, 51.0), (-4.95, 50.55)]
IRELAND = [(-6.0, 52.15), (-6.0, 53.0), (-6.1, 53.6), (-6.0, 54.0), (-5.5, 54.3), (-5.7, 54.8), (-6.2, 55.2),
           (-7.3, 55.35), (-8.3, 55.15), (-8.6, 54.6), (-9.9, 54.25), (-10.1, 53.55), (-9.4, 53.1), (-9.9, 52.6),
           (-10.4, 52.1), (-10.1, 51.6), (-9.0, 51.5), (-7.7, 51.95)]
# Japan: Honshu, Kyushu, Shikoku and Hokkaido, a little broader than life. CHANNELS keep the Tsugaru Strait and the
# Inland Sea open; LAND_BRIDGES keep Kyushu joined to Honshu at Shimonoseki, as the coarser maps did.
HONSHU = [(130.9, 33.9), (131.4, 34.45), (132.7, 35.45), (134.2, 35.6), (136.0, 35.75), (136.7, 36.9), (137.1, 37.55),
          (137.4, 37.0), (138.5, 37.6), (139.1, 38.0), (139.8, 39.2), (139.7, 39.95), (140.0, 40.7), (140.3, 41.3),
          (141.4, 41.45), (141.5, 40.5), (142.1, 39.5), (141.6, 38.4), (141.0, 38.0), (141.1, 37.0), (140.9, 35.7),
          (140.0, 34.9), (139.8, 35.3), (139.0, 34.6), (138.2, 34.55), (136.9, 34.25), (135.8, 33.4), (135.1, 33.9),
          (135.3, 34.6), (133.9, 34.4), (132.4, 34.2), (131.6, 33.95)]
KYUSHU = [(129.7, 33.4), (130.4, 33.75), (131.0, 33.95), (131.75, 33.3), (131.6, 32.4), (131.4, 31.4), (130.7, 30.95),
          (130.2, 31.3), (130.1, 32.0), (129.75, 32.6), (129.6, 33.1)]
SHIKOKU = [(132.3, 33.85), (133.5, 34.3), (134.6, 34.25), (134.75, 33.8), (134.2, 33.2), (133.5, 33.45), (132.95, 32.75),
           (132.4, 33.15)]
HOKKAIDO = [(140.0, 41.6), (140.0, 42.6), (140.5, 43.2), (141.4, 43.3), (141.6, 43.95), (141.7, 45.45), (142.6, 44.8),
            (143.9, 44.15), (145.3, 44.35), (145.6, 43.3), (144.4, 42.95), (143.3, 41.95), (141.7, 42.6), (141.0, 42.3),
            (140.7, 41.75)]
SAKHALIN = [(141.8, 46), (142.3, 50), (142.5, 54.4), (143.5, 49), (142.8, 46.6)]
TAIWAN = [(120.15, 23.0), (120.25, 23.7), (121.05, 25.1), (121.65, 25.3), (121.95, 24.6), (121.55, 22.8),
          (120.85, 21.9), (120.6, 22.3)]
# Mediterranean islands: Sicily, Sardinia, Corsica, Mallorca, Crete and Cyprus.
SICILY = [(12.4, 38.05), (13.35, 38.2), (14.5, 38.05), (15.6, 38.3), (15.2, 37.5), (15.3, 37.0), (15.1, 36.6),
          (14.4, 36.75), (13.5, 37.15), (12.45, 37.6)]
SARDINIA = [(8.2, 40.95), (9.2, 41.25), (9.7, 40.9), (9.75, 40.0), (9.6, 39.1), (9.05, 39.15), (8.55, 38.9),
            (8.35, 39.1), (8.45, 39.9), (8.3, 40.55)]
CORSICA = [(9.35, 43.0), (9.5, 42.6), (9.55, 42.1), (9.25, 41.4), (8.75, 41.6), (8.6, 42.05), (8.65, 42.55),
           (9.3, 42.7)]
MALLORCA = [(2.3, 39.6), (3.1, 39.95), (3.5, 39.7), (3.2, 39.3), (2.7, 39.45)]
CRETE = [(23.5, 35.65), (24.2, 35.6), (25.0, 35.45), (26.3, 35.3), (26.2, 34.95), (24.7, 34.9), (23.6, 35.15)]
CYPRUS = [(32.3, 35.1), (33.0, 35.4), (34.6, 35.7), (34.0, 35.0), (33.0, 34.55), (32.4, 34.7)]
HAINAN = [(110.5, 18.2), (108.7, 19.5), (110.6, 20.1), (111, 19.6)]
SRI_LANKA = [(79.9, 9.8), (81.9, 7.4), (80.6, 5.9), (79.8, 7.2)]
LUZON = [(120.6, 18.5), (122.3, 18.4), (121.6, 15.8), (124, 12.9), (120.6, 13.8), (120, 16)]
MINDANAO = [(122, 7), (126.6, 7.3), (125.5, 9.8), (123.5, 8.5)]
SUMATRA = [(95.3, 5.6), (97.5, 5.2), (100.4, 2.2), (104, -1), (106, -3), (105.9, -5.8), (104.6, -5.9),
           (102.3, -4), (100.4, -1), (98.7, 1.7)]
JAVA = [(105.2, -6.8), (106.8, -6.1), (110.4, -6.9), (112.7, -6.9), (114.4, -7.8), (114.5, -8.7), (110.4, -8.1),
        (106.4, -7.4)]
BORNEO = [(109, 1.5), (111.3, 2.7), (115, 5), (116.8, 7), (119.3, 5.2), (117.9, 1.5), (116.5, -1), (116.2, -3.8),
          (114.5, -3.6), (111.8, -3), (110.2, -2.9), (109.1, -0.4)]
SULAWESI = [(119.5, -5.5), (120.5, -1), (124.9, 1.5), (121, 1.2), (123.3, -1), (121.5, -4.5)]
NEW_GUINEA = [(131, -1.4), (134, -1), (137.8, -1.5), (141, -2.6), (145.8, -5.1), (147.5, -6.1), (150.8, -10.3),
              (147.2, -10), (144.2, -7.7), (141, -9.1), (138, -8.4), (137.5, -5), (133, -4.3), (131.5, -2.5)]
AUSTRALIA = [(113.6, -22), (114, -26.2), (115, -29.5), (115.7, -32), (115, -33.6), (117.9, -35.1), (123.5, -33.9),
             (129, -31.6), (132, -32), (135.3, -34.6), (137.7, -33), (138.1, -35.6), (140.5, -38), (143.6, -38.8),
             (146.3, -39.1), (150, -37.5), (151.2, -33.9), (153.1, -30), (153.6, -28.2), (153.1, -25),
             (150.8, -22.6), (149.2, -21), (146.8, -19.2), (145.8, -16.9), (145.3, -14.9), (143.5, -12),
             (142.5, -10.7), (141.6, -12.8), (141.4, -16.5), (140.8, -17.5), (139.3, -17.4), (137, -15.9),
             (135.9, -14.9), (136.7, -12.2), (132.6, -11.5), (130.8, -12.4), (129.5, -15), (127.2, -13.9),
             (125, -15.5), (122.2, -17.9), (118.8, -20.3), (114.5, -21.8)]
TASMANIA = [(144.7, -40.7), (148.3, -40.9), (148, -43.2), (146.8, -43.6), (145.2, -42.2)]
NZ_NORTH = [(172.7, -34.4), (174.8, -36.9), (178.5, -37.7), (177.9, -39.3), (176.8, -40.3), (174.8, -41.3),
            (173.8, -39.2), (174.6, -37)]
NZ_SOUTH = [(172.7, -40.5), (174.3, -41.7), (173.0, -43.8), (171.2, -44.4), (169.3, -46.6), (166.5, -45.8),
            (168.3, -44), (171.5, -41.8)]

def swell(poly, d):
    """Push an outline's vertices d degrees outward, as WC4 draws small islands a little larger than life."""
    area = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]))
    side = 1 if area > 0 else -1  # counter-clockwise outlines have their outside on the right of each edge
    out = []
    for i, (x, y) in enumerate(poly):
        (px, py), (nx, ny) = poly[i - 1], poly[(i + 1) % len(poly)]
        ex, ey = nx - px, ny - py
        n = math.hypot(ex, ey) or 1
        out.append((x + side * d * ey / n, y - side * d * ex / n))
    return out


# Italy's boot again, swollen over the mainland outline so the peninsula is three hexes wide as on WC4's map.
ITALY = [(7.6, 44.1), (8.9, 44.4), (9.8, 44.0), (10.3, 43.4), (10.5, 42.8), (11.6, 42.2), (12.3, 41.6), (13.4, 41.1),
         (14.2, 40.7), (14.8, 40.4), (15.4, 39.9), (15.8, 39.2), (15.6, 38.4), (15.7, 37.9), (16.3, 38.2),
         (16.8, 38.7), (17.3, 39.1), (16.9, 39.7), (17.3, 40.3), (18.0, 39.9), (18.5, 40.0), (18.5, 40.3), (17.9, 40.8),
         (16.9, 41.3), (16.2, 41.6), (16.3, 42.0), (15.0, 42.1), (14.2, 42.6), (13.6, 43.6), (12.6, 44.1), (12.4, 44.8),
         (11.0, 45.0), (9.0, 45.0)]
# Denmark's islands: Zealand (Copenhagen) and Funen.
ZEALAND = [(10.9, 55.75), (11.7, 56.0), (12.55, 56.05), (12.6, 55.6), (12.15, 55.2), (11.2, 55.2)]
FUNEN = [(9.75, 55.5), (10.5, 55.6), (10.85, 55.1), (10.0, 55.05)]

# Banks, Victoria and Baffin islands are left out: the Canadian Arctic is simplified for gameplay.
LAND = [NORTH_AMERICA, GREENLAND, ICELAND, CUBA, HISPANIOLA, SOUTH_AMERICA, EURASIA, AFRICA, MADAGASCAR, BRITAIN,
        IRELAND, ZEALAND, FUNEN, SAKHALIN, BORNEO, SULAWESI, NEW_GUINEA, AUSTRALIA, TASMANIA, NZ_NORTH, NZ_SOUTH]
LAND += [swell(p, 0.3) for p in (HONSHU, KYUSHU, SHIKOKU, HOKKAIDO, SICILY, SARDINIA, CORSICA, CRETE, CYPRUS)]
LAND += [swell(p, 0.35) for p in (ITALY, TAIWAN, HAINAN, SRI_LANKA, LUZON, MINDANAO, MALLORCA)]
LAND += [swell(p, 0.15) for p in (SUMATRA, JAVA)]
WATER = [BLACK_SEA, CASPIAN]

# ---------------------------------------------------------------- biomes, painted in order (later wins)
BIOMES = [
    # Forest belts (density keeps open routes between them).
    ('f', 0.55, [(-140, 64), (-120, 62), (-100, 60), (-80, 56), (-65, 52), (-57, 52), (-63, 46), (-80, 46),
                 (-95, 49), (-120, 54), (-140, 60)]),  # Canadian taiga
    ('f', 0.45, [(-95, 30), (-85, 30), (-77, 36), (-70, 45), (-80, 45), (-90, 40), (-95, 35)]),  # eastern US
    ('f', 0.7, [(-79, 0), (-70, 4), (-60, 5), (-50, 0), (-48, -5), (-55, -10), (-63, -13), (-72, -12),
                (-76, -6)]),  # Amazon
    ('f', 0.7, [(9, 4), (18, 5), (28, 4), (30, -2), (26, -6), (17, -5), (12, -2)]),  # Congo
    ('f', 0.45, [(-12, 9), (-5, 8), (5, 7), (9, 5), (-1, 5), (-8, 5)]),  # Guinea coast
    ('f', 0.6, [(92, 26), (102, 24), (108, 21), (109, 12), (100, 6), (100, 13), (95, 16)]),  # Indochina
    ('f', 0.7, [(94, 7), (120, 7), (152, -11), (131, -11), (100, -9)]),  # Indonesia and New Guinea
    ('f', 0.5, [(32, 62), (60, 58), (80, 58), (100, 58), (120, 58), (135, 57), (135, 52), (120, 52), (100, 53),
                (80, 55), (60, 55), (40, 57)]),  # Siberian taiga
    ('f', 0.35, [(8, 50), (25, 52), (30, 57), (22, 58), (12, 54)]),  # central European woods
    ('f', 0.5, [(10, 59), (30, 61), (30, 66), (20, 66), (14, 62)]),  # Scandinavian forest
    # Deserts.
    ('d', 0.85, [(-17, 21), (-13, 27.5), (-8, 30), (0, 31.5), (10, 32), (20, 30.5), (30, 30.5), (33, 23), (37, 18),
                 (32, 15), (23, 15), (15, 16), (5, 17), (-5, 17), (-16, 17)]),  # Sahara
    ('d', 0.85, [(36, 30), (46, 32), (48, 29), (51, 24), (56, 22), (55, 17), (48, 15), (43, 17), (39, 22)]),  # Arabia
    ('d', 0.7, [(55, 33), (62, 34), (70, 28), (72, 25), (66, 26), (58, 27)]),  # Iran and Thar
    ('d', 0.7, [(52, 42), (62, 45), (68, 43), (64, 38), (55, 38)]),  # Karakum
    ('d', 0.85, [(76, 40), (88, 41), (91, 39), (84, 37), (77, 37.5)]),  # Taklamakan
    ('d', 0.8, [(92, 44), (102, 45), (112, 44), (116, 42), (108, 40), (100, 39), (94, 41)]),  # Gobi
    ('d', 0.7, [(12, -17), (20, -18), (24, -24), (21, -28), (16, -28), (13, -23)]),  # Kalahari
    ('d', 0.8, [(115, -21), (125, -18), (136, -20), (141, -26), (138, -31), (129, -30), (120, -29),
                (116, -26)]),  # Outback
    ('d', 0.6, [(-118, 36), (-111, 37), (-105, 33), (-106, 28), (-112, 29), (-117, 33)]),  # Mojave and Sonora
    # Mountains.
    ('m', 0.8, [(-124, 60), (-118, 60), (-110, 48), (-105, 40), (-104, 32), (-108, 31), (-114, 38), (-120, 48),
                (-126, 56)]),  # Rockies
    ('m', 0.6, [(-152, 63), (-140, 63), (-140, 60), (-152, 60)]),  # Alaska Range
    ('m', 0.6, [(-108, 28), (-104, 28), (-98, 20), (-100, 18), (-104, 22)]),  # Sierra Madre
    ('m', 0.9, [(-80, 0), (-77, 0), (-75, -10), (-68, -15), (-66, -23), (-69, -35), (-71, -45), (-73, -50),
                (-75, -50), (-73, -40), (-71, -30), (-70, -20), (-76, -12), (-80, -4)]),  # Andes
    ('m', 0.7, [(-78, 0), (-74, 0), (-72, 8), (-75, 8)]),  # Colombian Andes
    ('m', 0.85, [(5, 46), (16, 47.5), (16, 46), (7, 44)]),  # Alps
    ('m', 0.85, [(39, 44), (48, 41), (46, 40.5), (39, 42.5)]),  # Caucasus
    ('m', 0.6, [(44, 38), (48, 38), (57, 28), (54, 27), (46, 33)]),  # Zagros
    ('m', 0.85, [(73, 36), (80, 37), (90, 36.5), (100, 34), (103, 30), (98, 27), (92, 27), (85, 28), (78, 30.5),
                 (74, 34)]),  # Tibet
    ('m', 0.75, [(66, 36), (72, 39), (80, 43), (86, 44), (80, 41), (74, 37), (68, 34.5)]),  # Pamir and Tian Shan
    ('m', 0.6, [(85, 52), (90, 52), (92, 48), (88, 48)]),  # Altai
    ('m', 0.6, [(36, 14), (40, 14), (42, 8), (38, 6), (35.5, 9)]),  # Ethiopian highlands
    ('m', 0.6, [(-9, 30), (-4, 34), (3, 35.5), (9, 35.5), (0, 33), (-6, 30.5)]),  # Atlas
    ('m', 0.6, [(5, 59), (9, 63), (14, 66), (19, 69.5), (17, 68), (12, 63), (8, 60)]),  # Scandinavian ridge
    ('m', 0.5, [(58, 51), (61, 51), (62, 60), (64, 67), (61, 67), (59, 60)]),  # Urals
    ('m', 0.6, [(130, 66), (140, 67), (150, 66), (160, 64), (150, 61), (135, 62)]),  # Verkhoyansk and Kolyma
    # Tundra and ice.
    ('s', 1.0, [(-180, 66.5), (180, 66.5), (180, 80), (-180, 80)]),
    ('s', 1.0, [(180, 66.5), (200, 66.5), (200, 80), (180, 80)]),
    ('s', 1.0, [(-90, 59), (-60, 59), (-60, 66.5), (-90, 66.5)]),  # Hudson Bay shore and Labrador
    ('s', 1.0, [(-73, 59), (-18, 59), (-18, 80), (-73, 80)]),  # Greenland
]
# Hexes painted after rasterizing, by (lon, lat) of a point inside them.
PEAKS = [
    (76, 33.5), (78, 32), (80, 31), (82, 30.5), (84, 29.5), (86, 29), (88, 28.5), (90, 29),
    (92, 28.5), (94, 30), (98, 31.5),
]  # the high Himalaya: an impassable core with routes around its western/eastern ends
ICE_CAP = [(-42, 72), (-38, 68), (-44, 66), (-48, 70)]  # Greenland interior: impassable

# Deterministic strategic terrain anchors. The biome polygons supply texture; these guarantee that major real-world
# barriers remain legible and tactically meaningful on the grid.
FORCE_TERRAIN = {
    'm': [
        # Alps / Carpathians
        (7, 46.5), (10, 47), (13, 47), (16, 47), (22, 47), (25, 47),
        # Caucasus / Zagros
        (41, 43), (44, 42), (47, 41), (47, 35), (50, 32), (53, 29),
        # Urals
        (59, 52), (60, 55), (61, 58), (62, 61),
        # Andes
        (-75, -5), (-73, -12), (-70, -20), (-69, -28), (-71, -35), (-72, -42),
        # Korea
        (127, 37), (128.5, 39),
    ],
    'd': [
        # Sahara / Arabia
        (-10, 24), (0, 25), (10, 25), (20, 24), (30, 23), (40, 22), (47, 23), (53, 22),
        # Taklamakan / Gobi and Australian interior
        (82, 39), (100, 43), (120, -24), (128, -24), (136, -25),
    ],
    'f': [
        # Malay peninsula: slow, defensible jungle corridor (points follow the narrow high-resolution land spine).
        (100, 10.85), (100, 7.4), (101, 5.7), (102, 4),
    ],
}


class Shape:
    """A lon/lat outline projected onto the grid. Edges are subdivided first so they follow the lenses' curvature."""

    def __init__(self, poly, step=0.5):
        pts = []
        for i, (x1, y1) in enumerate(poly):
            x2, y2 = poly[(i + 1) % len(poly)]
            n = max(1, math.ceil(max(abs(x2 - x1), abs(y2 - y1)) / step))
            pts += [grid_xy(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n) for k in range(n)]
        self.pts, self.rows = pts, {}

    def crossings(self, y):
        xs = self.rows.get(y)
        if xs is None:
            xs, pts = [], self.pts
            for i, (x1, y1) in enumerate(pts):
                x2, y2 = pts[i - 1]
                if (y1 > y) != (y2 > y):
                    xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
            xs.sort()
            self.rows[y] = xs
        return xs

    def contains(self, x, y):
        return bisect.bisect_right(self.crossings(y), x) & 1 == 1


def is_land(x, y):
    for xx in (x, x + COLS, x - COLS):
        if any(s.contains(xx, y) for s in WATER_SHAPES):
            return False
        if any(s.contains(xx, y) for s in LAND_SHAPES):
            return True
    return False


def in_region(shape, x, y):
    return any(shape.contains(xx, y) for xx in (x, x + COLS, x - COLS))


def hash01(c, r, salt):
    v = math.sin(c * 127.1 + r * 311.7 + salt * 74.7) * 43758.5453
    return v - math.floor(v)


def hex_of(lon, lat):
    # Same rounding as hexOf() in dist/engine.js (JS Math.round, not Python's banker's rounding).
    x, y = grid_xy(lon, lat)
    r = max(0, min(ROWS - 1, math.floor(y + 0.5)))
    c = math.floor(x - 0.5 - 0.5 * (r & 1) + 0.5)
    return c % COLS, r


# Islands, coasts and isthmuses that the raster would lose, as (lon, lat) points inside the hex to make land.
FORCE_LAND = [
    (-157.9, 21.3),  # Oahu (Pearl Harbor)
    (123, 12.56), (124, 10.85), (118, 10.85), (120.9, 14.6), (125, 8),  # Philippines: Visayas, Palawan, Luzon, Mindanao
    (69, 22.8),  # India: Gujarat
    (103.8, 1.4), (101.5, 4.5), (100.0, 10.85),  # Singapore, Malaya and the Kra Isthmus
    (79.9, 7.0), (47.5, -19), (-21.9, 64.1), (-51.7, 64.2),  # Sri Lanka, Madagascar, Iceland, Nuuk
    (174.8, -37), (172, -43.5), (147, -42), (142.7, 49.5),  # New Zealand, Tasmania, Sakhalin
    (152, -33.5), (154, -26.7), (115, -31.8), (130, -13.05), (-66, -54),  # Australian coasts, Cape Horn
    (-82.4, 23.1), (-79.5, 9.0), (-87, 14), (-99.1, 19.4),  # Cuba, Panama, Central America, Mexico
    (158.6, 53.0), (-150, 61.2), (-166, 66),  # Kamchatka, Alaska
    (35.5, 33.9), (33, 30),  # Levant, Sinai
    (147.2, -9.4), (106.8, -6.2), (110, -7.3),  # Port Moresby, Java
]
FORCE_SEA = [
    (-168.9, 65.9),  # Bering Strait
    (-90, 25),  # Gulf of Mexico
    (-85, 58), (-60, 55.2),  # Hudson Bay and its strait
    (138, -16.45),  # Gulf of Carpentaria
    (136.45, 33.76),  # the Kii coast: Osaka Bay is narrower than a hex, so Kyoto keeps a sea frontage for its port
    (105.0, -4.5),  # Sunda Strait: keep Java separated from Sumatra
]
# Narrow straits, widened to a continuous one-hex sea lane along each (lon, lat) polyline, as WC4 draws them.
CHANNELS = [
    [(-7.0, 49.4), (-4.0, 49.75), (-1.5, 50.15), (0.6, 50.55), (1.5, 50.95), (2.6, 51.2)],  # English Channel
    [(-6.8, 51.2), (-5.7, 52.1)],  # St George's Channel
    [(-5.2, 54.3), (-5.45, 54.9), (-6.0, 55.5), (-6.6, 56.0)],  # North Channel
    [(15.0, 38.9), (15.62, 38.25), (15.65, 37.6)],  # Strait of Messina
    [(8.3, 41.33), (9.9, 41.3)],  # Strait of Bonifacio
    [(10.4, 43.9), (10.1, 42.9), (10.1, 41.9)],  # Corsica Channel: Corsica stays clear of Tuscany
    [(18.0, 41.6), (18.95, 40.4), (19.3, 39.4)],  # Strait of Otranto
    [(24.8, 40.2), (25.55, 40.56), (26.95, 40.56), (27.66, 41.53), (29.06, 41.53), (29.4, 42.3)],  # Dardanelles, Bosporus (west of Istanbul)
    [(-7.5, 35.7), (-3.8, 35.7)],  # Strait of Gibraltar (the city sits on the Spanish shore just north)
    [(10.8, 58.0), (11.7, 57.0), (12.3, 56.3), (12.75, 55.85), (12.85, 55.4), (13.4, 54.9)],  # Kattegat and the Øresund
    [(139.4, 41.45), (140.6, 41.5), (141.4, 41.6), (142.3, 41.6)],  # Tsugaru Strait
    [(119.4, 22.5), (119.8, 24.2), (120.4, 25.6)],  # Taiwan Strait
    [(32.6, 29.6), (33.8, 27.4), (35.6, 24.8), (37.5, 22.0), (39.2, 19.3), (40.7, 16.4), (42.2, 14.3), (43.3, 12.8),
     (44.5, 12.0), (46.5, 12.3)],  # the Red Sea and Bab-el-Mandeb
    [(78.3, 8.6), (79.5, 9.5), (80.5, 10.5), (81.5, 11.4)],  # Palk Strait: Sri Lanka stays an island
    [(48.6, 29.8), (50.0, 28.6), (51.5, 27.3), (53.0, 26.4), (55.0, 26.3), (56.4, 26.5), (57.5, 25.5), (59.5, 24.0)],  # Persian Gulf
    [(98.36, 6.45), (98.49, 4.38), (99.59, 2.3), (100.69, 0.23), (102.9, 0.23), (105.1, 0.23), (108.4, 2.3)],  # Malacca, south of Singapore
]
# Short land links kept as one continuous chain of land hexes along each polyline.
LAND_BRIDGES = [
    [(130.85, 33.8), (131.05, 34.05)],  # Shimonoseki: Kyushu joined to Honshu
]

# Sea lanes that must stay open: (name, a point in each sea).
SEA_LANES = [
    ('Strait of Gibraltar', (-12, 36), (3, 38.5)),
    ('Bosporus and Dardanelles', (34, 43), (25, 38)),
    ('Danish Straits', (20, 58.5), (5, 55)),
    ('English Channel', (-6, 49.5), (3, 52.5)),
    ('Suez to Aden', (38, 21), (48, 12)),
    ('Strait of Hormuz', (50, 28.4), (62, 22)),
    ('Strait of Malacca', (95, 7), (108, 6)),
    ('Hudson Strait', (-85, 58), (-60, 55)),
]


def city_points():
    """Every conquest city, read from dist/engine/world.js: its own hex is always land."""
    import os
    import re
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'engine', 'world.js')
    src = open(path).read()
    block = src[src.index('const CITY_DATA'):src.index('const ARMY_DATA')]
    return [(m.group(1), float(m.group(2)), float(m.group(3)))
            for m in re.finditer(r"\['([^']+)', (-?[\d.]+), (-?[\d.]+), '", block)]


def neighbours(c, r):
    odd = r & 1
    for dc, dr in ((-1, 0), (1, 0), (odd - 1, -1), (odd, -1), (odd - 1, 1), (odd, 1)):
        if 0 <= r + dr < ROWS:
            yield (c + dc) % COLS, r + dr


def sea_connected(grid, a, b):
    start, goal = hex_of(*a), hex_of(*b)
    seen, queue = {start}, [start]
    while queue:
        h = queue.pop()
        if h == goal:
            return True
        for n in neighbours(*h):
            if n not in seen and grid[n[1]][n[0]] == '.':
                seen.add(n)
                queue.append(n)
    return False


LAND_SHAPES = [Shape(p) for p in LAND]
WATER_SHAPES = [Shape(p) for p in WATER]
BIOME_SHAPES = [(code, density, Shape(poly, 2)) for code, density, poly in BIOMES]
SAMPLES = [(0, 0)] + [(0.42 * math.cos(a), 0.42 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]]


def hexes_along(line):
    """Every hex on a lon/lat polyline, in order; consecutive hexes are neighbours."""
    out = []
    for (lon1, lat1), (lon2, lat2) in zip(line, line[1:]):
        n = max(1, math.ceil(max(abs(lon2 - lon1), abs(lat2 - lat1)) / 0.02))
        for k in range(n + 1):
            h = hex_of(lon1 + (lon2 - lon1) * k / n, lat1 + (lat2 - lat1) * k / n)
            if not out or out[-1] != h:
                out.append(h)
    return out


def build():
    grid = [['.'] * COLS for _ in range(ROWS)]
    for r in range(ROWS):
        for c in range(COLS):
            x = c + 0.5 + 0.5 * (r & 1)
            hits = sum(1 for dx, dy in SAMPLES if is_land(x + dx, r + dy))
            if is_land(x, r) or hits >= 3:
                grid[r][c] = 'p'
    for line, code in [(line, 'p') for line in LAND_BRIDGES] + [(line, '.') for line in CHANNELS]:
        for c, r in hexes_along(line):
            grid[r][c] = code
    for lon, lat in FORCE_LAND + [(lon, lat) for _, lon, lat in city_points()]:
        c, r = hex_of(lon, lat)
        grid[r][c] = 'p'
    for lon, lat in FORCE_SEA:
        c, r = hex_of(lon, lat)
        grid[r][c] = '.'
    for r in range(ROWS):
        for c in range(COLS):
            if grid[r][c] == '.':
                continue
            x = c + 0.5 + 0.5 * (r & 1)
            for i, (code, density, shape) in enumerate(BIOME_SHAPES):
                if in_region(shape, x, r) and hash01(c, r, i) < density:
                    grid[r][c] = code
    for code, points in FORCE_TERRAIN.items():
        for lon, lat in points:
            c, r = hex_of(lon, lat)
            if grid[r][c] != '.':
                grid[r][c] = code
    for lon, lat in PEAKS + ICE_CAP:
        c, r = hex_of(lon, lat)
        if grid[r][c] != '.':
            grid[r][c] = 'x'
    for name, a, b in SEA_LANES:
        assert sea_connected(grid, a, b), f'{name} is closed'
    return grid


def js_block(g):
    def rows(items):
        return ',\n'.join(f'      {list(item)}' for item in items)
    lines = [f'  // <world> Generated by tools/build_map.py: {COLS} x {ROWS} wrapping hexes, 74N to 54S. Row bands and column',
             '  // lenses (see build_map.py) enlarge Europe and East Asia at the expense of the open oceans, as WC4 does.',
             f'  const WORLD = {{',
             f'    cols: {COLS}, rows: {ROWS}, lon0: {LON0:g}, lat0: {LAT0:g}, lat1: {LAT_MIN:g},',
             '    rowBands: [', rows(ROW_BANDS), '    ],',
             '    lenses: [', rows(LENSES), '    ],',
             '  };',
             '  const WORLD_ROWS = [']
    lines += [f"    '{''.join(row)}'," for row in g]
    lines += ['  ];', '  // </world>']
    return '\n'.join(lines)


if __name__ == '__main__':
    g = build()
    block = js_block(g)
    if '--inject' in sys.argv:
        # Replace the generated block inside dist/engine/world.js in place.
        path = sys.argv[sys.argv.index('--inject') + 1]
        src = open(path).read()
        start = src.index('  // <world>')
        end = src.index('  // </world>') + len('  // </world>')
        open(path, 'w').write(src[:start] + block + src[end:])
    else:
        print(block)
    for r, row in enumerate(g):
        sys.stderr.write(('  ' if r & 1 else '') + ' '.join(row) + f'  {r:2d}\n')
