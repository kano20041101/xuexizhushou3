import struct

def create_optimized_favicon(filename):
    """Create an optimized favicon that displays well at 16x16"""
    
    # Create a 16x16 image data (RGBA)
    # Simplified design for better display at small size
    pixels = []
    
    for y in range(16):
        row = []
        for x in range(16):
            # Background (transparent)
            r, g, b, a = 255, 255, 255, 0
            
            # Book (simplified)
            # Book cover (blue)
            if 4 <= y <= 12 and 3 <= x <= 12:
                r, g, b, a = 100, 149, 237, 255  # Cornflower blue
            
            # Book pages (white)
            if 5 <= y <= 11 and 4 <= x <= 11:
                r, g, b, a = 255, 255, 255, 255  # White
            
            # Book lines (simplified)
            if (y == 7 or y == 9) and 6 <= x <= 9:
                r, g, b, a = 100, 149, 237, 255  # Cornflower blue
            
            # Computer (simplified)
            # Monitor outline
            if 1 <= y <= 7 and 8 <= x <= 14:
                r, g, b, a = 70, 130, 180, 255  # Steel blue
            
            # Monitor screen
            if 2 <= y <= 6 and 9 <= x <= 13:
                r, g, b, a = 30, 144, 255, 255  # Dodger blue
            
            # Monitor stand
            if y == 7 and 10 <= x <= 12:
                r, g, b, a = 70, 130, 180, 255  # Steel blue
            
            # Code line on screen
            if y == 4 and 10 <= x <= 12:
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
    
    print(f"Created optimized {filename}")

if __name__ == '__main__':
    create_optimized_favicon('favicon.ico')
