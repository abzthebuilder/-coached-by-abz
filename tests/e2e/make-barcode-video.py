# Writes a short Y4M video of an EAN-13 barcode, used as a fake camera in the scanner test.
# usage: python3 make-barcode-video.py 5000000000029 out.y4m
import sys
L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"]
G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"]
R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"]
PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"]
code = sys.argv[1]; out = sys.argv[2]
d = [int(c) for c in code]
bits = "101"
for i, p in enumerate(PARITY[d[0]]):
    bits += (L if p == "L" else G)[d[1 + i]]
bits += "01010"
for x in d[7:]:
    bits += R[x]
bits += "101"
W, H, module = 640, 480, 4
quiet = (W - len(bits) * module) // 2
frame_y = bytearray([235]) * (W * H)
for y in range(140, 340):
    row = y * W
    for i, b in enumerate(bits):
        if b == "1":
            for k in range(module):
                frame_y[row + quiet + i * module + k] = 16
uv = bytes([128]) * (W // 2 * H // 2)
with open(out, "wb") as f:
    f.write(f"YUV4MPEG2 W{W} H{H} F10:1 Ip A1:1 C420jpeg\n".encode())
    for _ in range(20):
        f.write(b"FRAME\n"); f.write(frame_y); f.write(uv); f.write(uv)
print(out)
