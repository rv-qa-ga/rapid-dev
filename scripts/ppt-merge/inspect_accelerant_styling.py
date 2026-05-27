"""Peek at a few of Accelerant's original slides to see how their own bullets are styled."""
import io
import sys
from pathlib import Path
from pptx import Presentation
from pptx.util import Emu
from lxml import etree

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

TMPL = Path(r"C:\Automation\docs\ppt\Accelerant_PPT Training.pptx")
prs = Presentation(str(TMPL))
print(f"Slides in template file: {len(prs.slides)}")

# Find slides using 'Title and Content' layouts and show their body placeholder XML
interesting = []
for i, slide in enumerate(prs.slides):
    lname = slide.slide_layout.name
    if "Title and Content" in lname or "Header_Subtitle_Content" in lname:
        interesting.append((i, slide, lname))

print(f"\nSlides using Title/Content layouts: {len(interesting)}")
for idx, slide, lname in interesting[:3]:
    print("=" * 70)
    print(f"Slide {idx} layout={lname!r}")
    title = ""
    if slide.shapes.title and slide.shapes.title.has_text_frame:
        title = slide.shapes.title.text_frame.text[:80]
    print(f"Title: {title!r}")
    for sh in slide.shapes:
        if not sh.is_placeholder or not sh.has_text_frame:
            continue
        pt = sh.placeholder_format.type
        if pt is None or "TITLE" in str(pt):
            continue
        print(f"\n--- Placeholder idx={sh.placeholder_format.idx} type={pt} name={sh.name!r}")
        print(f"    position: L={Emu(sh.left).inches:.2f}in T={Emu(sh.top).inches:.2f}in "
              f"W={Emu(sh.width).inches:.2f}in H={Emu(sh.height).inches:.2f}in")
        tf = sh.text_frame
        print(f"    anchor={tf.vertical_anchor} word_wrap={tf.word_wrap}")
        for pi, p in enumerate(tf.paragraphs[:6]):
            text = p.text[:80]
            size = None
            bold = None
            color = None
            for run in p.runs:
                if run.font.size:
                    size = run.font.size.pt
                if run.font.bold is not None:
                    bold = run.font.bold
                try:
                    if run.font.color and run.font.color.rgb:
                        color = str(run.font.color.rgb)
                except Exception:
                    pass
                break
            print(f"    para[{pi}] level={p.level} size={size} bold={bold} color={color} text={text!r}")
        # Show raw XML of first two paragraphs for bullet inspection
        xml = etree.tostring(sh._element, pretty_print=True).decode()
        snippet = "\n".join(xml.splitlines()[:40])
        print("    --- XML snippet ---")
        print("    " + snippet.replace("\n", "\n    "))
    if idx >= interesting[0][0] + 10:
        break
