# Generates the $ASYQ token image (SVG) — rendered to PNG with a headless browser.
import math
S=1024; C=S/2
def curl(cx,cy,ang,h,col):
    # a ram-horn pair ("qoshqar muiz") rotated to face the coin's centre
    p=[]
    for d in (-1,1):
        p.append(f'<path d="M0 {h*0.3} L0 0 C0 {-h*0.34} {d*h*0.44} {-h*0.34} {d*h*0.44} {-h*0.02} C{d*h*0.44} {h*0.17} {d*h*0.2} {h*0.17} {d*h*0.2} {h*0.02}" />')
    return f'<g transform="translate({cx:.1f} {cy:.1f}) rotate({ang:.2f})" fill="none" stroke="{col}" stroke-width="{h*0.085:.1f}" stroke-linecap="round">{"".join(p)}</g>'
band_r=432; n=16
curls="".join(curl(C+band_r*math.cos(a), C+band_r*math.sin(a), math.degrees(a)+90, 80, "#f6cf63") for a in [i*2*math.pi/n for i in range(n)])
rays="".join(f'<path d="M{C} {C} L{C+400*math.cos(a-0.045):.1f} {C+400*math.sin(a-0.045):.1f} L{C+400*math.cos(a+0.045):.1f} {C+400*math.sin(a+0.045):.1f} Z" fill="#ffffff" opacity="0.07"/>' for a in [i*2*math.pi/32 for i in range(32)])
L,H,W=300,195,125
bone=f"M{-L} 0 C{-L} {-H*1.05} {-L*0.35} {-H*1.05} 0 {-W} C{L*0.35} {-H*1.05} {L} {-H*1.05} {L} 0 C{L} {H*1.05} {L*0.35} {H*1.05} 0 {W} C{-L*0.35} {H*1.05} {-L} {H*1.05} {-L} 0 Z"
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">
<defs>
 <radialGradient id="field" cx="0.45" cy="0.38" r="0.7"><stop offset="0" stop-color="#21c3dc"/><stop offset="0.65" stop-color="#0a8fb0"/><stop offset="1" stop-color="#065d7a"/></radialGradient>
 <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset="0.35" stop-color="#f2c14e"/><stop offset="0.7" stop-color="#b07a1c"/><stop offset="1" stop-color="#f6d77a"/></linearGradient>
 <linearGradient id="bone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="0.45" stop-color="#efe4cc"/><stop offset="1" stop-color="#b9a37b"/></linearGradient>
 <linearGradient id="sol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9945ff"/><stop offset="1" stop-color="#14f195"/></linearGradient>
 <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#032c3a" flood-opacity="0.55"/></filter>
</defs>
<circle cx="{C}" cy="{C}" r="508" fill="url(#rim)"/>
<circle cx="{C}" cy="{C}" r="480" fill="#8f2a22"/>
<circle cx="{C}" cy="{C}" r="480" fill="none" stroke="#5e1712" stroke-width="6"/>
{curls}
<circle cx="{C}" cy="{C}" r="384" fill="url(#rim)"/>
<circle cx="{C}" cy="{C}" r="370" fill="url(#field)"/>
<g>{rays}</g>
<circle cx="{C}" cy="{C}" r="300" fill="none" stroke="url(#sol)" stroke-width="10" opacity="0.9"/>
<g transform="translate({C} {C-40}) rotate(-18)" filter="url(#sh)">
 <path d="{bone}" fill="url(#bone)" stroke="#6b5636" stroke-width="12"/>
 <path d="M-15 {-W*1.25} Q55 0 -15 {W*1.25}" stroke="#8a744f" stroke-width="16" fill="none" stroke-linecap="round"/>
 <ellipse cx="{-L*0.52}" cy="12" rx="44" ry="30" fill="#8f7854" transform="rotate(17 {-L*0.52} 12)"/>
 <ellipse cx="{L*0.4}" cy="{-H*0.45}" rx="80" ry="34" fill="#ffffff" opacity="0.45" transform="rotate(-22 {L*0.4} {-H*0.45})"/>
</g>
<text x="{C}" y="{C+250}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="118" letter-spacing="10" fill="#ffe08a" stroke="#4a2d05" stroke-width="10" paint-order="stroke">ASYQ</text>
</svg>'''
open('asyq-token.svg','w').write(svg)
