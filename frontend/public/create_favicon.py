import struct
import zlib
import os

def create_ico(filename, width=16, height=16):
    # Create a simple 16x16 RGBA image (blue square with yellow border)
    pixels = []
    for y in range(height):
        row = []
        for x in range(width):
            if x < 2 or x >= width-2 or y < 2 or y >= height-2:
                # Yellow border (B, G, R, A)
                pixel = (255, 200, 0, 255)
            else:
                # Blue center - computer science theme (B, G, R, A)
                pixel = (0, 100, 200, 255)
            row.append(pixel)
        pixels.append(row)

    # BMP header for ICO (no file header, just DIB header)
    bmp_data = bytearray()

    # BITMAPINFOHEADER (40 bytes)
    bmp_data.extend(struct.pack('<I', 40))  # Header size
    bmp_data.extend(struct.pack('<i', width))  # Width
    bmp_data.extend(struct.pack('<i', height * 2))  # Height (doubled for ICO)
    bmp_data.extend(struct.pack('<H', 1))   # Planes
    bmp_data.extend(struct.pack('<H', 32))   # Bits per pixel
    bmp_data.extend(struct.pack('<I', 0))   # Compression
    bmp_data.extend(struct.pack('<I', 0))   # Image size (can be 0 for uncompressed)
    bmp_data.extend(struct.pack('<i', 0))   # X pixels per meter
    bmp_data.extend(struct.pack('<i', 0))   # Y pixels per meter
    bmp_data.extend(struct.pack('<I', 0))   # Colors used
    bmp_data.extend(struct.pack('<I', 0))   # Important colors

    # Pixel data (BGRA, bottom-up)
    for y in range(height - 1, -1, -1):
        for x in range(width):
            pixel = pixels[y][x]
            bmp_data.extend([pixel[2], pixel[1], pixel[0], pixel[3]])  # BGRA

    # AND mask (all zeros for fully opaque)
    and_mask = bytearray(height * ((width + 31) // 32) * 4)
    bmp_data.extend(and_mask)

    # ICO file header
    ico_data = bytearray()

    # ICONDIR (6 bytes)
    ico_data.extend(struct.pack('<H', 0))    # Reserved
    ico_data.extend(struct.pack('<H', 1))    # Type (1 = ICO)
    ico_data.extend(struct.pack('<H', 1))    # Number of images

    # ICONDIRENTRY (16 bytes)
    ico_data.extend(struct.pack('<B', width))   # Width
    ico_data.extend(struct.pack('<B', height))   # Height
    ico_data.extend(struct.pack('<B', 0))        # Color palette
    ico_data.extend(struct.pack('<B', 0))        # Reserved
    ico_data.extend(struct.pack('<H', 1))        # Color planes
    ico_data.extend(struct.pack('<H', 32))       # Bits per pixel
    ico_data.extend(struct.pack('<I', len(bmp_data)))  # Size of image data
    ico_data.extend(struct.pack('<I', 22))       # Offset to image data

    # Image data
    ico_data.extend(bmp_data)

    # Write to file
    with open(filename, 'wb') as f:
        f.write(ico_data)

    print(f"Created {filename}")

if __name__ == '__main__':
    create_ico('favicon.ico')
