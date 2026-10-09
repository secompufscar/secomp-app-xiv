from pathlib import Path
from html import escape
import argparse, base64, json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

REPO=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description='Build the illustrative two-page SECOMP certificate; does not issue real certificates.')
parser.add_argument('--output-dir',type=Path,default=REPO/'certificate-model-output')
OUTPUT_ROOT=parser.parse_args().output_dir.resolve()
OUT=OUTPUT_ROOT/'certificado-secomp'
PDF=OUTPUT_ROOT/'pdf/modelo-certificado-secomp-xiv.pdf'
OUT.mkdir(parents=True,exist_ok=True)
PDF.parent.mkdir(parents=True,exist_ok=True)
FONT=REPO/'node_modules/@expo-google-fonts'
DC_LOGO=REPO/'assets/certificate/logo-departamento-computacao-ufscar.png'
fonts={
 'Poppins':FONT/'poppins/400Regular/Poppins_400Regular.ttf',
 'PoppinsMedium':FONT/'poppins/500Medium/Poppins_500Medium.ttf',
 'PoppinsSemiBold':FONT/'poppins/600SemiBold/Poppins_600SemiBold.ttf',
 'Inter':FONT/'inter/Inter_400Regular.ttf',
 'InterMedium':FONT/'inter/Inter_500Medium.ttf',
}
for name,file in fonts.items(): pdfmetrics.registerFont(TTFont(name,str(file)))
W,H=1122,794
EXAMPLE_ACTIVITIES = [
 {'date':'06/10/2026', 'time':'13:00', 'name':'Desenvolvimento de Software com Spec-Driven Development (SDD) - Usando Spec Kit e Aplicando Arquitetura com Harness na Prática', 'category':'Minicurso', 'minutes':180},
 {'date':'07/10/2026', 'time':'14:00', 'name':'Empreendedorismo e Tecnologia', 'category':'Palestra', 'minutes':60},
 {'date':'07/10/2026', 'time':'15:00', 'name':'Acessibilidade em ambientes digitais inclusivos', 'category':'Palestra', 'minutes':60},
 {'date':'07/10/2026', 'time':'16:00', 'name':'Inteligência artificial e o futuro do desenvolvimento de software', 'category':'Palestra', 'minutes':60},
 {'date':'08/10/2026', 'time':'09:00', 'name':'Workshop de desenvolvimento de aplicações web', 'category':'Workshop', 'minutes':120},
 {'date':'08/10/2026', 'time':'13:00', 'name':'Mesa-redonda: carreira, pesquisa e inovação em computação', 'category':'Mesa-redonda', 'minutes':90},
 {'date':'08/10/2026', 'time':'15:00', 'name':'Desafio de programação em equipe', 'category':'Competição', 'minutes':180},
]
# All attendance, times and durations here are illustrative, never production data.
TOTAL_MINUTES = sum(activity['minutes'] for activity in EXAMPLE_ACTIVITIES)
def workload(minutes):
 hours, remainder = divmod(minutes, 60)
 return (f'{hours} hora'+('s' if hours != 1 else '') if hours else '') + ((' e ' if hours else '')+f'{remainder} minuto'+('s' if remainder != 1 else '') if remainder else '')
TOTAL_LABEL = workload(TOTAL_MINUTES)
PW,PH=landscape(A4)
sx,sy=PW/W,PH/H
c=canvas.Canvas(str(PDF),pagesize=(PW,PH))
c.setTitle('Modelo de certificado de participação - XIV SECOMP')
c.setAuthor('SECOMP UFSCar')
c.setSubject('Modelo visual com dados fictícios; não é um certificado emitido.')
c.scale(sx,sy)
svg=[]
BG='#FCFCFF'; DARK='#0B0B0F'; BLUE='#1400FF'; GREEN='#00FF66'; MUTED='#555C6E'
def rgb(color): return tuple(int(color[i:i+2],16)/255 for i in (1,3,5))
def rect(x,y,w,h,fill,stroke=None,sw=1,rx=0):
 c.setFillColorRGB(*rgb(fill)); c.setStrokeColorRGB(*rgb(stroke or fill)); c.setLineWidth(sw)
 if rx:c.roundRect(x,H-y-h,w,h,rx,stroke=bool(stroke),fill=1)
 else:c.rect(x,H-y-h,w,h,stroke=bool(stroke),fill=1)
 svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke or "none"}" stroke-width="{sw}"/>')
def line(x1,y1,x2,y2,color,width=1):
 c.setStrokeColorRGB(*rgb(color)); c.setLineWidth(width); c.line(x1,H-y1,x2,H-y2)
 svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>')
def circle(x,y,r,color):
 c.setFillColorRGB(*rgb(color)); c.circle(x,H-y,r,fill=1,stroke=0)
 svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>')
def text(x,y,value,size=16,font='Inter',color=DARK,id=None,anchor='start'):
 width=pdfmetrics.stringWidth(value,font,size)
 offset=width/2 if anchor=='middle' else width if anchor=='end' else 0
 c.setFillColorRGB(*rgb(color));c.setFont(font,size);c.drawString(x-offset,H-y,value)
 svg.append(f'<text x="{x}" y="{y}" fill="{color}" font-family="{font}" font-size="{size}" text-anchor="{anchor}"'+(f' id="{id}"' if id else '')+f'>{escape(value)}</text>')
def picture(x,y,w,h,file):
 c.drawImage(ImageReader(str(file)),x,H-y-h,w,h,mask='auto')
 data=base64.b64encode(file.read_bytes()).decode()
 svg.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="data:image/png;base64,{data}"/>')

rect(0,0,W,H,BG)
rect(0,0,244,H,DARK)
rect(244,0,5,H,GREEN)
# Existing SECOMP mark, preserved as supplied by the application.
picture(36,4,170,170,REPO/'assets/icon.png')
text(122,194,'SECOMP',28,'PoppinsSemiBold','#FFFFFF',anchor='middle')
text(122,222,'UFSCar / São Carlos',11,'Inter','#A9B4F4',anchor='middle')
line(42,254,202,254,'#29303F')
text(38,365,'XIV',101,'PoppinsSemiBold','#FFFFFF')
rect(42,383,57,4,GREEN)
text(42,433,'Semana',20,'PoppinsMedium','#E5E7F0')
text(42,463,'Acadêmica da',20,'PoppinsMedium','#E5E7F0')
text(42,493,'Computação',20,'PoppinsMedium','#E5E7F0')
# Subtle circuit motif in the dark margin.
for pts in [((42,548),(99,548),(99,588),(184,588),(184,638)),((42,569),(73,569),(73,620),(145,620),(145,685)),((42,643),(103,643),(103,678),(199,678))]:
 for a,b in zip(pts,pts[1:]):line(*a,*b,'#23293A',1.3)
 for pt in [pts[0],pts[-1]]:circle(*pt,3,'#29334B')
text(42,737,'2026',31,'PoppinsMedium',GREEN)
text(42,765,'05 - 08 OUTUBRO',10,'InterMedium','#A9B4F4')
# Main content.
# Shared institutional header: both identities have one alignment and separator.
rect(302,44,3,43,BLUE)
text(320,60,'XIV SECOMP',13,'PoppinsSemiBold',BLUE)
text(320,82,'Semana Acadêmica da Computação',12,'Inter',MUTED)
line(776,44,776,87,'#DCE1ED',1)
picture(807,41,246,246*417/2048,DC_LOGO)
line(302,106,1053,106,'#DCE1ED',1)
text(298,166,'Certificado',53,'PoppinsSemiBold')
text(302,199,'D E   P A R T I C I P A Ç Ã O',12,'InterMedium',MUTED)
text(302,240,'Certificamos que',16,'Inter',MUTED)
text(300,291,'Marina Alves de Souza',37,'PoppinsSemiBold',DARK,id='participant-name')
line(302,311,393,311,BLUE,3)
text(302,355,'participou da XIV Semana Acadêmica da Computação da UFSCar,',16)
text(302,382,'realizada de 5 a 8 de outubro de 2026, em São Carlos - SP.',16)
rect(302,411,751,95,'#EEF0FC',rx=7)
rect(302,426,4,65,BLUE)
text(325,437,'CARGA HORÁRIA TOTAL',10,'InterMedium',MUTED)
text(323,481,TOTAL_LABEL,29,'PoppinsSemiBold',BLUE,id='workload')
line(701,430,701,486,'#D3D8EF')
text(723,449,'Referente às atividades',12,'Inter',MUTED)
text(723,468,'com presença registrada.',12,'Inter',MUTED)
text(302,528,'Relação das atividades e respectivas horas no anexo.',11,'Inter',MUTED)
text(302,550,'São Carlos, 8 de outubro de 2026.',13,'Inter',MUTED,id='issue-date')
# Blank signature area. No autograph or real signatory is invented.
line(302,620,610,620,'#ABB1C2',0.8)
line(665,620,1053,620,'#ABB1C2',0.8)
text(456,644,'[Nome da coordenação]',12,'PoppinsMedium',DARK,id='coordinator-name',anchor='middle')
text(456,665,'Coordenação da XIV SECOMP',11,'Inter',MUTED,anchor='middle')
text(859,644,'[Nome da organização]',12,'PoppinsMedium',DARK,id='organizer-name',anchor='middle')
text(859,665,'Comissão organizadora',11,'Inter',MUTED,anchor='middle')
line(302,701,1053,701,'#E0E3ED')
text(302,734,'SECOMP-XIV-EXEMPLO',11,'InterMedium',DARK)
text(302,755,'MODELO / SEM VALIDADE - Dados fictícios.',10,'Inter',MUTED)
text(710,731,'Validação do certificado',11,'InterMedium',DARK)
text(710,752,'Espaço reservado para código e QR.',10,'Inter',MUTED)
# Clearly reserved QR space, deliberately not a scannable code.
rect(991,716,62,62,'#FFFFFF','#D6DAE8',1,5)
for x,y,dx,dy in [(999,724,1,1),(1045,724,-1,1),(999,770,1,-1),(1045,770,-1,-1)]:
 line(x,y,x+12*dx,y,'#8690AA',1.4);line(x,y,x,y+12*dy,'#8690AA',1.4)
text(1022,753,'QR',14,'InterMedium','#8690AA',anchor='middle')
text(302,780,'Página 1 de 2',9,'Inter',MUTED)
first_svg = list(svg)
c.showPage()
c.scale(sx,sy)
svg=[]

# Attendance annex: the same identity, grid and institutional header.
rect(0,0,W,H,BG)
rect(0,0,244,H,DARK)
rect(244,0,5,H,GREEN)
picture(36,4,170,170,REPO/'assets/icon.png')
text(122,194,'SECOMP',28,'PoppinsSemiBold','#FFFFFF',anchor='middle')
text(122,222,'UFSCar / São Carlos',11,'Inter','#A9B4F4',anchor='middle')
line(42,254,202,254,'#29303F')
text(38,365,'XIV',101,'PoppinsSemiBold','#FFFFFF')
rect(42,383,57,4,GREEN)
text(42,433,'Registro de',20,'PoppinsMedium','#E5E7F0')
text(42,463,'atividades',20,'PoppinsMedium','#E5E7F0')
text(42,493,'realizadas',20,'PoppinsMedium','#E5E7F0')
text(42,737,'2026',31,'PoppinsMedium',GREEN)
text(42,765,'05 - 08 OUTUBRO',10,'InterMedium','#A9B4F4')
rect(302,44,3,43,BLUE)
text(320,60,'XIV SECOMP',13,'PoppinsSemiBold',BLUE)
text(320,82,'Semana Acadêmica da Computação',12,'Inter',MUTED)
line(776,44,776,87,'#DCE1ED')
picture(807,41,246,246*417/2048,DC_LOGO)
line(302,106,1053,106,'#DCE1ED')
text(300,167,'Atividades realizadas',32,'PoppinsSemiBold')
text(302,198,'ANEXO AO CERTIFICADO DE PARTICIPAÇÃO',10,'InterMedium',MUTED)
text(302,231,'Marina Alves de Souza',18,'PoppinsSemiBold',id='participant-name-details')
rect(302,254,751,35,'#EEF0FC',rx=5)
text(318,277,'DATA / INÍCIO',10,'InterMedium',MUTED)
text(453,277,'ATIVIDADE COM PRESENÇA',10,'InterMedium',MUTED)
text(1037,277,'HORAS',10,'InterMedium',MUTED,anchor='end')

def wrap(value, width, size=13):
 lines=[]; current=''
 for word in value.split():
  candidate=(current+' '+word).strip()
  if current and pdfmetrics.stringWidth(candidate,'Inter',size)>width:
   lines.append(current); current=word
  else: current=candidate
 if current: lines.append(current)
 return lines

y=299
for activity in EXAMPLE_ACTIVITIES:
 title_lines=wrap(activity['name'],455)
 row_height=18*len(title_lines)+27
 text(318,y+15,activity['date'],11,'InterMedium')
 text(318,y+33,activity['time'],11,'Inter',MUTED)
 for i,value in enumerate(title_lines):text(453,y+15+18*i,value,13)
 text(453,y+15+18*len(title_lines),activity['category'],10,'Inter',MUTED)
 hours,minutes=divmod(activity['minutes'],60)
 text(1037,y+15,f'{hours}h'+(f' {minutes:02d}min' if minutes else ''),12,'InterMedium',anchor='end')
 line(302,y+row_height,1053,y+row_height,'#E0E3ED')
 y+=row_height+5
assert y<=679, 'Activity annex exceeds printable space'
text(302,y+28,'CARGA HORÁRIA TOTAL',10,'InterMedium',MUTED)
text(1053,y+28,TOTAL_LABEL,18,'PoppinsSemiBold',BLUE,anchor='end')
line(302,717,1053,717,'#E0E3ED')
text(302,740,'SECOMP-XIV-EXEMPLO',11,'InterMedium')
text(302,760,'MODELO / SEM VALIDADE - Presenças e durações ilustrativas.',10,'Inter',MUTED)
text(1053,780,'Página 2 de 2',9,'Inter',MUTED,anchor='end')
c.showPage();c.save()
second_svg = list(svg)
svg=first_svg

font_css='\n'.join('@font-face{font-family:"'+name+'";src:url(data:font/ttf;base64,'+base64.b64encode(file.read_bytes()).decode()+') format("truetype");font-weight:400;font-style:normal;}' for name,file in fonts.items())
svg_markup='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1122 794" role="img" aria-labelledby="certificate-title"><title id="certificate-title">Modelo de certificado da XIV SECOMP com dados fictícios</title>'+''.join(svg)+'</svg>'
# SVG stores embedded fonts; edit it in a compatible vector editor.
standalone_svg=svg_markup.replace('<title','<defs><style>'+font_css+'</style></defs><title',1)
(OUT/'modelo-certificado-secomp-xiv.svg').write_text(standalone_svg,encoding='utf8')
annex_svg=svg_markup.replace(''.join(first_svg),''.join(second_svg)).replace('Modelo de certificado da XIV SECOMP com dados fictícios','Anexo ilustrativo das atividades da XIV SECOMP').replace('certificate-title','certificate-activities-title')
(OUT/'modelo-certificado-secomp-xiv-atividades.svg').write_text(annex_svg.replace('<title','<defs><style>'+font_css+'</style></defs><title',1),encoding='utf8')
html='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Modelo de certificado | XIV SECOMP</title><style>__FONTS__
*{box-sizing:border-box}body{margin:0;background:#E8EBF3;color:#171923;font-family:Inter,Arial,sans-serif}.toolbar{padding:28px 32px;background:#fff;border-bottom:1px solid #d7dce9}.toolbar-inner{max-width:1122px;margin:auto}h1{margin:0 0 8px;font-family:PoppinsSemiBold;font-size:24px}.intro{margin:0;color:#555c6e;line-height:1.6;font-size:14px}.fields{display:grid;grid-template-columns:2fr 1.6fr 1.6fr;gap:16px;margin-top:22px}label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#475064}input{min-height:44px;border:1px solid #cbd2e2;border-radius:6px;padding:10px 12px;font:14px Inter;color:#171923;background:#fcfcff;width:100%}input:focus{outline:2px solid #1400ff;outline-offset:2px}.controls{display:flex;gap:12px;align-items:center;margin-top:20px;flex-wrap:wrap}button{border:0;background:#1400ff;color:white;min-height:44px;padding:11px 18px;border-radius:6px;font:13px InterMedium;cursor:pointer}button.secondary{background:#eef0fc;color:#1400ff}.note{font-size:12px;color:#606779}.stage{padding:38px 24px}.sheet{max-width:1122px;margin:auto;box-shadow:0 20px 70px #1c254322;line-height:0;background:#FCFCFF}.sheet svg{display:block;width:100%;height:auto}.caption{max-width:1122px;margin:18px auto 0;line-height:1.6;font-size:12px;color:#596176} @media(max-width:700px){.toolbar{padding:22px 18px}.fields{grid-template-columns:1fr}.stage{padding:22px 12px}h1{font-size:20px}}@page{size:A4 landscape;margin:0}@media print{body{background:white}.toolbar,.caption{display:none}.stage{padding:0}.sheet{max-width:none;width:297mm;height:210mm;box-shadow:none}.sheet svg{width:297mm;height:210mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><header class="toolbar"><div class="toolbar-inner"><h1>Certificado de participação</h1><p class="intro">Proposta visual para a XIV SECOMP. Edite os campos para avaliar o modelo. Esta prévia usa dados fictícios e não emite um certificado válido.</p><div class="fields"><label>Nome do participante<input id="name" value="Marina Alves de Souza" maxlength="180"></label><label>Carga horária de exemplo<input id="hours" value="12 horas e 30 minutos" maxlength="45"></label><label>Local e data de emissão<input id="date" value="São Carlos, 8 de outubro de 2026." maxlength="100"></label><label>Nome da coordenação<input id="coordinator" value="[Nome da coordenação]" maxlength="100"></label><label>Nome da organização<input id="organizer" value="[Nome da organização]" maxlength="100"></label></div><div class="controls"><button type="button" id="print">Imprimir modelo / salvar PDF</button><button type="button" class="secondary" id="reset">Restaurar exemplo</button><span class="note">A4 horizontal. Ative os gráficos de fundo e use escala de 100%.</span></div></div></header><main class="stage"><div class="sheet">__SVG__</div><p class="caption">Paleta e tipografia do app da SECOMP. A carga horária definitiva deve vir das presenças registradas; nomes de responsáveis, assinaturas e validação serão definidos antes da emissão. Nenhum dado é enviado ao servidor.</p></main><script>
const mapping={name:'participant-name',hours:'workload',date:'issue-date',coordinator:'coordinator-name',organizer:'organizer-name'};
const defaults={};for(const [inputId,svgId] of Object.entries(mapping)){const input=document.getElementById(inputId);defaults[inputId]=input.value;input.addEventListener('input',()=>update(inputId,svgId));}
function update(inputId,svgId){const target=document.getElementById(svgId);target.textContent=document.getElementById(inputId).value||' ';const sizes={name:37,hours:29,date:13,coordinator:12,organizer:12};const widths={name:751,hours:352,date:751,coordinator:305,organizer:386};let size=sizes[inputId];target.setAttribute('font-size',size);while(target.getComputedTextLength()>widths[inputId]&&size>10){size-=.5;target.setAttribute('font-size',size);}}
document.getElementById('print').addEventListener('click',()=>window.print());document.getElementById('reset').addEventListener('click',()=>{for(const [inputId,svgId] of Object.entries(mapping)){document.getElementById(inputId).value=defaults[inputId];update(inputId,svgId);}});document.fonts.ready.then(()=>{for(const [a,b]of Object.entries(mapping))update(a,b);});
</script></body></html>'''.replace('__FONTS__',font_css).replace('__SVG__',svg_markup)
html=html.replace('<div class="sheet">'+svg_markup+'</div>', '<div class="sheet">'+svg_markup+'</div><div class="sheet annex">'+annex_svg+'</div>')
html=html.replace('</style></head>', '.annex{margin-top:32px}@media print{.sheet{break-after:page}.sheet:last-of-type{break-after:auto}.annex{margin-top:0}}\n</style></head>')
html=html.replace('id="hours" value="12 horas e 30 minutos" maxlength="45"', 'id="hours" value="'+TOTAL_LABEL+'" readonly')
html=html.replace('Carga horária de exemplo', 'Soma das atividades ilustrativas')
html=html.replace("name:'participant-name',hours:'workload',date:", "name:'participant-name',date:")
html=html.replace("target.textContent=document.getElementById(inputId).value||' ';", "target.textContent=document.getElementById(inputId).value||' ';if(inputId==='name'){document.getElementById('participant-name-details').textContent=target.textContent;}")
html=html.replace('A carga horária definitiva deve vir das presenças registradas;', 'O credenciamento da edição comprova a doação e permite a emissão; ele não soma horas. O anexo e as durações deste modelo são fictícios. A carga horária definitiva deve somar as durações das atividades com presença registrada;')
(OUT/'modelo-certificado-secomp-xiv.html').write_text(html,encoding='utf8')
reader=PdfReader(str(PDF))
assert len(reader.pages)==2
content=reader.pages[0].extract_text()
for expected in ['Marina Alves de Souza','12 horas e 30 minutos','SEM VALIDADE','presença registrada','5 a 8 de outubro de 2026']:assert expected in content,expected
annex_text=reader.pages[1].extract_text()
for activity in EXAMPLE_ACTIVITIES:assert activity['name'].split()[0] in annex_text
assert TOTAL_LABEL in annex_text
print(json.dumps({'pdf':str(PDF),'html':str(OUT/'modelo-certificado-secomp-xiv.html'),'svg':str(OUT/'modelo-certificado-secomp-xiv.svg'),'pages':2,'minutes':TOTAL_MINUTES,'textChecksPassed':True},ensure_ascii=False))
