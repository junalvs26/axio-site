# Junta os clipes das cenas num único vídeo contínuo para o scroll percorrer sem trocar de
# arquivo. Entre cenas entram "pontes": clipes gerados do último quadro de uma cena até o
# primeiro da seguinte, então não há corte em lugar nenhum.
# Gera public/scenes/story/{desktop,mobile}.mp4 e, ao lado, {desktop,mobile}.json: o índice de
# quadros (codec, avcC, posição e tamanho de cada quadro no arquivo). Com ele a página baixa só o
# trecho em volta da rolagem (Range) e decodifica cada quadro com WebCodecs, sem buscar no <video>.
# src/scenes/story.generated.json guarda a fatia [início, fim] de cada cena no vídeo
# (cada ponte é dividida ao meio entre as vizinhas).
# Uso: python scripts/build-story.py            (recodifica e indexa)
#      python scripts/build-story.py --index [pasta]  (só indexa {desktop,mobile}.mp4 já prontos; padrão public/scenes/story)
import base64
import json
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS = 24  # 24: −20% de peso num vídeo todo-keyframe; scrub segue por tempo, não por quadro

# (cena ou None para ponte, clipe, duração usada)
SCENES = [
    # Mergulho: clipe do Veo gerado subindo a partir do pouso, invertido, com o feixe laranja
    # desenhado por _gerado/intro/beam.py; termina no 1º quadro da impact.
    ('prelude', '_gerado/intro/dive-beam.mp4', 8.0),
    ('impact', '_gerado/vid/impact.mp4', 6.0),
    ('awakening', '_gerado/v2/awakening.mp4', 5.0),  # começa no último quadro da impact
    ('city', '_gerado/vid/city.mp4', 5.0),
    ('analysis', '_gerado/vid/analysis.mp4', 5.0),
    ('action', '_gerado/vid/action.mp4', 5.0),
    ('solution', '_gerado/vid/solution.mp4', 5.0),
    ('transformation', '_gerado/vid/transformation.mp4', 5.0),
    ('final', '_gerado/v2/final.mp4', 5.0),
]
BRIDGE = 3.0


def clips():
    out = []
    scenes = [s for s in SCENES if (ROOT / s[1]).exists()]
    for i, scene in enumerate(scenes):
        out.append(scene)
        nxt = scenes[i + 1][0] if i + 1 < len(scenes) else None
        bridge = ROOT / f'_gerado/br/{scene[0]}-{nxt}.mp4'
        if nxt and bridge.exists():
            out.append((None, str(bridge.relative_to(ROOT)), BRIDGE))
    return out


def timings():
    """Fatia de cada cena; metade de cada ponte vai para a cena de cada lado."""
    seq, out, t = clips(), {}, 0.0
    spans = []
    for _, _, dur in seq:
        spans.append((t, t + dur))
        t += dur
    for i, (scene, _, _) in enumerate(seq):
        if scene is None:
            continue
        a, b = spans[i]
        if i > 0 and seq[i - 1][0] is None:
            a -= BRIDGE / 2
        if i + 1 < len(seq) and seq[i + 1][0] is None:
            b += BRIDGE / 2
        out[scene] = [round(a, 3), round(b, 3)]
    return out, t


# Cada salto de scroll obriga o navegador a decodificar um quadro inteiro. Com -tune fastdecode
# (sem CABAC/deblocking) o 1080p fica em ~13–26 ms por salto com GPU, no nível do antigo 720p,
# com bem mais detalhe. Medido em 2026-10-05; -g maior que 1 dava picos de 150 ms.
FORMATS = {
    'desktop': ('scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080', 30),
    'mobile': ('scale=720:1280:force_original_aspect_ratio=increase:flags=lanczos,crop=720:1280', 27),
}


def build(fmt, slices):
    scale, crf = FORMATS[fmt]
    seq = clips()
    args, chains = [], []
    for i, (_, path, dur) in enumerate(seq):
        args += ['-i', str(ROOT / path)]
        chains.append(f'[{i}:v]trim=0:{dur},setpts=PTS-STARTPTS,{scale},fps={FPS},format=yuv420p,setsar=1[c{i}]')
    chains.append(''.join(f'[c{i}]' for i in range(len(seq))) + f'concat=n={len(seq)}:v=1:a=0[out]')
    dest = ROOT / 'public/scenes/story' / f'{fmt}.mp4'
    dest.parent.mkdir(parents=True, exist_ok=True)
    # -g 1: todo quadro é keyframe → o scroll pode pular para qualquer instante sem travar.
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args, '-filter_complex', ';'.join(chains),
                    '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
                    '-g', '1', '-tune', 'fastdecode', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(dest)], check=True)
    print(f'ok -> {dest.relative_to(ROOT)} ({dest.stat().st_size / 1e6:.1f} MB)')
    index(dest)


def avcc(path):
    """Caixa avcC do arquivo (SPS/PPS): a 'description' que o VideoDecoder precisa."""
    data = path.read_bytes()
    at = data.index(b'avcC')
    size = int.from_bytes(data[at - 4:at], 'big')
    return data[at + 4:at - 4 + size]


def index(path):
    """Índice de quadros para o leitor WebCodecs: todo quadro é keyframe, então cada um decodifica sozinho."""
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'packet=pos,size,flags:stream=width,height,r_frame_rate', '-of', 'json', str(path)],
                         check=True, capture_output=True, text=True).stdout
    probe = json.loads(out)
    packets = probe['packets']
    assert all('K' in p['flags'] for p in packets), 'todo quadro precisa ser keyframe (-g 1)'
    pos = [int(p['pos']) for p in packets]
    sizes = [int(p['size']) for p in packets]
    # Quadros contíguos e em ordem: um trecho de quadros é um único Range [pos[a], pos[b] + size[b]).
    assert all(pos[i + 1] == pos[i] + sizes[i] for i in range(len(pos) - 1)), 'quadros fora de ordem no mdat'
    desc = avcc(path)
    st = probe['streams'][0]
    num, den = (int(x) for x in st['r_frame_rate'].split('/'))
    meta = {
        'codec': 'avc1.' + desc[1:4].hex(),
        'description': base64.b64encode(desc).decode(),
        'width': st['width'], 'height': st['height'], 'fps': num / den,
        'start': pos[0], 'sizes': sizes,
    }
    dest = path.with_suffix('.json')
    dest.write_text(json.dumps(meta, separators=(',', ':')))
    print(f'   índice -> {dest} ({len(sizes)} quadros, {meta["codec"]})')


if __name__ == '__main__':
    t, total = timings()
    if '--index' in sys.argv:
        for fmt in FORMATS:
            at = sys.argv.index('--index')
            folder = Path(sys.argv[at + 1]) if len(sys.argv) > at + 1 else ROOT / 'public/scenes/story'
            index(folder / f'{fmt}.mp4')
        sys.exit(0)
    for fmt in FORMATS:
        build(fmt, t)
    (ROOT / 'src/scenes/story.generated.json').write_text(json.dumps(t, indent=2) + '\n')
    print(f'duração total {total:.2f}s', t)
