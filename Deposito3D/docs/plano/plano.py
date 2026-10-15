from reportlab.lib.pagesizes import A3, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, black

PAGE = landscape(A3)
W, H = PAGE
NAVY = HexColor('#14213D'); ORANGE = HexColor('#EA580C'); GRAY = HexColor('#9CA3AF')
LIGHT = HexColor('#F3F4F6'); MID = HexColor('#6B7280'); YEL = HexColor('#CA8A04')

BAY, DEPTH, EMPTY = 2.7, 1.1, 1.2
ROWS = [  # id, x, z, modules, facing, emptyStart, emptyEnd
 ('A', 3.15, 0.2, 10, 1, EMPTY, EMPTY),
 ('B', 3.15, 5.9, 11, -1, EMPTY, 0),
 ('C', 3.15, 7.2, 11, 1, EMPTY, 0),
 ('D', 3.15, 12.6, 17, -1, EMPTY, EMPTY),
 ('E', 38.1, 0.8, 4, 1, 0, EMPTY),
 ('F', 38.1, 5.9, 4, -1, 0, EMPTY),
 ('G', 38.1, 7.2, 4, 1, 0, EMPTY),
]
# Escala esquemática: X real, Z ampliada para tener lugar donde escribir.
X0, Z0 = -10.0, -5.5
SX, SZ = 14.2, 31.5
OX, OY = 40, H - 110   # origen (arriba-izquierda del dibujo)
def px(x): return OX + (x - X0) * SX
def py(z): return OY - (z - Z0) * SZ

def checkbox(c, x, y, s=9):
    c.setStrokeColor(black); c.setLineWidth(0.8); c.setFillColor(white); c.rect(x, y, s, s, fill=1, stroke=1)

TAG_W, TAG_H = 92, 36
def tag(c, x, y, letter_hint):
    """Recuadro compacto: nombre de la fila + casilla 'Mód. 1 acá'."""
    w, h = TAG_W, TAG_H
    c.setFillColor(white); c.setStrokeColor(NAVY); c.setLineWidth(1.2)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=1)
    c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 8)
    c.drawString(x + 5, y + h - 13, 'Fila:')
    c.setStrokeColor(GRAY); c.setLineWidth(0.6); c.line(x + 26, y + h - 14, x + w - 6, y + h - 14)
    c.setFillColor(MID); c.setFont('Helvetica', 6.5); c.drawRightString(x + w - 6, y + h - 11, f'hoy {letter_hint}')
    checkbox(c, x + 5, y + 5, 9)
    c.setFillColor(NAVY); c.setFont('Helvetica', 8); c.drawString(x + 18, y + 7, 'Módulo 1 acá')

c = canvas.Canvas('Plano-para-completar-Deposito3D.pdf', pagesize=PAGE)
c.setTitle('Deposito3D – Plano para completar'); c.setAuthor('Deposito3D')

# ---------------- PÁGINA 1: plano ----------------
c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 20)
c.drawString(40, H - 45, 'Deposito3D · Plano del almacén para completar a mano')
c.setFont('Helvetica', 10); c.setFillColor(MID)
c.drawString(40, H - 62, 'Esquema basado en el plano de ingeniería (no a escala: el ancho de los pasillos está agrandado para poder escribir).')
c.drawString(40, H - 76, 'Escribí el nombre real de cada fila, marcá dónde empieza el módulo 1, corregí lo que esté mal y dibujá las zonas que falten.')
c.setFont('Helvetica', 9); c.drawRightString(W - 40, H - 45, 'Completó: ______________________   Fecha: ____/____/______')

# Contorno del edificio (lo conocido)
c.setStrokeColor(NAVY); c.setLineWidth(2)
c.line(px(0), py(-0.0), px(0), py(14.0))           # pared izquierda
c.line(px(0), py(0), px(33), py(0))                 # pared superior bloque izq.
c.setDash(4, 3); c.setLineWidth(1); c.setStrokeColor(GRAY)
c.line(px(0), py(14.0), px(52), py(14.0))           # borde inferior (a confirmar)
c.line(px(52), py(-5), px(52), py(14))
c.setDash()

# Zona rayada a la izquierda
x1, y1, x2, y2 = px(-8.7), py(5.3), px(-0.4), py(9.2)
c.setStrokeColor(MID); c.setLineWidth(0.5)
c.rect(x1, y2, x2 - x1, y1 - y2, stroke=1, fill=0)
for i in range(0, int(x2 - x1) + int(y1 - y2), 8):
    c.line(max(x1, x1 + i - (y1 - y2)), y2 + max(0, (y1 - y2) - i), min(x2, x1 + i), y2 + (y1 - y2) - max(0, min(i, (y1 - y2))) if False else y1 - max(0, i - (x2 - x1)) )
c.setFillColor(white); c.rect(x1 + 6, y2 + (y1 - y2) / 2 - 16, x2 - x1 - 12, 32, fill=1, stroke=0)
c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 8); c.drawString(x1 + 9, y2 + (y1 - y2) / 2 + 6, '¿Qué es esta zona?')
c.setStrokeColor(GRAY); c.line(x1 + 9, y2 + (y1 - y2) / 2 - 10, x2 - 9, y2 + (y1 - y2) / 2 - 10)

# Moldes
mx1, mz1, mx2, mz2 = 36.5, -4.6, 51.0, -1.0
c.setStrokeColor(MID); c.setLineWidth(0.8); c.setFillColor(LIGHT)
c.rect(px(mx1), py(mz2), px(mx2) - px(mx1), py(mz1) - py(mz2), fill=1, stroke=1)
c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 10); c.drawCentredString((px(mx1) + px(mx2)) / 2, (py(mz1) + py(mz2)) / 2 - 3, 'MOLDES')

# Pasillos
for name, xa, xb, za, zb in [('PASILLO 1', 0.4, 51.5, 1.9, 5.9), ('PASILLO 2', 0.4, 51.5, 8.3, 12.6)]:
    c.setFillColor(HexColor('#FEF9C3'))
    cy = (py(za) + py(zb)) / 2
    c.setFillColor(YEL); c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(px(20), cy - 3, f'{name}   ·   nombre real: ____________________')
c.saveState(); c.translate(px(34.2), (py(1.9) + py(12.6)) / 2); c.rotate(90)
c.setFillColor(YEL); c.setFont('Helvetica-Bold', 8); c.drawCentredString(0, -3, 'PASILLO TRANSVERSAL'); c.restoreState()

# Filas
for rid, x, z, n, facing, es, ee in ROWS:
    top, bot = py(z), py(z + DEPTH)
    # huecos vacíos
    for (ex, ew) in ([(x - es, es)] if es else []) + ([(x + n * BAY, ee)] if ee else []):
        c.setStrokeColor(ORANGE); c.setLineWidth(0.6); c.setFillColor(white)
        c.rect(px(ex) + 1, bot + 1, ew * SX - 2, top - bot - 2, fill=1, stroke=1)
    for m in range(n):
        mx = x + m * BAY
        c.setStrokeColor(NAVY); c.setLineWidth(1); c.setFillColor(white)
        c.rect(px(mx), bot, BAY * SX, top - bot, fill=1, stroke=1)
        c.setStrokeColor(ORANGE); c.setLineWidth(0.5)
        c.line(px(mx + BAY / 2), bot + 2, px(mx + BAY / 2), top - 2)
        c.setFillColor(GRAY); c.setFont('Helvetica', 7)
        c.drawCentredString(px(mx + BAY / 2), bot + 3, str(m + 1))
    # letra tentativa en el centro
    c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 9)
    c.drawString(px(x) - (es * SX if es else 0) - 14, (top + bot) / 2 - 3, rid)
    # recuadros de nombre en ambas puntas, del lado del pasillo
    ty = (bot - TAG_H - 4) if facing == 1 else (top + 4)
    left_x = px(x - es) - (34 if x > 30 else 0)   # bloque derecho: la etiqueta sale al pasillo transversal
    tag(c, left_x, ty, rid)
    tag(c, px(x + n * BAY + ee) - TAG_W, ty, rid)

# Área a la derecha para dibujar zonas
zx1, zx2, zz1, zz2 = 53.0, 67.5, -4.6, 14.0
c.setStrokeColor(NAVY); c.setLineWidth(1); c.setDash(3, 3)
c.rect(px(zx1), py(zz2), px(zx2) - px(zx1), py(zz1) - py(zz2), stroke=1, fill=0); c.setDash()
c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 10)
c.drawString(px(zx1) + 8, py(zz1) - 16, 'Dibujá dónde están:')
c.setFont('Helvetica', 9)
items = ['Recepción', 'WIP (W0WIP)', 'Expedición', 'F1, L1, Q1 (¿qué son?)', 'Portones / puertas', 'Oficina / puesto de PC', 'Carga de autoelevadores', 'Otras ubicaciones de piso']
for i, t in enumerate(items):
    yy = py(zz1) - 34 - i * 15
    checkbox(c, px(zx1) + 8, yy - 1, 8); c.setFillColor(NAVY); c.drawString(px(zx1) + 21, yy, t)
c.setFillColor(MID); c.setFont('Helvetica-Oblique', 8)
c.drawString(px(zx1) + 8, py(zz1) - 34 - len(items) * 15 - 4, '(dibujalas en el plano o en este recuadro)')

# Pie: referencias y ejemplo
by = 52
c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 9); c.drawString(40, by + 26, 'Referencias')
c.setFont('Helvetica', 8.5)
c.setStrokeColor(NAVY); c.setFillColor(white); c.rect(40, by + 6, 30, 12, fill=1, stroke=1)
c.setStrokeColor(ORANGE); c.line(55, by + 7, 55, by + 17)
c.setFillColor(NAVY); c.drawString(76, by + 9, 'Módulo con 2 posiciones de pallet (número gris = numeración que usa hoy el modelo)')
c.setStrokeColor(ORANGE); c.setFillColor(white); c.rect(470, by + 6, 14, 12, fill=1, stroke=1)
c.setFillColor(NAVY); c.drawString(490, by + 9, 'Hueco sin estantería')
c.drawString(40, by - 10, 'Ejemplo: si la fila de arriba se llama "C" y su módulo 1 está a la derecha, escribí C en el recuadro y marcá la casilla de la punta derecha.')
c.setFillColor(MID); c.drawRightString(W - 40, by - 10, 'Página 1 de 2')
c.showPage()

# ---------------- PÁGINA 2: datos de cada fila ----------------
c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 20); c.drawString(40, H - 45, 'Datos de cada fila y nomenclatura')
c.setFont('Helvetica', 10); c.setFillColor(MID)
c.drawString(40, H - 62, 'Completá una línea por fila. Si algo ya está bien, poné una tilde. Dejé 3 líneas libres por si hay filas que no figuran en el plano.')
cols = [('Fila en el\nmodelo', 70), ('Nombre real\nde la fila', 110), ('Cant. de\nmódulos', 80), ('Posiciones\npor módulo', 85), ('Niveles', 70),
        ('Módulo 1 empieza\n(izq. / der. del plano)', 150), ('Código de ejemplo\n(como en la etiqueta)', 160), ('Observaciones', 0)]
tx, ty, rh = 40, H - 90, 28
total = W - 80
fixed = sum(w for _, w in cols); cols[-1] = (cols[-1][0], total - fixed)
c.setFillColor(NAVY); c.rect(tx, ty - 34, total, 34, fill=1, stroke=0)
c.setFillColor(white); c.setFont('Helvetica-Bold', 9)
xx = tx
for t, w in cols:
    for k, line in enumerate(t.split('\n')): c.drawString(xx + 6, ty - 14 - k * 11, line)
    xx += w
data = [(r[0], r[3], 2, 6) for r in ROWS] + [('', '', '', '')] * 3
for i, (rid, n, p, lv) in enumerate(data):
    y = ty - 34 - (i + 1) * rh
    c.setFillColor(LIGHT if i % 2 else white); c.rect(tx, y, total, rh, fill=1, stroke=0)
    c.setStrokeColor(GRAY); c.setLineWidth(0.5); c.rect(tx, y, total, rh, fill=0, stroke=1)
    xx = tx
    vals = [rid, '', f'{n}' if n != '' else '', f'{p}' if p != '' else '', f'{lv}' if lv != '' else '', '', '', '']
    for (t, w), v in zip(cols, vals):
        c.line(xx, y, xx, y + rh)
        if v:
            c.setFillColor(NAVY if (t.startswith('Fila')) else MID)
            c.setFont('Helvetica-Bold' if t.startswith('Fila') else 'Helvetica', 11 if t.startswith('Fila') else 9)
            c.drawString(xx + 8, y + 9, v + ('' if t.startswith('Fila') else '  ¿ok?'))
        xx += w

# Preguntas
qy = ty - 34 - (len(data) + 1) * rh - 30
c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 13); c.drawString(40, qy, 'Preguntas')
qs = [
 ('Las 2 posiciones de pallet de un mismo módulo, ¿tienen el mismo código o códigos distintos?', ['Mismo código (ej. C5.1)', 'Distintos (ej. C5.1-A / C5.1-B)', 'Otro:']),
 ('El último número del código (C5.1), ¿es el nivel?  ¿El nivel 1 es el piso?', ['Sí, nivel y 1 = piso', 'Es otra cosa:']),
 ('¿El "6" del plano es la cantidad de niveles?', ['Sí', 'No, es:']),
 ('Altura aproximada de cada nivel (m) / altura total de la estantería (m):', []),
 ('Frecuencia de conteo cíclico (días):', ['A: ______', 'B: ______', 'C: ______', 'D: no se cuenta / revisión de baja']),
]
c.setFont('Helvetica', 10)
y = qy - 24
col2 = W / 2 + 10
for i, (q, opts) in enumerate(qs):
    xq = 40 if i < 3 else col2
    if i == 3: y = qy - 24
    c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 10); c.drawString(xq, y, f'{i + 1}. {q}')
    y -= 18
    c.setFont('Helvetica', 10)
    if not opts:
        c.setStrokeColor(GRAY); c.line(xq + 14, y + 2, xq + 480, y + 2); y -= 22
    for o in opts:
        checkbox(c, xq + 14, y - 1, 9); c.setFillColor(NAVY); c.drawString(xq + 28, y, o)
        if o.endswith(':'):
            c.setStrokeColor(GRAY); c.line(xq + 28 + c.stringWidth(o, 'Helvetica', 10) + 6, y - 1, xq + 480, y - 1)
        y -= 17
    y -= 10

# Notas libres (columna derecha, debajo de las preguntas)
ny = y
c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 11); c.drawString(col2, ny - 6, 'Notas / otras observaciones')
c.setStrokeColor(GRAY)
k = 0
while ny - 30 - k * 22 > 50:
    c.line(col2, ny - 30 - k * 22, W - 40, ny - 30 - k * 22); k += 1
c.setFillColor(MID); c.setFont('Helvetica', 8.5)
c.drawString(40, 30, 'Cuando esté completo: sacale una foto a cada hoja (bien de frente y con buena luz) y mandala en el chat.')
c.drawRightString(W - 40, 30, 'Página 2 de 2')
c.save()
print('ok')
