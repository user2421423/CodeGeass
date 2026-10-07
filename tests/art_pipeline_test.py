"""Regression checks for preparing and decoding published artwork."""
import sys
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import local_art_prepare as art


class ArtPipelineTest(unittest.TestCase):
    def test_edge_background_is_removed(self):
        image = Image.new('RGBA', (20, 20), 'white')
        ImageDraw.Draw(image).rectangle((5, 5, 14, 14), fill='red')
        result = art.cutout(image, 40)
        self.assertEqual(result.size, (10, 10))
        self.assertEqual(result.getpixel((5, 5)), (255, 0, 0, 255))

    def test_seed_removes_enclosed_background_and_preserves_white_armor(self):
        image = Image.new('RGBA', (24, 24), 'white')
        draw = ImageDraw.Draw(image)
        draw.rectangle((3, 3, 20, 20), fill='red')
        draw.rectangle((6, 6, 9, 9), fill='white')
        draw.rectangle((14, 14, 17, 17), fill='white')
        result = art.cutout(image, 40, [(7, 7)])
        self.assertEqual(result.getpixel((4, 4))[3], 0)
        self.assertEqual(result.getpixel((12, 12))[3], 255)

    def test_blank_cutout_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'fully transparent'):
            art.cutout(Image.new('RGBA', (20, 20), 'white'), 40)

    def test_all_published_images_decode(self):
        import json
        root = Path(__file__).resolve().parents[1] / 'dist/assets/art'
        manifest = json.loads((root / 'manifest.json').read_text())
        for kind in ('units', 'portraits'):
            for key, entry in manifest[kind].items():
                with self.subTest(kind=kind, key=key):
                    if entry['src'].endswith('.svg'):
                        # Pillow cannot rasterize SVG; check it is a complete document, as publish_art.py does.
                        text = (root / entry['src']).read_text(encoding='utf8')
                        self.assertIn('<svg', text)
                        self.assertIn('</svg>', text)
                        continue
                    with Image.open(root / entry['src']) as image:
                        image.load()
                        self.assertGreater(image.width * image.height, 0)
                        if kind == 'units':
                            self.assertEqual(image.mode, 'RGBA')
                            self.assertEqual(image.getchannel('A').getextrema(), (0, 255))


if __name__ == '__main__':
    unittest.main()
