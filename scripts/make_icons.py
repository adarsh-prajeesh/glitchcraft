import os
import zlib
import struct

def make_png(width, height, draw_func):
    raw = bytearray()
    for y in range(height):
        raw.append(0) # filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw), 9)
    
    def chunk(tag, data):
        c = tag + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
    
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png.extend(chunk(b'IHDR', ihdr_data))
    png.extend(chunk(b'IDAT', compressed))
    png.extend(chunk(b'IEND', b''))
    return bytes(png)

def icon_drawer(x, y, w, h):
    # Normalized coords from -1 to 1
    nx = (x - w / 2) / (w / 2)
    ny = (y - h / 2) / (h / 2)
    
    # Shield shape: top horizontal, curved sides meeting at bottom point
    # In upper half: -0.75 <= nx <= 0.75 and -0.8 <= ny <= 0.2
    # In lower half: curve down to (0, 0.9)
    
    in_shield = False
    if ny >= -0.8 and ny <= 0.1:
        if abs(nx) <= 0.8:
            in_shield = True
    elif ny > 0.1 and ny <= 0.88:
        # triangular bottom
        factor = (0.88 - ny) / 0.78
        if abs(nx) <= 0.8 * factor:
            in_shield = True
            
    if not in_shield:
        return (0, 0, 0, 0)
    
    # Border vs Inner
    # Shield border thickness ~ 0.12
    is_border = False
    if abs(nx) > 0.65 or ny < -0.68:
        is_border = True
    elif ny > 0.1:
        factor = (0.88 - ny) / 0.78
        if abs(nx) > 0.65 * factor or ny > 0.75:
            is_border = True
            
    if is_border:
        # Bright cyan border
        return (6, 182, 212, 255) # cyan-500
    
    # Inner: Dark futuristic gradient with keyhole or checkmark
    # Check if inside central checkmark:
    # Checkmark from (-0.3, 0.0) -> (-0.05, 0.3) -> (0.35, -0.25)
    in_check = False
    # Check line 1: (-0.3, 0.0) to (-0.05, 0.3)
    # Check line 2: (-0.05, 0.3) to (0.35, -0.25)
    dx1, dy1 = nx - (-0.3), ny - 0.0
    # simple checkmark distance
    def pt_seg_dist(px, py, x1, y1, x2, y2):
        l2 = (x2-x1)**2 + (y2-y1)**2
        if l2 == 0: return ((px-x1)**2 + (py-y1)**2)**0.5
        t = max(0, min(1, ((px-x1)*(x2-x1) + (py-y1)*(y2-y1)) / l2))
        projx = x1 + t * (x2 - x1)
        projy = y1 + t * (y2 - y1)
        return ((px - projx)**2 + (py - projy)**2)**0.5

    d1 = pt_seg_dist(nx, ny, -0.28, 0.05, -0.05, 0.3)
    d2 = pt_seg_dist(nx, ny, -0.05, 0.3, 0.32, -0.2)
    min_d = min(d1, d2)
    if min_d < 0.12:
        return (16, 185, 129, 255) # emerald-500 checkmark
        
    # Background inside shield: deep navy / cyber slate
    t = (ny + 0.8) / 1.6
    r = int(6 + t * 4)
    g = int(12 + t * 14)
    b = int(28 + t * 20)
    return (r, g, b, 240)

os.makedirs('extension/icons', exist_ok=True)
for size in [16, 48, 128]:
    png_data = make_png(size, size, icon_drawer)
    path = f'extension/icons/icon{size}.png'
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f'Generated {path} ({size}x{size}) - {len(png_data)} bytes')
