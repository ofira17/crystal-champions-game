from PIL import Image
from collections import deque
import os

FILES = []
for base in ['question-goblin', 'mistake-bat', 'memory-giant', 'confusion-wizard']:
    for i in range(1, 6):
        FILES.append(f'public/enemies/{base}-{i}.png')

TOLERANCE = 32  # per-channel distance for "same as background"
EDGE_FEATHER = 4  # alpha smoothing near edges

def remove_bg(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()

    # Sample edge pixels to estimate bg color (median-ish)
    rs, gs, bs = [], [], []
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            rs.append(r); gs.append(g); bs.append(b)
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            rs.append(r); gs.append(g); bs.append(b)
    rs.sort(); gs.sort(); bs.sort()
    br, bg_, bb = rs[len(rs)//2], gs[len(gs)//2], bs[len(bs)//2]

    # Flood fill from all edge pixels matching bg color
    visited = bytearray(w * h)
    q = deque()

    def is_bg(r, g, b):
        return abs(r - br) <= TOLERANCE and abs(g - bg_) <= TOLERANCE and abs(b - bb) <= TOLERANCE

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_bg(r, g, b):
                q.append((x, y))
                visited[y * w + x] = 1
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            if is_bg(r, g, b):
                q.append((x, y))
                visited[y * w + x] = 1

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                r, g, b, a = px[nx, ny]
                if a == 0 or is_bg(r, g, b):
                    visited[ny * w + nx] = 1
                    q.append((nx, ny))

    im.save(path, 'PNG', optimize=True)
    return path

for f in FILES:
    if os.path.exists(f):
        remove_bg(f)
        print('done', f)
    else:
        print('MISSING', f)
