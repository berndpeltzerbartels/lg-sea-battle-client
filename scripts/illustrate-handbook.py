#!/usr/bin/env python3
"""Place real game captures and separate SVG annotations in the player handbook.
Run the opt-in manual-images.capture.spec.js first. Original captures stay unchanged.
"""
from pathlib import Path
from html import escape
import json, re, struct
ROOT = Path(__file__).resolve().parents[1] / 'public' / 'handbuch'
IMAGES = ROOT / 'images'
USED = set()
def size(name):
    return struct.unpack('>II', (IMAGES / (name+'.png')).read_bytes()[16:24])
def badge(n,x,y,tx=None,ty=None,r=20,color='#e7b36c'):
    line = '' if tx is None else f'<path d="M{x} {y} L{tx} {ty}" fill="none" stroke="{color}" stroke-width="2.5"/><circle cx="{tx}" cy="{ty}" r="5" fill="none" stroke="{color}" stroke-width="2"/>'
    return line+f'<circle cx="{x}" cy="{y}" r="{r}" fill="#071e2a" stroke="{color}" stroke-width="2.5"/><text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="{r*1.15}" font-weight="750" fill="#fff">{n}</text>'
def box(x,y,w,h,color='#e7b36c'):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{color}" fill-opacity=".07" stroke="{color}" stroke-width="3"/>'
def shot(name,alt,crop=None,marks='',maxwidth=None):
    USED.add(name+'.png')
    w,h=size(name);x,y,cw,ch=crop or (0,0,w,h)
    image_style=f'width:{w/cw*100:.5f}%;left:{-x/cw*100:.5f}%;top:{-y/ch*100:.5f}%;'
    style=f'aspect-ratio:{cw}/{ch};'+(f'max-width:{maxwidth}px;' if maxwidth else '')
    svg=f'<svg class="shot-marks" viewBox="0 0 {cw} {ch}" aria-hidden="true">{marks}</svg>' if marks else ''
    return f'<a class="shot-link" href="../images/{name}.png" target="_blank" rel="noopener" title="Spielaufnahme in Originalgröße öffnen"><div class="shot-frame" style="{style}"><img src="../images/{name}.png" alt="{escape(alt,quote=True)}" loading="lazy" decoding="async" width="{w}" height="{h}" style="{image_style}">{svg}</div></a>'
def legend(items):
    return '<ol class="image-legend">'+''.join(f'<li><span>{i}</span>{text}</li>' for i,text in enumerate(items,1))+'</ol>'
def label(text): return f'<p class="shot-label">{text}</p>'
def fig(slot,content,caption):
    return f'<figure class="manual-figure" data-illustration="{slot}">{content}<figcaption>{caption} <span class="zoom-note">Aufnahme anklicken für die Originalgröße.</span></figcaption></figure>'
def layout(name,selector):
    b=json.loads((IMAGES/(name+'-layout.json')).read_text())[selector]
    return (b['x'],b['y'],b['width'],b['height'])
def overview(name,sub=False):
    positions = [(1,344,38),(2,344,385),(3,344,838 if sub else 792),(4,1190,920),(5,1560,178),(6,344,930)] if sub else [(1,344,38),(2,344,385),(3,344,792),(4,1190,920),(5,1560,178),(6,1490,940)]
    marks=''.join(badge(n,x,y) for n,x,y in positions)
    names=['Landkarte: eigener Standort und Sektoren.','Radar: Kontakte und laufende Torpedos.','Positionen: hier wechselst du deinen Platz.','Fahrt und Ruder: das Boot braucht Zeit zum Reagieren.','Players: Kennung, Wertung und Peilung.','Tauchtiefe: aufgetaucht, Sehrohr oder tief.' if sub else 'H öffnet die Hilfe für deine aktuelle Position.']
    return shot(name,'Brückenansicht mit sechs nummerierten Bedienelementen.',marks=marks)+legend(names)
radar_marks=badge(1,78,158,114,136,r=11,color='#7fd7ff')+badge(2,293,114,246,121,r=11,color='#ff8b70')+badge(3,297,280,252,247,r=11)
figures={}
figures['01']=fig('01',overview('boat-bridge'),'Die Brücke des Torpedoboots. Die Nummern entsprechen der Legende unter der Aufnahme.')
figures['U01']=fig('U01',overview('sub-bridge',True),'Aufgetauchtes U-Boot: Die Tiefenwahl kommt zu den gemeinsamen Anzeigen hinzu.')
figures['02']=fig('02',shot('radar-surface','Farbiges Radar: blauer Freund links, orangefarbener Gegner rechts, heller Torpedostrich unten rechts.',marks=radar_marks,maxwidth=430)+legend(['Hellblauer Kontakt: eigenes Team.','Orangefarbener Kontakt: Gegner.','Kurzer heller Strich: laufender Torpedo.']), 'Radar einer Beispielsituation. Die farbigen Kreise und Nummern sind nachträgliche Markierungen; die Kontakte stammen aus dem Spiel.')
map_marks=badge(1,240,140,204,151,r=11)+badge(2,93,328,45,328,r=11)
player_marks=badge(3,56,10,40,33,r=9)+badge(4,137,10,138,33,r=9)+badge(5,174,82,159,34,r=9)
figures['03']=fig('03','<div class="figure-grid">'+label('Karte')+shot('map-players','Kartenausschnitt mit eigener Position und Sektor J10.',crop=layout('map-players','.nav-instrument-map'),marks=map_marks)+label('Players')+shot('map-players','Spielerliste mit Kennung, Wertung und Peilung.',crop=layout('map-players','.player-list'),marks=player_marks)+'</div>'+legend(['Eigenes Boot auf der Karte.','Eigener Kartensektor.','Spielerkennung in der Liste.','Wertung – kein reiner Trefferzähler.','Peilung zum angezeigten Schiff.']), 'Karte und Spielerliste sind Ausschnitte derselben Aufnahme. Die Namen gehören zur nachgestellten Beispielsituation.')
station_marks=badge(1,195,64,152,62,r=10,color='#7fd7ff')+badge(2,105,22,57,22,r=10,color='#ff8b70')+badge(3,279,21,230,21,r=10)
figures['04']=fig('04',shot('boat-stations','Schiffsübersicht: Brücke aktiv, Flak besetzt, Kanone frei.',marks=station_marks,maxwidth=570)+legend(['Hellblau: hier bist du gerade, in diesem Beispiel auf der Brücke.','Orange: die Flak ist durch ein anderes Mannschaftsmitglied besetzt.','Ohne farbige Besetzung: die Kanone ist frei.']), 'Du kannst mit den Schaltflächen oder ihren Tasten zwischen freien Positionen wechseln.')
figures['05']=fig('05',shot('boat-lookout','Ein Torpedoboot im Fernglas; darunter die Knöpfe zum Übernehmen einer freien Kanone und zum Anfragen der besetzten Flak.',crop=(480,145,960,855)), 'Im Ausguck mit eingeschaltetem Fernglas. Unten ist die Kanone frei: C richtet sie auf den Blick aus und übernimmt sie. Die Flak ist von Finn besetzt; F fragt dort nach Zustimmung. Diese Aufnahme zeigt eine nachgestellte Zielsituation.')
profile_marks=box(425,20,230,150,'#9ddbd3')+box(38,178,880,48)+badge(1,690,55,655,70,r=16,color='#9ddbd3')+badge(2,930,242,865,207,r=16)
figures['06']=fig('06',shot('boat-side-canvas','Seitenansicht des echten Torpedoboot-Modells mit markierten Aufbauten und Rumpf.',crop=(80,330,1000,300),marks=profile_marks)+legend(['Flak: auf die Aufbauten zielen. Die Markierung zeigt den Bereich oberhalb des Decks.','Kanone: auch Treffer am Rumpf sind wirksam. Die Einschränkung der Flak gilt für sie nicht.']), 'Zwei unterschiedliche Trefferregeln, am Spielmodell eingezeichnet. Merke dir für die Flak den Bereich oberhalb des Decks.')
figures['10']=fig('10','<div class="figure-grid"><div>'+label('Auf der Brücke')+shot('boat-help','Geöffnete H-Tastenhilfe auf der Brücke.',crop=layout('boat-help','#roleHotkeys'))+'</div><div>'+label('Im Ausguck')+shot('boat-lookout-help','Geöffnete H-Tastenhilfe im Ausguck.',crop=layout('boat-lookout-help','#roleHotkeys'))+'</div></div>', 'Die echte Tastenhilfe passt sich an die Position an. Mit H oder Esc schließt du sie wieder.')
figures['U02']=fig('U02','<div class="figure-grid"><div>'+label('Oberflächenradar')+shot('radar-surface','Farbiges Radar mit Teamfarben.')+'</div><div>'+label('Unterwasseranzeige')+shot('sub-sonar','Einfarbige Unterwasseranzeige mit Konturen und Torpedostrich.')+'</div></div>', 'Über Wasser und auf Sehrohrtiefe helfen die Teamfarben. Tiefer getaucht sind die Kontakte einfarbig; helle Konturen sind dort keine Freundfarbe. Reichweite und Ausschnitt der Anzeigen unterscheiden sich.')
obs_marks=box(686,250,110,44)+badge(1,841,272,796,272)+badge(2,1460,800,1544,849)+badge(3,1113,745,991,745)
figures['U04']=fig('U04',label('1 · Mit 2 rundum schauen')+shot('sub-observation','360-Grad-Sehrohr: Blickpeilung 032 Grad bei unverändertem Bootskurs 000 Grad.',marks=obs_marks)+legend(['Blickpeilung 032°: dorthin zeigt das Sehrohr.','Bootskurs 000°: der Bug zeigt noch woandershin.','Taste 3 übernimmt diese Peilung als gewünschten Kurs.'])+label('2 · Mit 3 das Boot nachdrehen lassen')+shot('sub-aligning','Nach Taste 3: das Boot dreht auf die zuvor gewählte Peilung. Die Anzeige zeigt aktuellen und gewünschten Kurs.')+label('3 · Fahr- und Zielsehrohr voraus')+shot('sub-forward','Fahr- und Zielsehrohr nach vorn; Taste 1 wählt diese Ansicht direkt.'), 'Die Ansichten zeigen die Bedienung: 2 zum Suchen, 3 zum Ausrichten, 1 für die Sicht voraus. Beim Ausrichten werden aktueller und gewünschter Kurs angezeigt. Ein bewegtes Ziel musst du danach erneut prüfen; die Peilung ist keine automatische Zielverfolgung.')
figures['U07']=fig('U07',shot('sub-help','Tastenhilfe des U-Boots mit den Sehrohrfunktionen 1, 2 und 3.',crop=layout('sub-help','#roleHotkeys'),maxwidth=420), 'Die Tastenhilfe auf Sehrohrtiefe. Die Sehrohrfunktionen gehören zusammen: 1 voraus, 2 Rundumblick, 3 Boot auf Peilung.')
count=0
for page in ROOT.glob('*/*.html'):
    text=page.read_text()
    def replace(match):
        global count
        markup=match.group(0)
        key=re.search(r'data-illustration="([^"]+)"',markup) or re.search(r'BILD ([A-Z]?\d+)</span>',markup)
        if key and key[1] in figures:
            count+=1
            return figures[key[1]]
        return markup
    text=re.sub(r'<figure class="(?:image-slot|manual-figure)"[^>]*>.*?</figure>',replace,text,flags=re.S)
    page.write_text(text)
print(f'Illustrated {count} image slots; using {len(USED)} original captures.')
(IMAGES/'used-images.json').write_text(json.dumps(sorted(USED),indent=2)+'\n')
