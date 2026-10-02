"""台本(JSON)から「静止画が流れる動画」を作る。

使い方:
    python3 scripts/video/build_slideshow.py scripts/video/demo_oleth.json out.mp4

シーンごとに、背景画像をゆっくりズームさせ(ケン・バーンズ効果)、
その上にテロップと字幕を重ね、シーン同士をクロスフェードでつなぐ。

- image が無い/見つからない場合は、撮影指示を書いた仮画像を自動で作る
- audio (シーンごとの音声ファイル)があれば、その長さにシーンの長さを合わせる
  (クローン音声を入れると、写真の切り替えが声に自動で同期する)
- audio が無ければ duration 秒、それも無ければ字数から長さを推定する
"""
import json
import os
import subprocess
import sys
import tempfile

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
W, H, FPS = 1280, 720, 25
XFADE = 0.6  # クロスフェードの秒数
NAVY, AMBER, WHITE = (19, 34, 74), (233, 166, 60), (255, 255, 255)
CHARS_PER_SEC = 6  # 字数から長さを推定するときの話す速さ


def font(size):
    return ImageFont.truetype(FONT, size)


def wrap(text, fnt, max_w, draw):
    """日本語を1文字ずつ見て、幅に収まるところで改行する。"""
    lines = []
    for para in text.split("\n"):
        line = ""
        for ch in para:
            if draw.textlength(line + ch, font=fnt) > max_w and line:
                # 行末近くに「、」「。」があれば、そこで改行して言葉の途中で切らない
                cut = max(line.rfind("、"), line.rfind("。"))
                if cut >= len(line) - 12 and cut != len(line) - 1 and cut > 0:
                    lines.append(line[:cut + 1])
                    line = line[cut + 1:] + ch
                else:
                    lines.append(line)
                    line = ch
            else:
                line += ch
        lines.append(line)
    return lines


def probe_duration(path):
    out = subprocess.run([FFMPEG, "-i", path], capture_output=True, text=True).stderr
    for tok in out.split("Duration: ")[1:2]:
        h, m, s = tok.split(",")[0].split(":")
        return int(h) * 3600 + int(m) * 60 + float(s)
    raise ValueError(f"長さを読めません: {path}")


def placeholder(path, label, idx):
    """撮影指示を書いた仮の背景画像を作る。"""
    tints = [(58, 74, 104), (92, 98, 78), (70, 92, 86), (96, 80, 62), (74, 70, 98)]
    img = Image.new("RGB", (1920, 1080), tints[idx % len(tints)])
    d = ImageDraw.Draw(img)
    # 家のシルエット(写真が入る場所の目印)
    cx, base = 960, 760
    d.polygon([(cx - 260, base - 230), (cx, base - 430), (cx + 260, base - 230)], fill=(255, 255, 255, 40))
    d.rectangle([cx - 210, base - 230, cx + 210, base], outline=(230, 230, 230), width=6)
    f = font(36)
    msg = f"［ここに実際の写真］{label}"
    d.rounded_rectangle([40, 84, 60 + d.textlength(msg, font=f), 140], radius=10, fill=(0, 0, 0))
    d.text((50, 92), msg, font=f, fill=(235, 235, 235))
    img.save(path)


def overlay(path, scene, band_left, band_right, footnote):
    """テロップ・字幕・上部の帯を描いた透過PNGを作る。"""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 上部の常時表示の帯
    d.rectangle([0, 0, W, 46], fill=NAVY + (235,))
    d.text((20, 9), band_left, font=font(24), fill=WHITE)
    if band_right:
        bw = d.textlength(band_right, font=font(26))
        d.rounded_rectangle([W - bw - 44, 6, W - 12, 40], radius=8, fill=AMBER + (255,))
        d.text((W - bw - 28, 8), band_right, font=font(26), fill=WHITE)
    # テロップ(太字・大)
    tf = font(46)
    tlines = wrap(scene.get("telop", ""), tf, W - 200, d)
    if any(tlines):
        lh = 62
        box_h = lh * len(tlines) + 36
        top = 150
        widest = max(d.textlength(t, font=tf) for t in tlines)
        left = (W - widest) / 2 - 32
        d.rounded_rectangle([left, top, W - left, top + box_h], radius=16, fill=NAVY + (215,))
        y = top + 18
        for t in tlines:
            tw = d.textlength(t, font=tf)
            d.text(((W - tw) / 2, y), t, font=tf, fill=WHITE, stroke_width=1, stroke_fill=WHITE)
            y += lh
    # 字幕(ナレーション)
    sf = font(34)
    slines = wrap(scene.get("narration", ""), sf, W - 160, d)
    y = H - 40 - 48 * len(slines)
    for t in slines:
        tw = d.textlength(t, font=sf)
        d.text(((W - tw) / 2, y), t, font=sf, fill=WHITE, stroke_width=3, stroke_fill=(0, 0, 0))
        y += 48
    if footnote and scene.get("show_footnote"):
        ff = font(18)
        fy = H - 40 - 48 * len(slines) - 30 - 24 * len(footnote.split("\n"))
        for t in footnote.split("\n"):
            d.text((40, fy), t, font=ff, fill=(235, 235, 235), stroke_width=2, stroke_fill=(0, 0, 0))
            fy += 24
    img.save(path)


def build(spec_path, out_path):
    spec = json.load(open(spec_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(spec_path))
    scenes = spec["scenes"]
    tmp = tempfile.mkdtemp(prefix="slideshow_")
    clips, durs, audios = [], [], []
    for i, sc in enumerate(scenes):
        bg = os.path.join(base, sc["image"]) if sc.get("image") else ""
        if not bg or not os.path.exists(bg):
            bg = os.path.join(tmp, f"bg{i}.png")
            placeholder(bg, sc.get("shot", f"シーン{i + 1}"), i)
        audio = os.path.join(base, sc["audio"]) if sc.get("audio") else ""
        if audio and os.path.exists(audio):
            dur = probe_duration(audio) + 0.3
            audios.append(audio)
        else:
            dur = sc.get("duration") or max(2.5, len(sc.get("narration", "")) / CHARS_PER_SEC)
            audios.append(None)
        durs.append(dur)
        ov = os.path.join(tmp, f"ov{i}.png")
        overlay(ov, sc, spec.get("band_left", ""), spec.get("band_right", ""), spec.get("footnote", ""))
        # 最後以外はクロスフェードで重なるぶん長く作る
        clip_len = dur + (XFADE if i < len(scenes) - 1 else 0)
        frames = int(clip_len * FPS) + 1
        zoom_in = i % 2 == 0  # ズームイン/アウトを交互に
        z = "min(zoom+0.0006,1.12)" if zoom_in else "if(eq(on,0),1.12,max(zoom-0.0006,1.0))"
        clip = os.path.join(tmp, f"clip{i}.mp4")
        subprocess.run([
            FFMPEG, "-y", "-loglevel", "error",
            "-i", bg, "-loop", "1", "-i", ov,
            "-filter_complex",
            f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
            f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}[bg];"
            f"[bg][1:v]overlay=0:0:shortest=1,format=yuv420p[v]",
            "-map", "[v]", "-t", f"{clip_len:.3f}", "-r", str(FPS),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", clip,
        ], check=True)
        clips.append(clip)

    # クロスフェードでつなぐ
    inputs, chain, offset = [], "", 0.0
    for c in clips:
        inputs += ["-i", c]
    label = "[0:v]"
    for i in range(1, len(clips)):
        offset += durs[i - 1]
        out = f"[x{i}]" if i < len(clips) - 1 else "[vout]"
        chain += f"{label}[{i}:v]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{out};"
        label = out
    if len(clips) == 1:
        chain = "[0:v]null[vout];"
    total = sum(durs)
    video_only = os.path.join(tmp, "video.mp4")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", *inputs, "-filter_complex", chain.rstrip(";"),
                    "-map", "[vout]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", video_only], check=True)

    # 音声: シーンごとの音声があれば各シーンの開始位置に置く。無ければ無音
    if any(audios):
        a_inputs, a_chain, start = [], "", 0.0
        for i, a in enumerate(audios):
            if a:
                a_inputs += ["-i", a]
                idx = len(a_inputs) // 2
                a_chain += f"[{idx}:a]adelay={int(start * 1000)}|{int(start * 1000)}[a{idx}];"
            start += durs[i]
        n = len(a_inputs) // 2
        mix = "".join(f"[a{k}]" for k in range(1, n + 1)) + f"amix=inputs={n}:normalize=0[aout]"
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", video_only, *a_inputs,
                        "-filter_complex", a_chain + mix, "-map", "0:v", "-map", "[aout]",
                        "-c:v", "copy", "-c:a", "aac", "-t", f"{total:.3f}", out_path], check=True)
    else:
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", video_only,
                        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                        "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac",
                        "-t", f"{total:.3f}", out_path], check=True)
    print(f"保存: {out_path}（{total:.1f}秒・{len(scenes)}シーン）")


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
