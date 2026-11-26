import sys
import os
import time
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MARKER_FILE = os.path.join(BASE_DIR, ".rembg_updated")

if not os.path.exists(MARKER_FILE):
    print("[*] First run detected: Upgrading rembg to support BiRefNet...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "rembg[cpu]", "pillow", "--break-system-packages"])
        with open(MARKER_FILE, "w") as f:
            f.write("updated")
        print("[*] Upgrade complete!")
    except Exception as e:
        print(f"[*] Warning: Could not auto-upgrade rembg: {e}")

from rembg import remove, new_session
from PIL import Image

def get_session(model_name="birefnet-general"):
    # If birefnet model is requested and available locally (>500MB), load BiRefNet Hugging Face model
    birefnet_model = os.path.expanduser(r"~/.rembg/models/birefnet-general/birefnet-general.onnx")
    if ("birefnet" in str(model_name).lower()) and os.path.exists(birefnet_model) and os.path.getsize(birefnet_model) > 500 * 1024 * 1024:
        try:
            print("[*] Removing background with Super Object Detection (BiRefNet)...", flush=True)
            return new_session("birefnet-general")
        except Exception as e:
            print(f"[*] BiRefNet fallback to U2Net: {e}", flush=True)

    # Use u2net which is pre-cached locally and extremely fast
    try:
        print("[*] Removing background with High-Precision Neural Cutout (U2Net)...", flush=True)
        return new_session("u2net")
    except Exception as e:
        print(f"[*] Session fallback: {e}", flush=True)
        return new_session()

def remove_background(input_path, output_path, model_name="birefnet-general"):
    print(f"[*] Processing image...", flush=True)
    try:
        input_img = Image.open(input_path)
        # Normalize color format if needed
        if input_img.mode in ("CMYK", "P"):
            input_img = input_img.convert("RGBA" if "transparency" in input_img.info else "RGB")
        
        my_session = get_session(model_name)
        print("[*] Removing background...", flush=True)
        
        try:
            output_img = remove(
                input_img, 
                session=my_session, 
                post_process_mask=True, 
                alpha_matting=True,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
                alpha_matting_erode_size=10
            )
        except Exception as matting_err:
            output_img = remove(input_img, session=my_session, post_process_mask=True)

        if output_img.mode != "RGBA":
            output_img = output_img.convert("RGBA")

        print("[*] Finalizing image...", flush=True)
        output_img.save(output_path, "PNG", optimize=True)
        print(f"RESULT:{output_path}", flush=True)
    except Exception as e:
        print(f"RESULT:Error: {str(e)}", flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("RESULT:Error: Missing input or output path", flush=True)
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    chosen_model = sys.argv[3] if len(sys.argv) > 3 else "birefnet-general"
    remove_background(input_file, output_file, chosen_model)
