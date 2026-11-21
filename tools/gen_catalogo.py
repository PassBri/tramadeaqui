# -*- coding: utf-8 -*-
import os, json, tempfile, datetime
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle, Paragraph,
                                Spacer, Image as RLImage, PageBreak, KeepTogether)
from reportlab.lib.pdfencrypt import StandardEncryption
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
_dv="/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Serif",f"{_dv}/DejaVuSerif.ttf"))
pdfmetrics.registerFont(TTFont("SerifB",f"{_dv}/DejaVuSerif-Bold.ttf"))
pdfmetrics.registerFont(TTFont("SerifI",f"{_dv}/DejaVuSerif-Italic.ttf"))
import sys
MOVIL = (len(sys.argv)>1 and sys.argv[1]=="movil")
COLS = 2 if MOVIL else 3
IMGW = 58*mm if MOVIL else 36*mm
FS = 1.45 if MOVIL else 1.0
OUTNAME = (os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+"/docs/trama-catalogo-movil-9x4k7m.pdf") if MOVIL else (os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+"/docs/trama-catalogo-9x4k7m.pdf")

REPO=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THUMB=f"{REPO}/assets/img/productos/thumb"
d=json.load(open(f"{REPO}/data/productos.json"))
prods=d["productos"]
catname={c["id"]:c["nombre"] for c in d["categorias"]}
secs=d["secciones"]  # orden
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
VERDE=colors.HexColor("#2E4A30"); TERRA=colors.HexColor("#9A5228"); MUT=colors.HexColor("#857A69")
tmp=tempfile.mkdtemp()

def money(n): return "$"+f"{n:,}".replace(",",".")

def watermark(pid, code, W=320):
    src=f"{THUMB}/{pid}.webp"
    if not os.path.exists(src): return None,1.0
    im=Image.open(src).convert("RGBA")
    H=round(W*im.height/im.width); im=im.resize((W,H),Image.LANCZOS)
    # banda inferior con el código
    dd=ImageDraw.Draw(im); dd.rectangle([0,H-30,W,H],fill=(46,74,48,210))
    dd.text((7,H-26),code,font=ImageFont.truetype(FONT,20),fill=(255,255,255,255))
    out=f"{tmp}/{pid}.jpg"; im.convert("RGB").save(out,"JPEG",quality=68)
    return out,im.height/im.width

stName=ParagraphStyle("n",fontName="Helvetica-Bold",fontSize=7.3*FS,leading=8.6*FS,textColor=colors.HexColor("#2F2A22"))
stCod=ParagraphStyle("c",fontName="Helvetica-Bold",fontSize=7.5*FS,leading=9*FS,textColor=TERRA)
stCat=ParagraphStyle("ca",fontName="Helvetica",fontSize=6.3*FS,leading=7.4*FS,textColor=MUT)
stSec=ParagraphStyle("s",fontName="Helvetica-Bold",fontSize=12*FS,leading=14*FS,textColor=colors.white)
stH1=ParagraphStyle("h1",fontName="Helvetica-Bold",fontSize=26,leading=30,textColor=VERDE)
stH2=ParagraphStyle("h2",fontName="Helvetica",fontSize=11,leading=15,textColor=colors.HexColor("#544C40"))

def cell(p):
    img,ratio=watermark(p["id"],p["codigo"])
    fl=[]
    if img:
        ri=RLImage(img,width=IMGW,height=IMGW*ratio); ri.hAlign="CENTER"; fl.append(ri)
    fl.append(Spacer(1,1.5*mm))
    fl.append(Paragraph(f'{p["codigo"]} &nbsp;·&nbsp; {money(p["precio"])}',stCod))
    fl.append(Paragraph(p["nombre"],stName))
    fl.append(Paragraph(catname.get(p["categoria"],p["categoria"]),stCat))
    return fl

MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto",
       "septiembre","octubre","noviembre","diciembre"]
hoy=datetime.date.today(); fecha=f"{hoy.day} de {MESES[hoy.month-1]} de {hoy.year}"

# Bolso destacado de la portada: T0323 (estable). Si algún día no existe, usa el primero.
_inv={v:k for k,v in json.load(open(f"{REPO}/data/codigos.json")).items()}
COVER_ID=_inv.get("T0323") or prods[0]["id"]
COVER_IMG=f"{REPO}/assets/img/productos/{COVER_ID}.jpg"

def portada(canvas, doc):
    canvas.saveState()
    W,H=A4; cx=W/2
    canvas.setFillColor(colors.HexColor("#F3ECDD")); canvas.rect(0,0,W,H,fill=1,stroke=0)
    # banda superior verde con logo
    bandH=36*mm
    canvas.setFillColor(VERDE); canvas.rect(0,H-bandH,W,bandH,fill=1,stroke=0)
    canvas.setFillColor(TERRA); canvas.rect(0,H-bandH-1.4*mm,W,1.4*mm,fill=1,stroke=0)
    try: canvas.drawImage(f"{REPO}/assets/img/marca/mark-light.png",20*mm,H-bandH+9.5*mm,
            width=17*mm,height=17*mm,mask="auto",preserveAspectRatio=True)
    except Exception: pass
    canvas.setFillColor(colors.HexColor("#F3ECDD")); canvas.setFont("Serif",18)
    canvas.drawString(42*mm,H-bandH+14*mm,"Trama de Aquí")
    canvas.setFont("Serif",8.5); canvas.setFillColor(colors.HexColor("#CBD9C4"))
    canvas.drawString(42*mm,H-bandH+7.5*mm,"Bolsos con diseños de Colombia")
    # marco fino en la zona crema (toque de edición)
    fTop=H-bandH-9*mm; fBot=24*mm; ins=11*mm
    canvas.setStrokeColor(colors.HexColor("#CBB68C")); canvas.setLineWidth(0.8)
    canvas.rect(ins,fBot,W-2*ins,fTop-fBot,fill=0,stroke=1)
    # título centrado
    canvas.setFillColor(TERRA); canvas.setFont("SerifI",13)
    canvas.drawCentredString(cx,fTop-30*mm,"Catálogo")
    canvas.setFillColor(VERDE); canvas.setFont("SerifB",44)
    canvas.drawCentredString(cx,fTop-47*mm,"Maestro")
    canvas.setFillColor(colors.HexColor("#857A69")); canvas.setFont("Serif",12)
    canvas.drawCentredString(cx,fTop-55*mm,"de diseños")
    canvas.setStrokeColor(TERRA); canvas.setLineWidth(1.1)
    canvas.line(cx-22*mm,fTop-61*mm,cx+22*mm,fTop-61*mm)
    # bolso centrado sobre tarjeta con sombra suave
    bw=60*mm; bh=bw*741/420; bx=cx-bw/2; btop=fTop-66*mm; by=btop-bh
    canvas.setFillColor(colors.Color(0,0,0,0.05)); canvas.roundRect(bx-4*mm,by-5*mm-1.5*mm,bw+8*mm,bh+9*mm,6*mm,fill=1,stroke=0)
    canvas.setFillColor(colors.white); canvas.roundRect(bx-4*mm,by-5*mm,bw+8*mm,bh+9*mm,6*mm,fill=1,stroke=0)
    try: canvas.drawImage(COVER_IMG,bx,by,width=bw,height=bh,mask="auto",preserveAspectRatio=True)
    except Exception: pass
    # estadísticas bajo el bolso
    sy=by-5*mm-8*mm
    canvas.setFillColor(VERDE); canvas.setFont("SerifB",15)
    canvas.drawCentredString(cx,sy,f"{len(prods)} diseños")
    canvas.setFillColor(colors.HexColor("#544C40")); canvas.setFont("Serif",10.5)
    canvas.drawCentredString(cx,sy-7*mm,f"{len(secs)} colecciones  ·  {fecha}")
    # pie
    canvas.setFillColor(VERDE); canvas.rect(0,0,W,16*mm,fill=1,stroke=0)
    canvas.setFillColor(TERRA); canvas.rect(0,16*mm,W,1.4*mm,fill=1,stroke=0)
    canvas.setFillColor(colors.HexColor("#CBD9C4")); canvas.setFont("SerifI",8.5)
    canvas.drawCentredString(W/2,8.5*mm,"Documento interno · Código · Nombre · Categoría · Precio")
    canvas.drawCentredString(W/2,4.5*mm,"Imágenes en baja resolución, no aptas para reproducción.")
    canvas.restoreState()

story=[PageBreak()]

colw=(A4[0]-24*mm-0)/COLS
for s in secs:
    items=[p for p in prods if p["seccion"]==s["id"]]
    if not items: continue
    # cabecera de sección
    hdr=Table([[Paragraph(f'{s["nombre"]}  ({len(items)})',stSec)]],colWidths=[A4[0]-24*mm])
    hdr.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),VERDE),("LEFTPADDING",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    story.append(Spacer(1,3*mm)); story.append(hdr); story.append(Spacer(1,2.5*mm))
    # grilla
    rows=[]; row=[]
    for p in items:
        row.append(cell(p))
        if len(row)==COLS: rows.append(row); row=[]
    if row:
        while len(row)<COLS: row.append("")
        rows.append(row)
    t=Table(rows,colWidths=[colw]*COLS)
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("ALIGN",(0,0),(-1,-1),"CENTER"),("TOPPADDING",(0,0),(-1,-1),4),
        ("BOTTOMPADDING",(0,0),(-1,-1),7),("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4)]))
    story.append(t)

enc=StandardEncryption("", ownerPassword="trama-maestro-2026",
    canPrint=1, canModify=0, canCopy=0, canAnnotate=0)
doc=SimpleDocTemplate(OUTNAME,pagesize=A4,
    leftMargin=12*mm,rightMargin=12*mm,topMargin=12*mm,bottomMargin=12*mm,
    title="Trama de Aquí — Catálogo maestro",author="Trama de Aquí",encrypt=enc)
doc.build(story,onFirstPage=portada)
print("PDF listo:",len(prods),"productos")
