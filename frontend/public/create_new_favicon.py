import struct

def create_new_favicon(filename):
    """Create a favicon based on the new image provided"""
    
    # Create a 16x16 image data (RGBA)
    # Based on the new image: blue book, teal monitor, light blue background
    pixels = []
    
    for y in range(16):
        row = []
        for x in range(16):
            # Light blue background
            r, g, b, a = 173, 216, 230, 255  # Light blue
            
            # Book (blue)
            # Book cover outline
            if (y == 4 or y == 12) and 3 <= x <= 12:
                r, g, b, a = 0, 0, 139, 255  # Dark blue
            if (x == 3 or x == 12) and 4 <= y <= 12:
                r, g, b, a = 0, 0, 139, 255  # Dark blue
            
            # Book cover
            if 5 <= y <= 11 and 4 <= x <= 11:
                r, g, b, a = 100, 149, 237, 255  # Cornflower blue
            
            # Book pages (white)
            if 6 <= y <= 10 and 5 <= x <= 10:
                r, g, b, a = 255, 255, 255, 255  # White
            
            # Book lines
            if (y == 7 or y == 9) and 6 <= x <= 9:
                r, g, b, a = 0, 0, 139, 255  # Dark blue
            
            # Computer monitor (teal)
            # Monitor outline
            if (y == 1 or y == 6) and 7 <= x <= 14:
                r, g, b, a = 0, 0, 139, 255  # Dark blue
            if (x == 7 or x == 14) and 1 <= y <= 6:
                r, g, b, a = 0, 0, 139, 255  # Dark blue
            
            # Monitor screen
            if 2 <= y <= 5 and 8 <= x <= 13:
                r, g, b, a = 0, 128, 128, 255  # Teal
            
            # Monitor stand
            if y == 6 and 9 <= x <= 12:
                r, g, b, a = 0, 128, 128, 255  # Teal
            
            # Monitor base
            if y == 7 and 10 <= x <= 11:
                r, g, b, a = 0, 128, 128, 255  # Teal
            
            # Code lines on screen
            if (y == 2 or y == 3 or y == 4) and 9 <= x <= 12:
                r, g, b, a = 0, 255, 255, 255  # Cyan
            
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
    
    print(f"Created new {filename}")

if __name__ == '__main__':
    create_new_favicon('favicon.ico')
