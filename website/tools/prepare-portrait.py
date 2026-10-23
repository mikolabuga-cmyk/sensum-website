"""Local asset preparation; the source photo is never sent to a remote service.
Run in a Python environment with torch, transformers, Pillow and rembg[cpu].
Model caches and the original photo should remain outside the published website.
"""
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageFilter, ImageDraw
from transformers import pipeline
from rembg import new_session, remove
from scipy.ndimage import label, distance_transform_edt

parser = argparse.ArgumentParser()
parser.add_argument('source')
parser.add_argument('--person', choices=['nick','pavlo','oleksandr'], default='nick')
parser.add_argument('--cutout', action='store_true', help='Use the supplied alpha silhouette without a source-specific crop')
parser.add_argument('--output', default='website/assets/team')
args = parser.parse_args()
out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
source = ImageOps.exif_transpose(Image.open(args.source)).convert('RGBA')
photo = source.convert('RGB')
# Nick's source-specific crop retains the complete hair silhouette and upper neck.
if args.person == 'nick' and not args.cutout:
    photo = photo.crop((160, 50, 485, 550))
else:
    background = Image.new('RGBA', source.size, (128,128,128,255))
    photo = Image.alpha_composite(background,source).convert('RGB')
print('Estimating relative depth locally...', flush=True)
estimator = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf', device='cpu')
result = estimator(photo)
depth = result['predicted_depth'].squeeze().detach().numpy()
depth = Image.fromarray(depth, mode='F').resize(photo.size, Image.Resampling.BICUBIC)
print('Segmenting portrait locally...', flush=True)
if args.person == 'nick' and not args.cutout:
    mask = remove(photo, session=new_session('u2net_human_seg'), only_mask=True).convert('L')
    neck = Image.new('L', photo.size, 0)
    ImageDraw.Draw(neck).polygon([(0,0),(325,0),(325,345),(270,375),(250,430),(235,499),(85,499),(65,430),(50,375),(0,345)], fill=255)
    mask_array = np.minimum(np.asarray(mask), np.asarray(neck.filter(ImageFilter.GaussianBlur(4)))).astype(np.float32)/255
else:
    mask_array = np.asarray(source.getchannel('A')).astype(np.float32)/255
# Feather inward from the segmented silhouette for a physically bounded particle edge.
soft = np.asarray(Image.fromarray((mask_array*255).astype('uint8')).filter(ImageFilter.GaussianBlur(3))).astype(np.float32)/255
mask_array = np.minimum(mask_array,soft)
labels, count = label(mask_array > .12)
sizes = np.bincount(labels.ravel()); sizes[0] = 0
mask_array *= labels == sizes.argmax()
interior = np.clip(distance_transform_edt(mask_array > .12)/10,0,1)
mask_array *= interior*interior*(3-2*interior)
fade_end, fade_length = (480,65) if args.person == 'nick' and not args.cutout else (photo.height*.974,photo.height*.132)
neck_fade = np.clip((fade_end-np.arange(photo.height))/fade_length,0,1)
mask_array *= (neck_fade*neck_fade*(3-2*neck_fade))[:,None]
d = np.asarray(depth).copy()
valid = mask_array > .8
lo,hi = np.percentile(d[valid], [2,98])
d = np.clip((d-lo)/max(hi-lo,1e-6),0,1)
# Preserve common UV registration by fitting all maps into the same padded square.
def square(im):
    width = 333 if args.person == 'nick' and not args.cutout else round(photo.width/photo.height*512)
    im = im.resize((width,512),Image.Resampling.LANCZOS)
    canvas = Image.new(im.mode,(512,512),0); canvas.paste(im,((512-width)//2,0)); return canvas
color = ImageOps.autocontrast(ImageOps.grayscale(photo),cutoff=1)
square(color).save(out/f'{args.person}-color.webp',quality=92)
square(Image.fromarray((d*255).astype('uint8'))).save(out/f'{args.person}-depth.webp',lossless=True)
square(Image.fromarray((mask_array*255).astype('uint8'))).save(out/f'{args.person}-mask.webp',lossless=True)
# Loading / no-WebGL fallback is derived only from the real photo, never the style reference.
poster = square(color).convert('RGBA'); poster.putalpha(square(Image.fromarray((mask_array*255).astype('uint8'))))
poster.save(out/f'{args.person}-fallback.webp',quality=90)
print('Saved aligned color/depth/mask maps and original-photo fallback.', flush=True)
