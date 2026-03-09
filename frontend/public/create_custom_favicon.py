from PIL import Image, ImageDraw
import struct

def create_custom_favicon(filename):
    # Create a 32x32 image with transparent background
    img = Image.new('RGBA', (32, 32), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw the book (blue)
    # Book cover
    draw.rectangle([6, 8, 26, 28], fill=(100, 149, 237, 255))  # Cornflower blue
    # Book pages
    draw.rectangle([8, 10, 24, 26], fill=(255, 255, 255, 255))  # White
    # Book lines
    draw.line([12, 14, 20, 14], fill=(100, 149, 237, 255), width=1)
    draw.line([11, 16, 19, 16], fill=(100, 149, 237, 255), width=1)
    draw.line([10, 18, 18, 18], fill=(100, 149, 237, 255), width=1)
    draw.line([13, 20, 21, 20], fill=(100, 149, 237, 255), width=1)
    draw.line([12, 22, 20, 22], fill=(100, 149, 237, 255), width=1)
    
    # Draw the computer monitor
    # Monitor outline
    draw.rectangle([10, 4, 22, 14], fill=(70, 130, 180, 255))  # Steel blue
    # Monitor screen
    draw.rectangle([11, 5, 21, 13], fill=(30, 144, 255, 255))  # Dodger blue
    # Monitor stand
    draw.rectangle([14, 14, 18, 16], fill=(70, 130, 180, 255))  # Steel blue
    # Monitor base
    draw.ellipse([12, 16, 20, 18], fill=(70, 130, 180, 255))  # Steel blue
    
    # Draw computer code on screen
    draw.line([13, 7, 19, 7], fill=(0, 255, 127, 255), width=1)  # Spring green
    draw.line([14, 9, 18, 9], fill=(0, 255, 127, 255), width=1)  # Spring green
    draw.line([13, 11, 17, 11], fill=(0, 255, 127, 255), width=1)  # Spring green
    
    # Save as PNG first
    img.save('temp_favicon.png')
    
    # Now convert to ICO
    # Create 16x16 version
    img_16 = img.resize((16, 16), Image.LANCZOS)
    
    # Convert to BMP format (required for ICO)
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
            r, g, b, a = img_16.getpixel((x, y))
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
    create_custom_favicon('favicon.ico')
