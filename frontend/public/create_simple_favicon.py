import struct

def create_simple_favicon(filename):
    """Create a simple favicon based on the user's image"""
    
    # Create a 16x16 image data (RGBA)
    # This is a simplified version of the user's image:
    # - Blue book with white pages
    # - Teal computer monitor with code lines
    pixels = []
    
    for y in range(16):
        row = []
        for x in range(16):
            # Background (transparent)
            r, g, b, a = 255, 255, 255, 0
            
            # Book cover (blue)
            if 6 <= y <= 26 and 6 <= x <= 26:
                r, g, b, a = 100, 149, 237, 255  # Cornflower blue
            
            # Book pages (white)
            if 8 <= y <= 24 and 8 <= x <= 24:
                r, g, b, a = 255, 255, 255, 255  # White
            
            # Computer monitor (teal/blue)
            if 4 <= y <= 14 and 10 <= x <= 22:
                r, g, b, a = 70, 130, 180, 255  # Steel blue
            
            # Computer screen (darker blue)
            if 5 <= y <= 13 and 11 <= x <= 21:
                r, g, b, a = 30, 144, 255, 255  # Dodger blue
            
            # Computer stand
            if 14 <= y <= 16 and 14 <= x <= 18:
                r, g, b, a = 70, 130, 180, 255  # Steel blue
            
            # Code lines on screen (green)
            if (y == 7 or y == 9 or y == 11) and 13 <= x <= 19:
                r, g, b, a = 0, 255, 127, 255  # Spring green
            
            row.append((r, g, b, a))
        pixels.append(row)
    
    # Convert to BMP format for ICO
    bmp_data = bytearray()
    
    # BITMAPINFOHEADER (40 bytes)
    bmp_data.extend(struct.pack('<I', 40))  # Header size
    bmp_data.extend(struct.pack('<i', 16))  # Width
    bmp_data.extend(struct.pack('<i', 32))  # Height (doubled for ICO)
    bmp_data.extend(struct.pack('<H', 1))   # Planes
    bmp_data.extend(struct.pack('<H', 32))   # Bits per pixel
    bmp_data.extend(struct.pack('<I', 0))   # Compression
    bmp_data.extend(struct.pack('<I', 0))   # Image size
    bmp_data.extend(struct.pack('<i', 0))   # X pixels per meter
    bmp_data.extend(struct.pack('<i', 0))   # Y pixels per meter
    bmp_data.extend(struct.pack('<I', 0))   # Colors used
    bmp_data.extend(struct.pack('<I', 0))   # Important colors
    
    # Pixel data (BGRA, bottom-up)
    for y in range(15, -1, -1):
        for x in range(16):
            r, g, b, a = pixels[y][x]
            bmp_data.extend([b, g, r, a])  # BGRA
    
    # AND mask (all zeros for fully opaque)
    and_mask = bytearray(16 * 4)  # 16x16 bits = 32 bytes
    bmp_data.extend(and_mask)
    
    # ICO file header
    ico_data = bytearray()
    
    # ICONDIR (6 bytes)
    ico_data.extend(struct.pack('<H', 0))    # Reserved
    ico_data.extend(struct.pack('<H', 1))    # Type (1 = ICO)
    ico_data.extend(struct.pack('<H', 1))    # Number of images
    
    # ICONDIRENTRY (16 bytes)
    ico_data.extend(struct.pack('<B', 16))   # Width
    ico_data.extend(struct.pack('<B', 16))   # Height
    ico_data.extend(struct.pack('<B', 0))    # Color palette
    ico_data.extend(struct.pack('<B', 0))    # Reserved
    ico_data.extend(struct.pack('<H', 1))    # Color planes
    ico_data.extend(struct.pack('<H', 32))   # Bits per pixel
    ico_data.extend(struct.pack('<I', len(bmp_data)))  # Size of image data
    ico_data.extend(struct.pack('<I', 22))   # Offset to image data
    
    # Image data
    ico_data.extend(bmp_data)
    
    # Write to file
    with open(filename, 'wb') as f:
        f.write(ico_data)
    
    print(f"Created {filename}")

if __name__ == '__main__':
    create_simple_favicon('favicon.ico')
