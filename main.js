let rom = null;
let is_cwii = false;

document.getElementById('romFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            rom = new Uint8Array(arrayBuffer);
            is_cwii = rom.length > 0x40000;
            alert('ROM loaded successfully!');
        };
        reader.readAsArrayBuffer(file);
    }
});

document.querySelectorAll('input[name="font_type"]').forEach(radio => {
    radio.addEventListener('change', function() {
        document.getElementById('cwii_va_settings').style.display = 'none';
        document.getElementById('l8_settings').style.display = 'none';
        document.getElementById('la_settings').style.display = 'none';

        if (this.value === '0') {
            document.getElementById('cwii_va_settings').style.display = 'block';
        } else if (this.value === '1') {
            document.getElementById('l8_settings').style.display = 'block';
        } else if (this.value === '2') {
            document.getElementById('la_settings').style.display = 'block';
        }
    });
});

document.getElementById('ab_fix_checkbox').addEventListener('change', function() {
    document.getElementById('va_fix_en').style.display = this.checked ? 'block' : 'none';
});

// Trigger change event to set initial state
document.querySelector('input[name="font_type"]:checked').dispatchEvent(new Event('change'));

let ne_00, ne_fx, va_f1, va_f2, l8_00, la_00, la_fx;
let va_fix = false;
let font_type = 0;

function getSettings() {
    font_type = parseInt(document.querySelector('input[name="font_type"]:checked').value);
    va_fix = document.getElementById('ab_fix_checkbox').checked;

    ne_00 = parseInt(document.getElementById('ne_00_input').value, 16) || 0;
    ne_fx = parseInt(document.getElementById('ne_fx_input').value, 16) || 0;
    va_f1 = parseInt(document.getElementById('va_f0_input').value, 16) || 0;
    va_f2 = parseInt(document.getElementById('va_f1_input').value, 16) || 0;
    l8_00 = parseInt(document.getElementById('l8_00_input').value, 16) || 0;
    la_00 = parseInt(document.getElementById('la_00_input').value, 16) || 0;
    la_fx = parseInt(document.getElementById('la_fx_input').value, 16) || 0;
}

function bytesToBitSet(offset, length) {
    const bitSet = new Array(length * 8).fill(false);
    if (!rom || offset + length > rom.length) {
        return bitSet;
    }
    for (let i = 0; i < length; i++) {
        const byte = rom[offset + i];
        for (let j = 0; j < 8; j++) {
            bitSet[i * 8 + (7 - j)] = (byte & (1 << j)) !== 0;
        }
    }
    return bitSet;
}

function bytesToBitSetLE(offset, length) {
    const bitSet = new Array(length * 8).fill(false);
    if (!rom || offset + length > rom.length) {
        return bitSet;
    }
    const view = new DataView(rom.buffer, offset);
    for (let i = 0; i < length; i += 2) {
        const word = view.getUint16(i, false); // Big Endian
        for (let j = 0; j < 16; j++) {
             bitSet[i * 8 + j] = (word & (0x8000 >> j)) !== 0;
        }
    }
    return bitSet;
}


function clip(bs, index, width, height) {
    const canvas = document.getElementById('fontCanvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const wi = width * index;
    const index2 = (wi >> 4);
    const n = wi & 15;

    const array1 = bytesToBitSetLE(bs + 2 * index2 * height, 32 * height);
    let d = 0;
    for (let j = 0; j < height; j++) {
        let e = n + d;
        for (let i = 0; i < (16 - n); i++) {
            const isSet = array1[e++];
            const color = isSet ? 0 : 255;
            const pos = (j * width + i) * 4;
            data[pos] = data[pos + 1] = data[pos + 2] = color;
            data[pos + 3] = 255;
        }
        d += 16;
    }

    for (let j = 0; j < height; j++) {
        let e = d; // Start from the beginning of the second 16-bit chunk
        for (let i = (16 - n); i < width; i++) {
             const isSet = array1[e++];
             const color = isSet ? 0 : 255;
             const pos = (j * width + i) * 4;
             data[pos] = data[pos + 1] = data[pos + 2] = color;
             data[pos + 3] = 255;
        }
        d += 16;
    }

    ctx.putImageData(imageData, 0, 0);
}


function clip2(bs, index, width, height) {
    const canvas = document.getElementById('fontCanvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const wi = width * index;
    const index2 = (wi / 8) | 0;
    const n = wi % 8;

    const array1 = bytesToBitSet(bs + index2 * height, 16 * height); // Assuming a reasonable max chunk read
    let d = 0;

    for (let j = 0; j < height; j++) {
        let e = n + d;
        for (let i = 0; i < (8 - n); i++) {
            const isSet = array1[e++];
            const color = isSet ? 0 : 255;
            const pos = (j * width + i) * 4;
            data[pos] = data[pos + 1] = data[pos + 2] = color;
            data[pos + 3] = 255;
        }
        d += 8;
    }

    for (let j = 0; j < height; j++) {
        let e = d;
        for (let i = (8 - n); i < width; i++) {
            const isSet = array1[e++];
            const color = isSet ? 0 : 255;
            const pos = (j * width + i) * 4;
            data[pos] = data[pos + 1] = data[pos + 2] = color;
            data[pos + 3] = 255;
        }
        d += 8;
    }

    ctx.putImageData(imageData, 0, 0);
}

function get(bs, index, width, height) {
    if (font_type === 0) {
        clip(bs, index, width, height);
    } else {
        clip2(bs, index, width, height);
    }
}

function lookupTable(ind) {
    const view = new DataView(rom.buffer);
    if (font_type !== 0) {
        if (font_type === 2) {
            if (is_cwii) return view.getUint32(ne_fx + ind * 4, true) & 0xffffff;
            else return view.getUint16(ne_fx + ind * 2, true);
        }
        return ne_00;
    }
    if (is_cwii) {
        return view.getUint32(ne_fx + ind * 4, true) & 0xffffff;
    } else {
        if (va_fix) {
            if (ind === 0) return va_f1;
            if (ind === 1) return va_f2;
            return ne_00;
        }
        return view.getUint16(ne_fx + ind * 2, true);
    }
}

function lookupChar(codepoint) {
    if (!rom) {
        alert("Open ROM FIRST!");
        return;
    }
    const head = (codepoint & 0xff00) >> 8;
    const ind = (codepoint & 0xff) - 0x10;
    let w = 10, h = 13, w2 = 11, h2 = 12;

    if (font_type !== 0) {
        w = w2 = 5;
        h = h2 = (font_type === 1) ? 7 : 9;
    }

    if (head >= 0xf0) {
        const tbl_head = head - 0xf0;
        const tbl = lookupTable(tbl_head);
        if (tbl_head === 1 || (tbl_head === 2 && !va_fix)) {
            get(tbl, ind, w2, h2);
        } else {
            get(tbl, ind, w, h);
        }
    } else if (head !== 0) {
        throw new Error("Codepoint is WRONG!");
    } else {
        get(ne_00, ind, w, h);
    }
}

document.getElementById('previewButton').addEventListener('click', function() {
    getSettings();
    const index = parseInt(document.getElementById('charIndex').value, 16);
    lookupChar(index);
});

document.getElementById('exportButton').addEventListener('click', function() {
    const canvas = document.getElementById('fontCanvas');
    const link = document.createElement('a');
    const charIndex = document.getElementById('charIndex').value;
    link.download = `char_${charIndex}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

document.getElementById('importButton').addEventListener('click', function() {
    document.getElementById('pngFile').click();
});

document.getElementById('pngFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            getSettings();
            const codepoint = parseInt(document.getElementById('charIndex').value, 16);
            setChar(codepoint, img);
            // After setting the char, re-render it to confirm the change
            lookupChar(codepoint);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    // Reset file input to allow importing the same file again
    event.target.value = '';
});

function set(bs, index, width, height, image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const view = new DataView(rom.buffer);

    const wi = width * index;
    const index2 = (wi >> 4);
    const n = wi & 15;

    for (let j = 0; j < height; j++) {
        let e = n;
        for (let i = 0; i < Math.min(16 - n, width); i++) {
            const isBlack = data[(j * width + i) * 4] < 128;
            const offset = bs + (index2 * height + j) * 2;
            let currentWord = view.getUint16(offset, false);
            if (isBlack) {
                currentWord |= (0x8000 >> (e++));
            } else {
                currentWord &= ~(0x8000 >> (e++));
            }
            view.setUint16(offset, currentWord, false);
        }
    }

    for (let j = 0; j < height; j++) {
        let e = 0;
        for (let i = (16 - n); i < width; i++) {
            const isBlack = data[(j * width + i) * 4] < 128;
            const offset = bs + ((index2 + 1) * height + j) * 2;
            let currentWord = view.getUint16(offset, false);
             if (isBlack) {
                currentWord |= (0x8000 >> (e++));
            } else {
                currentWord &= ~(0x8000 >> (e++));
            }
            view.setUint16(offset, currentWord, false);
        }
    }
}

function set2(bs, index, width, height, image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const wi = width * index;
    const index2 = (wi >> 3);
    const n = wi & 7;

    for (let j = 0; j < height; j++) {
        let e = n;
        for (let i = 0; i < Math.min(8 - n, width); i++) {
            const isBlack = data[(j * width + i) * 4] < 128;
            const offset = bs + index2 * height + j;
            if (isBlack) {
                rom[offset] |= (0x80 >> (e++));
            } else {
                rom[offset] &= ~(0x80 >> (e++));
            }
        }
    }

    for (let j = 0; j < height; j++) {
        let e = 0;
        for (let i = (8 - n); i < width; i++) {
            const isBlack = data[(j * width + i) * 4] < 128;
            const offset = bs + (index2 + 1) * height + j;
            if (isBlack) {
                rom[offset] |= (0x80 >> (e++));
            } else {
                rom[offset] &= ~(0x80 >> (e++));
            }
        }
    }
}


function setChar(codepoint, image) {
    const head = (codepoint & 0xff00) >> 8;
    const ind = (codepoint & 0xff) - 0x10;

    switch (font_type) {
        case 0: {
            if (head >= 0xf0) {
                const tbl_head = head - 0xf0;
                const tbl = lookupTable(tbl_head);
                if (tbl_head === 1 || (tbl_head === 2 && !va_fix)) {
                    set(tbl, ind, 11, 12, image);
                } else {
                    set(tbl, ind, 10, 13, image);
                }
            } else if (head !== 0) {
                throw new Error("Codepoint is WRONG!");
            } else {
                set(ne_00, ind, 10, 13, image);
            }
            break;
        }
        case 1: {
            set2(l8_00, ind, 5, 7, image);
            break;
        }
        case 2: {
            if (head >= 0xf0) {
                const tbl_head = head - 0xf0;
                const tbl = lookupTable(tbl_head);
                set2(tbl, ind, 5, 9, image);
            } else if (head !== 0) {
                throw new Error("Codepoint is WRONG!");
            } else {
                set2(la_00, ind, 5, 9, image);
            }
            break;
        }
    }
}

function findSignature(signature) {
    if (!rom) return -1;

    const pattern = signature.split(' ').map(p => (p === '??' ? null : parseInt(p, 16)));

    for (let i = 0; i <= rom.length - pattern.length; i++) {
        let match = true;
        for (let j = 0; j < pattern.length; j++) {
            if (pattern[j] !== null && pattern[j] !== rom[i + j]) {
                match = false;
                break;
            }
        }
        if (match) {
            return i;
        }
    }

    return -1;
}

document.getElementById('autoDetectButton').addEventListener('click', function() {
    if (!rom) {
        alert("Open ROM FIRST!");
        return;
    }

    getSettings();
    const view = new DataView(rom.buffer);

    // Clear all fields first
    document.getElementById('ne_00_input').value = '????';
    document.getElementById('ne_fx_input').value = '????';
    document.getElementById('l8_00_input').value = '????';
    document.getElementById('va_f0_input').value = '????';
    document.getElementById('va_f1_input').value = '????';
    document.getElementById('la_00_input').value = '????';
    document.getElementById('la_fx_input').value = '????';

    if (is_cwii) {
        switch (font_type) {
            case 0: {
                let r = findSignature("00 ?? 01 ?? 02 f2 b0 f4 d2 7c 78 02 c9");
                if (r !== -1) {
                    r -= 1;
                    const code = rom[r] | (rom[r + 2] << 8) | (rom[r + 4] << 16);
                    document.getElementById('ne_00_input').value = code.toString(16).toUpperCase();
                }
                r = findSignature("00 01 0f 20 00 21 2b 91 2a 90 08 a2 ?? ?? 08 90 ?? ?? f2 b2 f4 d0");
                if (r !== -1) {
                    r -= 2;
                    if (view.getUint16(r + 0xE, true) === view.getUint16(r + 0x12, true) - 2) {
                         document.getElementById('ne_fx_input').value = view.getUint16(r + 0xE, true).toString(16).toUpperCase();
                    }
                }
                break;
            }
            case 1: {
                let r = findSignature("05 fc f4 d2 16 ce 09 00 ff d0 90 80");
                if (r !== -1) {
                    r -= 1;
                    const code = rom[r - 5] | (rom[r - 3] << 8) | (rom[r - 1] << 16);
                    document.getElementById('l8_00_input').value = code.toString(16).toUpperCase();
                }
                break;
            }
            case 2: {
                let r = findSignature("05 fc f4 d2 00 74 14 c8 7e d0 7c 70");
                 if (r !== -1) {
                    r -= 1;
                    const code = rom[r - 5] | (rom[r - 3] << 8) | (rom[r - 1] << 16);
                    document.getElementById('la_00_input').value = code.toString(16).toUpperCase();
                }
                r = findSignature("00 01 0f 20 00 21 2b 91 2a 90 08 a2");
                if (r !== -1) {
                    if (view.getUint16(r + 0xC, true) === view.getUint16(r + 0x10, true) - 2) {
                        document.getElementById('la_fx_input').value = view.getUint16(r + 0xC, true).toString(16).toUpperCase();
                    }
                }
                break;
            }
        }
    } else { // Not CWII
        switch (font_type) {
            case 0: {
                let r = findSignature("07 81 92 c3 ea a1 3e f8 2e f4 8e f2");
                if (r !== -1) {
                    const code = rom[r - 4] | (rom[r - 2] << 8);
                    document.getElementById('ne_00_input').value = code.toString(16).toUpperCase();
                }
                r = findSignature("21 80 00 61 02 90 0a f0 2e f0");
                if (r !== -1) {
                    const code = rom[r - 4] | (rom[r - 2] << 8);
                    document.getElementById('ne_fx_input').value = code.toString(16).toUpperCase();
                } else {
                    r = findSignature("0c 08 5e f2 5e f4 00 7c 0a c8 7c 70");
                    if (r !== -1) {
                        document.getElementById('va_f0_input').value = view.getUint16(r - 10, true).toString(16).toUpperCase();
                        document.getElementById('va_f1_input').value = view.getUint16(r - 2, true).toString(16).toUpperCase();
                        document.getElementById('ab_fix_checkbox').checked = true;
                        document.getElementById('ab_fix_checkbox').dispatchEvent(new Event('change'));
                    }
                }
                break;
            }
            case 1: {
                let r = findSignature("07 08 00 ce 5e f2 5e f4 00 79 09 c8 7c");
                if (r !== -1) {
                    document.getElementById('l8_00_input').value = view.getUint16(r - 2, true).toString(16).toUpperCase();
                }
                break;
            }
            case 2: {
                 let r = findSignature("00 79 0b c9 6e f0 90 82 0f 22 1a 92");
                 if (r !== -1) {
                    document.getElementById('la_00_input').value = view.getUint16(r - 2, true).toString(16).toUpperCase();
                    const code = rom[r + 0xC] | (rom[r + 0xE] << 8);
                    document.getElementById('la_fx_input').value = code.toString(16).toUpperCase();
                 }
                break;
            }
        }
    }
});

document.getElementById('saveRomButton').addEventListener('click', function() {
    if (!rom) {
        alert("Open ROM FIRST!");
        return;
    }

    const blob = new Blob([rom], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    // Suggest a filename, but the user can change it.
    const originalFilename = document.getElementById('romFile').files[0]?.name || 'rom';
    link.download = `${originalFilename.replace(/\.[^/.]+$/, "")}_patched.bin`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
});