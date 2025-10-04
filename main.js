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

// =================================================================
// Local Strings Editor
// =================================================================

let charMap = {};

async function loadCharacterMap() {
    if (Object.keys(charMap).length > 0) return;
    try {
        const response = await fetch('public_font_map_dist.json');
        const data = await response.json();
        const ey = data.EY;
        const processMap = (mapData) => {
            const inputMap = mapData.inputMap;
            for (const key in inputMap) {
                charMap[parseInt(key, 16)] = inputMap[key];
            }
        };
        processMap(ey.UN_00);
        processMap(ey.UN_F0);
        processMap(ey.CN_F1);
        processMap(ey.CN_F2);
        processMap(ey.SR_F3);
        processMap(ey.VN_F4);
        console.log("Character map loaded.");
    } catch (error) {
        console.error("Failed to load character map:", error);
        alert("Error: Could not load public_font_map_dist.json. Make sure the file is present.");
    }
}

function be_read(offset) {
    if (!rom || offset + 1 >= rom.length) return 0;
    const view = new DataView(rom.buffer);
    return view.getUint16(offset, false); // big-endian
}

function js_strlen(offset) {
    let count = 0;
    let currentOffset = offset;
    while (true) {
        if (currentOffset < 0 || currentOffset >= rom.length) return 114514; // Out of bounds
        if (count > 1000) return 114514; // Safety break

        const c = rom[currentOffset];
        if (c >= 0xf0) {
            count += 2;
            currentOffset += 2;
        } else {
            if (c === 0) break;
            count++;
            currentOffset++;
        }
    }
    return count;
}

function js_strdup(offset) {
    let result = '';
    let currentOffset = offset;
    while (true) {
        const c = rom[currentOffset];
        if (c === 0) break;

        if (c >= 0xf0) {
            const key = be_read(currentOffset);
            result += charMap[key] || `<${key.toString(16).toUpperCase()}>`;
            currentOffset += 2;
        } else {
            result += charMap[c] || `<${c.toString(16).toUpperCase()}>`;
            currentOffset++;
        }
    }
    return result;
}

function js_strhex(offset) {
    let result = '';
    let currentOffset = offset;
    while (true) {
        const c = rom[currentOffset];
        if (c === 0) break;

        if (c >= 0xf0) {
            const key = be_read(currentOffset);
            result += key.toString(16).toUpperCase() + ' ';
            currentOffset += 2;
        } else {
            result += c.toString(16).toUpperCase().padStart(2, '0') + ' ';
            currentOffset++;
        }
    }
    return result.trim();
}

// Load the map as soon as the script runs
loadCharacterMap();

function lookupLanguage() {
    const signature = "5e f8 5e f4 05 f8 10 90 bb 91 00 01 06 f0 85 f2 2b 93 2a 92 08 a0 ?? ?? 26 f0 08 a2 fc ff 08 90 fe ff 25 f4 00 82 45 f0 1e f4 1e f8 1f fe";
    let languageAddr = findSignature(signature);
    if (languageAddr === -1) {
        throw new Error("Language signature not found.");
    }
    languageAddr += 0x16;
    return be_read(languageAddr);
}

document.getElementById('autoDetectLutButton').addEventListener('click', function() {
    if (!rom) {
        alert("Open ROM FIRST!");
        return;
    }
    try {
        const lutAddr = lookupLanguage();
        document.getElementById('lut_address').value = lutAddr.toString(16).toUpperCase();
    } catch (e) {
        alert(e.message);
    }
});

document.getElementById('getStringLutButton').addEventListener('click', function() {
    if (!rom) {
        alert("Open ROM FIRST!");
        return;
    }
    const lut = parseInt(document.getElementById('lut_address').value, 16);
    const code = parseInt(document.getElementById('language_code').value, 16);
    if (isNaN(lut) || isNaN(code)) {
        alert("Invalid LUT address or language code.");
        return;
    }
    const stringLutAddr = be_read(lut + code * 2);
    document.getElementById('string_lut_address').value = stringLutAddr.toString(16).toUpperCase();
});

let dumpedStrings = [];

document.getElementById('dumpStringsButton').addEventListener('click', function() {
    if (!rom) {
        alert("Open ROM FIRST!");
        return;
    }
    const stringLutAddr = parseInt(document.getElementById('string_lut_address').value, 16);
    if (isNaN(stringLutAddr)) {
        alert("Invalid String LUT address.");
        return;
    }

    const tableBody = document.querySelector("#strings_table tbody");
    tableBody.innerHTML = ''; // Clear previous results
    dumpedStrings = [];
    const view = new DataView(rom.buffer);

    // In the C# code, the loop limit is 0x2FC. We'll use a similar limit.
    for (let i = 0; i < 0x2FC; i++) {
        const pointer = view.getUint32(stringLutAddr + i * 4, true); // Little-endian

        if (js_strlen(pointer) === 114514) { // Safety check from original code
            // This likely means we've hit the end of the valid pointers.
            // We can choose to stop, or just mark it as invalid.
            // For now, we'll just stop.
            break;
        }

        const rawBytes = js_strhex(pointer);
        const decodedString = js_strdup(pointer);

        dumpedStrings.push({ index: i, rawBytes, decodedString });

        const row = tableBody.insertRow();
        row.insertCell(0).textContent = i;
        row.insertCell(1).textContent = rawBytes;
        row.insertCell(2).textContent = decodedString;
    }
});

document.getElementById('exportCsvButton').addEventListener('click', function() {
    if (dumpedStrings.length === 0) {
        alert("No strings to export. Please dump strings first.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Index,Bytes,String\n";

    dumpedStrings.forEach(item => {
        const row = `${item.index},"${item.rawBytes}","${item.decodedString.replace(/"/g, '""')}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "strings.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

function hexStringToByteArray(hexString) {
    if (!hexString) return new Uint8Array();
    const hexValues = hexString.split(' ').filter(v => v);
    const byteArray = new Uint8Array(hexValues.length);
    for (let i = 0; i < hexValues.length; i++) {
        byteArray[i] = parseInt(hexValues[i], 16);
    }
    return byteArray;
}

function applyPatch(offset, patch) {
    if (!rom || offset + patch.length > rom.length) {
        console.error("Patch out of bounds");
        return;
    }
    rom.set(patch, offset);
}


document.getElementById('importCsvButton').addEventListener('click', () => document.getElementById('csvFile').click());

document.getElementById('csvFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        try {
            patchFromCsv(text);
            alert("ROM patched successfully!");
        } catch (error) {
            alert(`Error patching ROM: ${error.message}`);
            console.error(error);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
});

function patchFromCsv(csvText) {
    if (!rom) throw new Error("ROM not loaded.");

    const zeroAddr = findSignature("00");
    if (zeroAddr === -1) throw new Error("Could not find a zero byte for empty strings.");

    let newStringsBase = parseInt(document.getElementById('strings_base_address').value, 16);
    if (isNaN(newStringsBase)) throw new Error("Invalid New Strings Base Address.");

    const stringLutAddr = parseInt(document.getElementById('string_lut_address').value, 16);
    if (isNaN(stringLutAddr)) throw new Error("Invalid String LUT Address.");

    const view = new DataView(rom.buffer);
    const lines = csvText.split('\n').slice(1); // Skip header
    let currentPtr = newStringsBase;
    const patchedPointers = new Set();

    lines.forEach(line => {
        if (!line.trim()) return;

        // Basic CSV parsing, handles quoted strings
        const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(p => p.replace(/"/g, ''));
        const index = parseInt(parts[0]);
        const bytesHex = parts[1];

        if (isNaN(index)) return;

        const newBytes = hexStringToByteArray(bytesHex);
        const lutEntryAddr = stringLutAddr + index * 4;

        if (newBytes.length === 0 || (newBytes.length === 1 && newBytes[0] === 0)) {
            view.setUint32(lutEntryAddr, zeroAddr, true); // Point to a null string
            return;
        }

        const originalPointer = view.getUint32(lutEntryAddr, true);
        const originalLength = js_strlen(originalPointer);

        // If new string fits in old space and that space hasn't been used yet
        if (newBytes.length <= (originalLength + 1) && !patchedPointers.has(originalPointer)) {
            applyPatch(originalPointer, newBytes);
            patchedPointers.add(originalPointer);
        } else { // Does not fit, or space already used, so relocate
            view.setUint32(lutEntryAddr, currentPtr, true); // Update pointer in LUT
            applyPatch(currentPtr, newBytes);
            currentPtr += newBytes.length;
        }
    });
}

// =================================================================
// General Menu Editor
// =================================================================

let allMenus = [];

function getMenus() {
    if (!rom) throw new Error("ROM not loaded.");
    loadCharacterMap(); // Ensure map is loaded

    const signature = "00 82 e9 90 9f ff 00 03 25 f0 06 e2 01";
    let showMenuAddr = findSignature(signature);
    if (showMenuAddr === -1) throw new Error("Menu signature not found.");

    showMenuAddr += 0x10;
    const view = new DataView(rom.buffer);
    const b = (view.getUint8(showMenuAddr) << 16 | view.getUint8(showMenuAddr + 5) << 8 | view.getUint8(showMenuAddr + 4)) - 3;

    let menus = [];
    let menuPtr = b;

    for (let i = 0; i < 255; i++) { // Limit to 255 menus as a safeguard
        const pitems = view.getUint16(menuPtr, true);
        const type = view.getUint8(menuPtr + 2);
        const item_count = view.getUint8(menuPtr + 3);

        if (type > 3 || item_count > 30) break; // Safeguard from original code

        let cmenu = {
            id: (0xEB00 | i),
            raw_ptr_addr: menuPtr,
            items: []
        };

        let itemPtr = pitems;
        for (let j = 0; j < item_count; j++) {
            const ptext = view.getUint16(itemPtr, true);
            const op = view.getUint16(itemPtr + 2, true);
            const cond = view.getUint8(itemPtr + 4);

            const v = (op >> 8);
            const fix_ = (v === 0xEE) || (v === 0xEB) || (v === 0xEC);

            const offset = lookupLanguage(); // This might be inefficient to call in a loop
            const text_local0 = convert_local(offset, ptext, 0, fix_);
            const text_local1 = convert_local(offset, ptext, 1, fix_);

            cmenu.items.push({
                ptr_addr: itemPtr,
                text_ptr2: ptext,
                key: op,
                condition: cond,
                text_local0: text_local0,
                text_local1: text_local1,
                parent: cmenu
            });
            itemPtr += 6; // Size of MenuItem struct
        }
        menus.push(cmenu);
        menuPtr += 6; // Size of Menu struct
    }
    allMenus = menus;
    return menus;
}

function convert_local(langLutOffset, textPtr, language, lookup_direct) {
    if (lookup_direct && textPtr <= 0x200) {
        return get_local_string(langLutOffset, textPtr - 1, language);
    }

    let result = '';
    let currentOffset = textPtr;

    while (true) {
        if (currentOffset >= rom.length) break;
        const c = rom[currentOffset];
        if (c === 0) break;

        if (c === 0x02) {
            result += get_local_string(langLutOffset, rom[currentOffset + 1] - 1, language);
            currentOffset += 2;
        } else if (c === 0x04) {
            result += get_local_string(langLutOffset, rom[currentOffset + 1] + 0xFE, language);
            currentOffset += 2;
        } else if (c === 0x05) {
            result += get_local_string(langLutOffset, rom[currentOffset + 1] + 0x1FD, language);
            currentOffset += 2;
        } else if (c >= 0xf0) {
            const key = be_read(currentOffset);
            result += charMap[key] || `<${key.toString(16).toUpperCase()}>`;
            currentOffset += 2;
        } else {
            const key = c;
            result += charMap[key] || `<${key.toString(16).toUpperCase()}>`;
            currentOffset++;
        }
    }
    return result.length > 40 ? "ERROR" : result;
}

function get_local_string(langLutOffset, code, language) {
    const view = new DataView(rom.buffer);
    const langTableAddr = view.getUint16(langLutOffset + language * 2, true);
    const stringPointer = view.getUint32(langTableAddr + code * 4, true);
    if (stringPointer > rom.length) return "";
    return js_strdup(stringPointer);
}

document.getElementById('loadMenusButton').addEventListener('click', function() {
    try {
        getMenus();
        displayMenus();
    } catch (e) {
        alert(e.message);
    }
});

function displayMenus() {
    const container = document.getElementById('menusContainer');
    container.innerHTML = '';
    allMenus.forEach((menu, menuIndex) => {
        const menuDiv = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = `Menu ${menu.id.toString(16).toUpperCase()}`;
        menuDiv.appendChild(summary);

        const itemsTable = document.createElement('table');
        itemsTable.style.width = '100%';
        itemsTable.innerHTML = `<thead><tr>
            <th>Key</th><th>Cond</th><th>Text (Lang 0)</th><th>Text (Lang 1)</th><th>Action</th>
        </tr></thead>`;
        const tbody = document.createElement('tbody');
        itemsTable.appendChild(tbody);

        menu.items.forEach((item, itemIndex) => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = item.key.toString(16).toUpperCase();
            row.insertCell(1).textContent = item.condition.toString(16).toUpperCase();
            row.insertCell(2).textContent = item.text_local0;
            row.insertCell(3).textContent = item.text_local1;

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.onclick = () => openMenuEditModal(menuIndex, itemIndex);
            row.insertCell(4).appendChild(editButton);
        });

        menuDiv.appendChild(itemsTable);
        container.appendChild(menuDiv);
    });
}

let currentEditingItem = { menuIndex: -1, itemIndex: -1 };

function openMenuEditModal(menuIndex, itemIndex) {
    currentEditingItem = { menuIndex, itemIndex };
    const item = allMenus[menuIndex].items[itemIndex];

    document.getElementById('editKeyHex').value = item.key.toString(16).toUpperCase();
    document.getElementById('editCondition').value = item.condition.toString(16).toUpperCase();
    document.getElementById('editTextHex').value = item.text_ptr2.toString(16).toUpperCase();

    document.getElementById('editMenuModal').style.display = 'block';
}

document.getElementById('cancelEditMenuItemButton').addEventListener('click', () => {
    document.getElementById('editMenuModal').style.display = 'none';
});

document.getElementById('saveMenuItemButton').addEventListener('click', function() {
    const { menuIndex, itemIndex } = currentEditingItem;
    if (menuIndex === -1) return;

    const item = allMenus[menuIndex].items[itemIndex];
    const view = new DataView(rom.buffer);

    try {
        const newKey = parseInt(document.getElementById('editKeyHex').value, 16);
        const newCondition = parseInt(document.getElementById('editCondition').value, 16);
        const newTextPtr = parseInt(document.getElementById('editTextHex').value, 16);

        if (isNaN(newKey) || isNaN(newCondition) || isNaN(newTextPtr)) {
            throw new Error("Invalid hex value provided.");
        }

        // Write changes to the ROM buffer
        view.setUint16(item.ptr_addr + 2, newKey, true);
        view.setUint8(item.ptr_addr + 4, newCondition);
        view.setUint16(item.ptr_addr, newTextPtr, true);

        // Update the local object
        item.key = newKey;
        item.condition = newCondition;
        item.text_ptr2 = newTextPtr;

        // Refresh local text representations
        const offset = lookupLanguage();
        const v = (newKey >> 8);
        const fix_ = (v === 0xEE) || (v === 0xEB) || (v === 0xEC);
        item.text_local0 = convert_local(offset, newTextPtr, 0, fix_);
        item.text_local1 = convert_local(offset, newTextPtr, 1, fix_);

        // Close modal and refresh UI
        document.getElementById('editMenuModal').style.display = 'none';
        displayMenus(); // Simple refresh
        alert("Menu item updated.");

    } catch (e) {
        alert("Failed to save: " + e.message);
    }
});

// =================================================================
// Main Menu Editor
// =================================================================

let mainMenuSubs = {};
let iconCountAddr = 0;

function bytesToBitSetMainMenu(offset, length) {
    const bitSet = new Array(length * 8).fill(false);
    if (!rom || offset + length > rom.length) {
        return bitSet;
    }
    for (let i = 0; i < length; i++) {
        const byte = rom[offset + i];
        for (let j = 0; j < 8; j++) {
            bitSet[i * 8 + j] = (byte & (0x80 >> j)) !== 0;
        }
    }
    return bitSet;
}

function composeMainMenuImage() {
    if (!rom) throw new Error("ROM not loaded.");

    const mb1 = parseInt(document.getElementById('menuBase1Input').value, 16);
    const mb2 = parseInt(document.getElementById('menuBase2Input').value, 16);
    const language = parseInt(document.getElementById('mainMenuLanguageInput').value, 16);
    const index = parseInt(document.getElementById('mainMenuIndexInput').value, 16);

    if (isNaN(mb1) || isNaN(mb2) || isNaN(language) || isNaN(index)) {
        throw new Error("Invalid address, language, or index.");
    }

    const canvas = document.getElementById('mainMenuCanvas');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(64, 29);
    const data = imageData.data;
    const view = new DataView(rom.buffer);

    // Render icon (top part, 64x17)
    const rb1_ptr = mb1 + index * 8;
    const rb2_ptr = mb1 + index * 8 + 4;
    const rb1 = view.getUint32(rb1_ptr, true) & 0xffffff;
    const rb2 = view.getUint32(rb2_ptr, true) & 0xffffff;

    const array1 = bytesToBitSetMainMenu(rb1, 17 * 8);
    const array2 = bytesToBitSetMainMenu(rb2, 17 * 8);

    let d = 0;
    for (let j = 0; j < 17; j++) {
        for (let i = 0; i < 64; i++) {
            const bit1 = array1[d];
            const bit2 = array2[d];
            d++;

            const colorValue = (bit2 ? 2 : 0) + (bit1 ? 1 : 0);
            const gray = 255 - colorValue * 85;

            const pos = (j * 64 + i) * 4;
            data[pos] = gray;
            data[pos + 1] = gray;
            data[pos + 2] = gray;
            data[pos + 3] = 255;
        }
    }

    // Render text (bottom part, 64x13)
    const rb3_ptr = mb2 + index * 4 + language * 0x3c;
    const rb3 = view.getUint32(rb3_ptr, true) & 0xffffff;

    const textArray = bytesToBitSetMainMenu(rb3, 13 * 8);
    d = 0;
    for (let j = 16; j < 29; j++) {
        for (let i = 0; i < 64; i++) {
             const isSet = textArray[d++];
             const color = isSet ? 0 : 255;
             const pos = (j * 64 + i) * 4;
             data[pos] = color;
             data[pos + 1] = color;
             data[pos + 2] = color;
             data[pos + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function extractBranch(offset) {
    const view = new DataView(rom.buffer);
    const b1 = view.getUint8(offset + 1);
    const b2 = view.getUint8(offset + 2);
    const b3 = view.getUint8(offset + 3);
    return ((b1 & 0xf) << 16) | b2 | (b3 << 8);
}

function emitBL(offset, code) {
    const view = new DataView(rom.buffer);
    view.setUint8(offset, 1);
    view.setUint8(offset + 1, ((code >> 16) & 0xf) | 0xf0);
    view.setUint8(offset + 2, code & 0xff);
    view.setUint8(offset + 3, (code >> 8) & 0xff);
}

document.getElementById('loadMainMenuItemButton').addEventListener('click', function() {
    try {
        composeMainMenuImage();
        populateMainMenuFields();
    } catch(e) {
        alert("Failed to load main menu item: " + e.message);
    }
});

function autoDetectMainMenu() {
    if (!rom) throw new Error("ROM not loaded.");
    const view = new DataView(rom.buffer);

    // Find icon count
    const countAddrSig = "81 e6 10 90 ?? ?? 00 01 07 f6 11 c6 7e b0 81 e0";
    const countAddrResult = findSignature(countAddrSig);
    if (countAddrResult === -1) throw new Error("Could not find icon count signature.");
    iconCountAddr = view.getUint16(countAddrResult + 4, true);
    document.getElementById('iconCountInput').value = rom[iconCountAddr];

    // Find MenuBase1
    const sig1 = findSignature("00 ?? ?? ?? c1 ?? ?? ?? 00 ?? ?? ?? 03") - 3;
    if (sig1 < 0) throw new Error("Could not find MenuBase1 signature.");
    const firstmatch = sig1.toString(16).padStart(4, '0').toUpperCase();
    document.getElementById('menuBase1Input').value = firstmatch;

    // Find MenuBase2
    const sig2_pattern = `f8 b2 08 a2 ${firstmatch.substring(2, 4)} ${firstmatch.substring(0, 2)} 08 90`;
    const sig2 = findSignature(sig2_pattern);
    if (sig2 === -1) throw new Error("Could not find MenuBase2 signature.");
    const v2 = view.getUint16(sig2 + 0xa4, true);
    document.getElementById('menuBase2Input').value = v2.toString(16).padStart(4, '0').toUpperCase();

    // Find main menu subs jump table
    const mainSig = `10 90 58 f0 00 84 01 ?? ?? ?? 40 00 06 01 01 f0`;
    const mainAddr = findSignature(mainSig);
    if (mainAddr === -1) throw new Error("Could not find main subs signature.");

    // This part is tricky to port 1:1, we'll simplify and assume a similar structure
    let main_sub = findSignature("10 90 a1 91 ?? 70 ?? c9", mainAddr);
    if(main_sub === -1) throw new Error("Could not find main subs jump table.");
    main_sub += 4;

    mainMenuSubs = {};
    while (rom[main_sub + 1] === 0x70 && rom[main_sub + 3] === 0xc9) {
        const offset = new Int8Array(rom.buffer, main_sub + 2, 1)[0];
        const bl_addr = main_sub + 4 + offset * 2;
        mainMenuSubs[rom[main_sub]] = bl_addr;
        main_sub += 4;
    }
    if (rom[main_sub] === 1 && (rom[main_sub + 1] & 0xf0) === 0xf0) {
        mainMenuSubs[0xc1] = main_sub;
    }
}

document.getElementById('autoDetectMainMenuButton').addEventListener('click', function() {
    try {
        autoDetectMainMenu();
        alert("Main menu addresses detected.");
    } catch(e) {
        alert("Auto-detect failed: " + e.message);
    }
});

function populateMainMenuFields() {
    const mb1 = parseInt(document.getElementById('menuBase1Input').value, 16);
    const index = parseInt(document.getElementById('mainMenuIndexInput').value, 16);
    const language = parseInt(document.getElementById('mainMenuLanguageInput').value, 16);
    const mb2 = parseInt(document.getElementById('menuBase2Input').value, 16);
    const view = new DataView(rom.buffer);

    const mode = view.getUint8(mb1 + index * 8 + 7);
    document.getElementById('modeInput').value = mode.toString(16).toUpperCase();

    document.getElementById('bitmapOffset0').value = (view.getUint32(mb1 + index * 8, true) & 0xffffff).toString(16).toUpperCase();
    document.getElementById('bitmapOffset1').value = (view.getUint32(mb1 + index * 8 + 4, true) & 0xffffff).toString(16).toUpperCase();
    document.getElementById('bitmapOffset2').value = (view.getUint32(mb2 + index * 4 + language * 0x3c, true) & 0xffffff).toString(16).toUpperCase();

    if (mainMenuSubs[mode]) {
        const branchAddr = mainMenuSubs[mode];
        document.getElementById('modeCodeInput').value = branchAddr.toString(16).toUpperCase();
        document.getElementById('modeCodeValueInput').value = extractBranch(branchAddr).toString(16).toUpperCase();
    } else {
        document.getElementById('modeCodeInput').value = "N/A";
        document.getElementById('modeCodeValueInput').value = "N/A";
    }
}

document.getElementById('updateIconCountButton').addEventListener('click', () => {
    if (!iconCountAddr) { alert("Please auto-detect first."); return; }
    rom[iconCountAddr] = parseInt(document.getElementById('iconCountInput').value);
    alert("Icon count updated.");
});

function updateBitmapOffset(offset, inputId) {
    const view = new DataView(rom.buffer);
    const newValue = parseInt(document.getElementById(inputId).value, 16);
    const originalValue = view.getUint32(offset, true);
    view.setUint32(offset, (newValue & 0xffffff) | (originalValue & 0xff000000), true);
    alert("Offset updated.");
    composeMainMenuImage();
}

document.getElementById('updateBitmapOffset0').addEventListener('click', () => {
    const mb1 = parseInt(document.getElementById('menuBase1Input').value, 16);
    const index = parseInt(document.getElementById('mainMenuIndexInput').value, 16);
    updateBitmapOffset(mb1 + index * 8, 'bitmapOffset0');
});
document.getElementById('updateBitmapOffset1').addEventListener('click', () => {
    const mb1 = parseInt(document.getElementById('menuBase1Input').value, 16);
    const index = parseInt(document.getElementById('mainMenuIndexInput').value, 16);
    updateBitmapOffset(mb1 + index * 8 + 4, 'bitmapOffset1');
});
document.getElementById('updateBitmapOffset2').addEventListener('click', () => {
    const mb2 = parseInt(document.getElementById('menuBase2Input').value, 16);
    const index = parseInt(document.getElementById('mainMenuIndexInput').value, 16);
    const language = parseInt(document.getElementById('mainMenuLanguageInput').value, 16);
    updateBitmapOffset(mb2 + index * 4 + language * 0x3c, 'bitmapOffset2');
});

document.getElementById('updateModeButton').addEventListener('click', () => {
    const mb1 = parseInt(document.getElementById('menuBase1Input').value, 16);
    const index = parseInt(document.getElementById('mainMenuIndexInput').value, 16);
    const view = new DataView(rom.buffer);
    const oldId = view.getUint8(mb1 + index * 8 + 7);
    const newId = parseInt(document.getElementById('modeInput').value, 16);
    view.setUint8(mb1 + index * 8 + 7, newId);

    if (mainMenuSubs[oldId]) {
        const jumpPtr = mainMenuSubs[oldId];
        rom[jumpPtr] = newId; // This is a simplification from the C#
        delete mainMenuSubs[oldId];
        mainMenuSubs[newId] = jumpPtr;
    }
    alert("Mode ID updated.");
    populateMainMenuFields();
});

document.getElementById('updateModeCodeButton').addEventListener('click', () => {
    const branchAddr = parseInt(document.getElementById('modeCodeInput').value, 16);
    const targetAddr = parseInt(document.getElementById('modeCodeValueInput').value, 16);
    if (isNaN(branchAddr) || isNaN(targetAddr)) { alert("Invalid address."); return; }
    emitBL(branchAddr, targetAddr);
    alert("Branch instruction updated.");
});

document.getElementById('exportIconFull').addEventListener('click', () => {
    const canvas = document.getElementById('mainMenuCanvas');
    const link = document.createElement('a');
    link.download = `main_menu_item.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

function setMainMenuIcon(image, rect) {
    const canvas = document.createElement('canvas');
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const imageData = ctx.getImageData(0, 0, rect.width, rect.height).data;

    const mb1 = parseInt(document.getElementById('menuBase1Input').value, 16);
    const index = parseInt(document.getElementById('mainMenuIndexInput').value, 16);
    const view = new DataView(rom.buffer);
    const rb1 = view.getUint32(mb1 + index * 8, true) & 0xffffff;
    const rb2 = view.getUint32(mb1 + index * 8 + 4, true) & 0xffffff;

    // Clear existing data
    for (let i = 0; i < 8 * 17; i++) {
        rom[rb1 + i] = 0;
        rom[rb2 + i] = 0;
    }

    for (let j = 0; j < rect.height; j++) {
        for (let i = 0; i < 8; i++) { // 8 bytes per row
            for (let k = 0; k < 8; k++) { // 8 pixels per byte
                const pixelIndex = (j * rect.width + i * 8 + k) * 4;
                // Using green channel for color value, assuming grayscale
                const colorValue = imageData[pixelIndex + 1] >> 6; // 0, 1, 2, or 3
                if ((colorValue & 0b10)) rom[rb2 + j * 8 + i] |= (0x80 >> k);
                if ((colorValue & 0b01)) rom[rb1 + j * 8 + i] |= (0x80 >> k);
            }
        }
    }
}

function setMainMenuLabel(image, rect) {
    const canvas = document.createElement('canvas');
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const imageData = ctx.getImageData(0, 0, rect.width, rect.height).data;

    const mb2 = parseInt(document.getElementById('menuBase2Input').value, 16);
    const index = parseInt(document.getElementById('mainMenuIndexInput').value, 16);
    const language = parseInt(document.getElementById('mainMenuLanguageInput').value, 16);
    const view = new DataView(rom.buffer);
    const rb3 = view.getUint32(mb2 + index * 4 + language * 0x3c, true) & 0xffffff;

    // Clear existing data
    for (let i = 0; i < 8 * 13; i++) {
        rom[rb3 + i] = 0;
    }

    for (let j = 0; j < rect.height; j++) {
        for (let i = 0; i < 8; i++) {
            for (let k = 0; k < 8; k++) {
                const pixelIndex = (j * rect.width + i * 8 + k) * 4;
                const isSet = imageData[pixelIndex] < 128; // Black pixel
                if (isSet) rom[rb3 + j * 8 + i] |= (0x80 >> k);
            }
        }
    }
}

function createPngImporter(handler) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = re => {
            const img = new Image();
            img.onload = () => {
                try {
                    handler(img);
                    composeMainMenuImage(); // Refresh canvas
                    alert("Import successful.");
                } catch(err) {
                    alert("Import failed: " + err.message);
                }
            };
            img.src = re.target.result;
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

document.getElementById('importIconFull').addEventListener('click', () => {
    createPngImporter(img => {
        if (img.width < 64 || img.height < 29) throw new Error("Image must be at least 64x29.");
        setMainMenuIcon(img, {x: 0, y: 0, width: 64, height: 16});
        setMainMenuLabel(img, {x: 0, y: 16, width: 64, height: 13});
    });
});

document.getElementById('importIcon').addEventListener('click', () => {
    createPngImporter(img => {
        if (img.width < 64 || img.height < 16) throw new Error("Image must be at least 64x16.");
        setMainMenuIcon(img, {x: 0, y: 0, width: 64, height: 16});
    });
});

document.getElementById('importLabel').addEventListener('click', () => {
    createPngImporter(img => {
        if (img.width < 64 || img.height < 13) throw new Error("Image must be at least 64x13.");
        setMainMenuLabel(img, {x: 0, y: 0, width: 64, height: 13});
    });
});