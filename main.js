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

// =================================================================
// Checksum Calculator
// =================================================================

let checksumResult = {};

const checksumLog = (message) => {
    document.getElementById('checksumResultLog').textContent += message + '\n';
};

// JavaScript equivalent of the C++ `calc` function (word-based)
function calc_js(sum, view, length) {
    for (let i = 0; i < length; i += 2) {
        sum -= view.getUint16(i, true); // true for little-endian
    }
    return sum;
}

// JavaScript equivalent of the C++ `calc2` function (byte-based)
function calc2_js(sum, view, length) {
    for (let i = 0; i < length; i++) {
        sum -= view.getUint8(i);
    }
    return sum;
}

function calculateChecksum() {
    if (!rom) {
        throw new Error("ROM not loaded.");
    }
    document.getElementById('checksumResultLog').textContent = ''; // Clear log

    const view = new DataView(rom.buffer);
    const textDecoder = new TextDecoder('utf-8');

    let ver = '';
    let dsum_location = 0;
    let desired_sum = 0;
    let real_sum = 0;
    let sum_type = 'Unk';

    const spinit = view.getUint16(0, true);

    if (spinit === 0xf000) { // CWX or CWII
        if (rom.length < 0x40000) throw new Error("ROM must be at least 0x40000 for CWX/CWII.");
        if (rom.length === 0x40000) { // CWX
            sum_type = 'CWX';
            ver = textDecoder.decode(rom.subarray(0x3ffee, 0x3ffee + 8));
            dsum_location = 0x3fff6;
            desired_sum = view.getUint16(dsum_location, true);
        } else { // CWII
            sum_type = 'CWII';
             if (rom.length < 0x60000) throw new Error("ROM must be at least 0x60000 for CWII.");
            // Handle memory copy for calculation
            if (rom[0x5ffee] === 0xff || rom[0x5ffee] === 0) {
                 if (rom.length < 0x80000) throw new Error("Rom need to be 0x80000 at least.");
                 rom.set(rom.subarray(0x70000, 0x70000 + 0x2000), 0x5e000);
            }
            ver = textDecoder.decode(rom.subarray(0x5ffee, 0x5ffee + 8));
            dsum_location = 0x5fff6;
            desired_sum = view.getUint16(dsum_location, true);
        }
    } else if (spinit === 0x8dfe || spinit === 0x8e00) {
        throw new Error("ES ROMs do not have a checksum.");
    } else if (spinit === 0x8dec || spinit === 0x8df2) {
        sum_type = 'ESP1';
        if (rom.length < 0x20000) throw new Error("ROM must be at least 0x20000 for ESP1.");
        ver = textDecoder.decode(rom.subarray(0x1fff4, 0x1fff4 + 8));
        dsum_location = 0x1fffc;
        desired_sum = view.getUint16(dsum_location, true);
    } else if (spinit === 0x8dea) {
        sum_type = 'ESP2';
        if (rom.length < 0x20000) throw new Error("ROM must be at least 0x20000 for ESP2.");
        ver = textDecoder.decode(rom.subarray(0x1fff4, 0x1fff4 + 8));
        dsum_location = 0x1fffc;
        desired_sum = view.getUint16(dsum_location, true);
    }

    switch (sum_type) {
        case 'ESP1':
            real_sum = calc2_js(real_sum, new DataView(rom.buffer, 0), 0x10000);
            real_sum = calc2_js(real_sum, new DataView(rom.buffer, 0x10000), 0xfffc);
            break;
        case 'ESP2':
            real_sum = calc2_js(real_sum, new DataView(rom.buffer, 0), 0x10000);
            real_sum = calc2_js(real_sum, new DataView(rom.buffer, 0x10000), 0xff40);
            real_sum = calc2_js(real_sum, new DataView(rom.buffer, 0x1ffd0), 0x2c);
            break;
        case 'CWX':
            real_sum = calc_js(real_sum, new DataView(rom.buffer, 0), 0xfc00);
            real_sum = calc_js(real_sum, new DataView(rom.buffer, 0x10000), 0x2fff6);
            break;
        case 'CWII':
            real_sum = calc_js(real_sum, new DataView(rom.buffer, 0), 0xfc00);
            real_sum = calc_js(real_sum, new DataView(rom.buffer, 0x10000), 0x4fff6);
            break;
        default:
            throw new Error("Unknown ROM type for checksum calculation.");
    }

    // Mask to 16 bits to match C++ unsigned short behavior
    real_sum &= 0xFFFF;

    return { romType: sum_type, version: ver, desiredSum: desired_sum, realSum: real_sum, dsumLocation: dsum_location };
}

document.getElementById('calculateChecksumButton').addEventListener('click', function() {
    try {
        checksumResult = calculateChecksum();
        displayChecksumResult(checksumResult);
        document.getElementById('patchChecksumButton').style.display = 'inline-block';
    } catch (e) {
        checksumLog(`Error: ${e.message}`);
        document.getElementById('patchChecksumButton').style.display = 'none';
    }
});

function displayChecksumResult(result) {
    const { romType, version, desiredSum, realSum } = result;

    const toHex = (num) => num.toString(16).toUpperCase().padStart(4, '0');

    let output = '';
    if (romType === 'CWII') {
        const ver_o = version.substring(0, 6);
        const ver_o2 = version.substring(6, 8);
        output += `${ver_o}\n`;
        output += `V.${ver_o2} Bt OK\n`;
        output += `SUM${toHex(realSum)} ${realSum === desiredSum ? "OK" : "NG"}\n`;
        output += `Press AC\n`;
    } else {
        const ver_o_part1 = version.substring(0, 6);
        const ver_o_part2 = version.substring(6, 8);
        output += `${ver_o_part1} Ver${ver_o_part2}\n`;
        output += `SUM ${toHex(realSum)} ${realSum === desiredSum ? "OK" : "NG"}`;
        if (romType === 'ESP2') {
            output += " ID--";
        }
        output += "\n";
        if (romType === 'CWX') {
            output += "P00 Read OK\n";
        } else {
            output += "Pd- Read OK\n";
        }
    }

    checksumLog(output);
    checksumLog(`\n--- Calculation Details ---`);
    checksumLog(`Desired Sum: ${toHex(desiredSum)}`);
    checksumLog(`Real Sum:    ${toHex(realSum)}`);
}

document.getElementById('patchChecksumButton').addEventListener('click', function() {
    if (!checksumResult.dsumLocation) {
        checksumLog("No checksum result available to patch.");
        return;
    }

    try {
        const { dsumLocation, realSum, romType } = checksumResult;
        const view = new DataView(rom.buffer);

        view.setUint16(dsumLocation, realSum, true); // true for little-endian

        if (romType === 'CWII') {
            if (rom.length < 0x80000) {
                 // The original C++ code resizes the vector. In JS, we can't resize an ArrayBuffer.
                 // We'll assume the buffer is large enough or was handled during load.
                 // For safety, we'll just check.
                 throw new Error("ROM is not 0x80000 bytes, cannot perform CWII memory copy.");
            }
            // Mirror the data block
            rom.set(rom.subarray(0x5e000, 0x5e000 + 0x2000), 0x70000);
            checksumLog("CWII memory block mirrored from 0x5e000 to 0x70000.");
        }

        checksumLog(`\nChecksum patched at 0x${dsumLocation.toString(16).toUpperCase()} with value ${realSum.toString(16).toUpperCase().padStart(4,'0')}.`);
        checksumLog("You can now save the ROM.");
        document.getElementById('patchChecksumButton').style.display = 'none';

    } catch (e) {
        checksumLog(`Error during patching: ${e.message}`);
    }
});

// =================================================================
// ROM Information
// =================================================================

let romDb = new Map();

document.getElementById('romDbFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            parseRomDb(e.target.result);
            alert(`ROM Database loaded with ${romDb.size} entries.`);
        } catch (error) {
            alert("Failed to parse ROM Database: " + error.message);
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
});

function parseRomDb(arrayBuffer) {
    romDb.clear();
    const view = new DataView(arrayBuffer);
    const textDecoder = new TextDecoder('utf-8');

    // The Python script uses 'Q' which is an 8-byte unsigned long long.
    // JavaScript's DataView can read 64-bit integers with getBigUint64.
    const objectCount = view.getBigUint64(0, true); // true for little-endian
    let offset = 8;

    for (let i = 0; i < objectCount; i++) {
        if (offset + 16 > arrayBuffer.byteLength) {
            throw new Error("Database file is truncated or corrupt (header).");
        }

        // Read key (8-byte padded string)
        const keyBytes = new Uint8Array(arrayBuffer, offset, 8);
        // Find the first null terminator to get the actual key length
        const firstNull = keyBytes.indexOf(0);
        const key = textDecoder.decode(keyBytes.slice(0, firstNull === -1 ? 8 : firstNull));
        offset += 8;

        // Read name length (8 bytes)
        const nameLength = view.getBigUint64(offset, true);
        offset += 8;

        if (offset + Number(nameLength) > arrayBuffer.byteLength) {
            throw new Error(`Database file is truncated or corrupt (entry for key: ${key}).`);
        }

        // Read name string
        const nameBytes = new Uint8Array(arrayBuffer, offset, Number(nameLength));
        const name = textDecoder.decode(nameBytes);
        offset += Number(nameLength);

        romDb.set(key, name);
    }
}

document.getElementById('searchRomDbButton').addEventListener('click', function() {
    const key = document.getElementById('romDbKey').value;
    const resultEl = document.getElementById('romDbResult');

    if (romDb.size === 0) {
        resultEl.textContent = "Database not loaded.";
        return;
    }

    if (!key) {
        resultEl.textContent = "Please enter a key to search.";
        return;
    }

    const result = romDb.get(key);
    if (result !== undefined) {
        resultEl.textContent = result;
    } else {
        resultEl.textContent = "Key not found.";
    }
});

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

// =================================================================
// KBD Patcher
// =================================================================

const kbdLog = (message) => {
    const logEl = document.getElementById('kbdPatcherLog');
    logEl.textContent += message + '\n';
    logEl.scrollTop = logEl.scrollHeight;
};

function formatBL(func) {
    return `01 F${((func >> 16) & 0xf).toString(16)} ${(func & 0xff).toString(16).padStart(2, '0')} ${((func >> 8) & 0xff).toString(16).padStart(2, '0')}`;
}

function formatB(func) {
    return `00 F${((func >> 16) & 0xf).toString(16)} ${(func & 0xff).toString(16).padStart(2, '0')} ${((func >> 8) & 0xff).toString(16).padStart(2, '0')}`;
}

function convertHexStringToBytes(hexString) {
    const cleanString = hexString.replace(/\s+/g, ''); // Remove all whitespace
    const bytes = new Uint8Array(cleanString.length / 2);
    for (let i = 0; i < cleanString.length; i += 2) {
        bytes[i / 2] = parseInt(cleanString.substring(i, i + 2), 16);
    }
    return bytes;
}

function checkSignature(signature, description) {
    const addr = findSignature(signature);
    if (addr === -1) {
        const message = `[ x ] Signature not found for ${description}`;
        kbdLog(message);
        throw new Error(message);
    }
    kbdLog(`[ + ] ${description}: ${addr.toString(16).toUpperCase()}`);
    return addr;
}

async function patchKbd(shutdownImage) {
    if (!rom) {
        kbdLog("[ x ] ROM not loaded.");
        throw new Error("ROM not loaded.");
    }
    document.getElementById('kbdPatcherLog').textContent = ''; // Clear log
    kbdLog("[ + ] cw2kbd by telecomadm1145");
    kbdLog("[ + ] Emulator rom keyboard patcher");

    try {
        const ki_mask_0xff = checkSignature("ff 00 11 90 42 f0 1f fe", "ki_mask_0xff");
        const ko_0_0x7f = checkSignature("7f 00 11 90 46 f0 1f fe", "ko_0_0x7f");
        const delay = checkSignature("ce f8 05 f2 91 a0 0a f0 35 c8", "delay");
        const reset_timer = delay + 0x7a;
        const tick = checkSignature("ce f8 01 ?? ?? ?? 05 f8 0b f0 00 03 3f fe 08 92 00 03 20 84 00 05 08 90 ff 02 00 01 04 e2", "tick");
        const is_key_available = checkSignature("1e 00 ff 10 fe c8 7f 00 11 90 46 f0 00 e0 10 92 40 f0 ff 72 00 60 1f fe", "is_key_available");
        const ko_0 = checkSignature("00 02 11 92 46 f0 1f fe", "ko_0");
        const ki_mask_0 = checkSignature("00 00 11 90 42 f0 1f fe", "ki_mask_0");
        const exit = checkSignature("ea a1 2e f4 3e f8 8e f2", "exit");
        const enter = checkSignature("7e f8 6e f4 1a ae 1f fe", "enter");

        const get_kiko_emu_sig = `ce f8 ${formatBL(enter)} fe e1 f4 04 01 05 07 ce`;
        const get_kiko_emu = checkSignature(get_kiko_emu_sig, "get_kiko_emu");

        if (rom[get_kiko_emu + 0x38] !== 1 || (rom[get_kiko_emu + 0x39] & 0xf0) !== 0xf0) throw new Error("Invalid get_kiko_emu data (scan_key)");
        const scan_key = extractBranch(get_kiko_emu + 0x38);

        if (rom[get_kiko_emu + 0x44] !== 1 || (rom[get_kiko_emu + 0x45] & 0xf0) !== 0xf0) throw new Error("Invalid get_kiko_emu data (key_debounce)");
        const key_debounce = extractBranch(get_kiko_emu + 0x44);

        const render_copy_sig = `ce f8 ${formatBL(enter)} fa e1 00 88 00 00 11 90 fc 91 10 90 08 92`;
        const render_copy = findSignature(render_copy_sig);
        kbdLog(`[ * ] render_copy: ${render_copy !== -1 ? render_copy.toString(16).toUpperCase() : 'Not Found'}`);
        if (render_copy !== -1) {
            rom[render_copy + 0x6c] = 0xf8;
            rom[render_copy + 0x6e] = 0;
            kbdLog(`[ + ] Patched render_copy.`);
        }

        const sleep = checkSignature("0c f0 14 f0 30 90 fd 20 31 90 0c f0 08 f0 50 00 a0 01 31 90 51 91 02 00 31 90 8f fe 8f fe 1f fe", "sleep");

        const key_func_str = `ce f8 ${formatBL(enter)} 05 f8 fe e1 ${formatBL(ki_mask_0xff)} ${formatBL(ko_0_0x7f)} ${formatBL(reset_timer)} 85 f0 ${formatBL(tick)} a0 00 0f 01 ${formatBL(delay)} 91 a0 14 f0 1a c9 ${formatBL(is_key_available)} 00 70 19 c9 ${formatBL(ko_0)} ${formatBL(ki_mask_0)} 01 e0 ${formatBL(delay)} e5 f0 fe e0 ${formatBL(scan_key)} 00 70 df c9 e5 f0 fe e0 ${formatBL(key_debounce)} 00 70 d9 c9 7e b0 13 90 e0 91 06 ce ${formatBL(sleep)} 00 30 00 30 00 30 dc ce ${formatB(exit)}`;
        const patch = convertHexStringToBytes(key_func_str);

        const animate_func = checkSignature("ce f8 01 ?? ?? ?? 20 8a 05 fc 1c ce 01 ?? ?? ?? 0a d0 4e f0 08 b0 5e f0 06 d0 4e f0 04 b0 5e f0 03 d3 02 d2 01 d1 c0 90", "animate");
        const bit_blit = extractBranch(animate_func + 0x29);
        kbdLog(`[ * ] bit_blit: ${bit_blit.toString(16).toUpperCase()}`);

        const emu_scan_key_1 = findSignature(`e5 f0 fa 10 fc 61 ${formatBL(tick)} a0 00 0f 01 ${formatBL(delay)}`);
        if (emu_scan_key_1 === -1) throw new Error("emu_scan_key_1 not found");
        kbdLog(`[ * ] emu_scan_key patch point: ${emu_scan_key_1.toString(16).toUpperCase()}`);
        const emu_scan_key_real = emu_scan_key_1 - 0x114;
        kbdLog(`[ * ] emu_scan_key: ${emu_scan_key_real.toString(16).toUpperCase()}`);

        let wait_key = findSignature(`e5 f0 ca e0 ${formatBL(emu_scan_key_real)} e8 90 cb ff`);
        if (wait_key === -1) {
            kbdLog(`[ + ] Warn: fall back to magic pattern for wait_key.`);
            wait_key = findSignature(`e5 f0 ca e0 01 ?? ?? ?? e8 90 cb ff`);
        }
        checkSignature(wait_key, "wait_key part");

        const emu_report_status = extractBranch(wait_key + 0x25);
        kbdLog(`[ * ] emu_report_status: ${emu_report_status.toString(16).toUpperCase()}`);
        applyPatch(emu_report_status, new Uint8Array([0x1f, 0xfe]));
        const wait_kiko_v2 = emu_report_status + 2;
        applyPatch(wait_kiko_v2, patch);
        kbdLog(`[ + ] Written wait_kiko_v2 to ${wait_kiko_v2.toString(16).toUpperCase()}`);

        // Placeholder for image handling
        // For now, only run the non-image part
        const shutdown_func_no_img = `03 00 11 90 31 f0 00 00 11 90 d1 f0 11 90 3d f0 00 30 00 30 11 90 10 f0 11 90 11 f0 11 90 12 f0 ${formatBL(ki_mask_0)} ${formatBL(ko_0)} ${formatB(sleep)}`;
        const shutdown_addr = wait_kiko_v2 + patch.length;
        applyPatch(shutdown_addr, convertHexStringToBytes(shutdown_func_no_img));
        kbdLog(`[ * ] Written shutdown function to ${shutdown_addr.toString(16).toUpperCase()}.`);

        const wait_key_shutdown_routine = wait_key + 0x9C;

        if (shutdownImage) {
            const bs = 0x5cc70;
            kbdLog(`[ * ] Writing shutdown logo to ${bs.toString(16).toUpperCase()}.`);
            set3_js(bs + 0x10, bs + 0x10 + 0x5ea, 192, 63, shutdownImage);

            const view = new DataView(rom.buffer);
            view.setUint32(bs, bs + 0x10 + 0x5ea, true);
            view.setUint32(bs + 4, bs + 0x10, true);
            applyPatch(bs + 0x8, new Uint8Array([0, 0, 192, 63]));

            const xx = (bs >> 16) & 0xf;
            const yy = (bs >> 8) & 0xff;
            const zz = bs & 0xff;

            const shutdown_func_str = `00 00 11 90 d1 f0 0c f0 ${zz.toString(16).padStart(2,'0')} ${yy.toString(16).padStart(2,'0')} ${xx.toString(16).padStart(2,'0')} E3 54 90 6E F0 ${xx.toString(16).padStart(2,'0')} E3 54 90 6E F0 ${xx.toString(16).padStart(2,'0')} E3 54 90 ${formatBL(bit_blit)} ${formatBL(render_copy)} a0 00 0f 01 ${formatBL(delay)} 03 00 11 90 31 f0 00 00 11 90 3d f0 11 90 0a f0 11 90 10 f0 11 90 11 f0 11 90 12 f0 ${formatBL(ki_mask_0)} ${formatBL(ko_0)} ${formatB(sleep)}`;
            const shutdown_ = 0x5cbb0;
            applyPatch(shutdown_, convertHexStringToBytes(shutdown_func_str));
            kbdLog(`[ * ] Written shutdown function to ${shutdown_.toString(16).toUpperCase()}.`);

            applyPatch(wait_key_shutdown_routine, convertHexStringToBytes(`${formatBL(shutdown_)} 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30`));
            kbdLog(`[ * ] Patched shutdown call.`);

        } else {
            applyPatch(shutdown_addr, convertHexStringToBytes(shutdown_func_no_img));
            kbdLog(`[ * ] Written shutdown function to ${shutdown_addr.toString(16).toUpperCase()}.`);
            applyPatch(wait_key_shutdown_routine, convertHexStringToBytes(`${formatBL(shutdown_addr)} 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30`));
            kbdLog(`[ * ] Patched shutdown call.`);
        }


        const scan_key_patch_str = `00 00 00 01 13 90 e0 91 e5 f0 fa 10 fc 61 ${formatBL(wait_kiko_v2)} 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 12 90 e0 91 83 90 00 30 13 80`;
        applyPatch(emu_scan_key_1, convertHexStringToBytes(scan_key_patch_str));
        const scan_key_patch2_str = `01 00 11 90 c9 91 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30`;
        applyPatch(emu_scan_key_1 + 0x3c, convertHexStringToBytes(scan_key_patch2_str));
        kbdLog("[ + ] Patched emu_scan_key.");

        const exicon_func = findSignature("03 00 11 90 18 f0 1f fe");
        if (exicon_func !== -1) {
            rom[exicon_func] = 0;
            kbdLog("[ + ] Patched exicon setup.");
        }

        const formula_start_eval = findSignature(`ce f8 5e f4 ?? 04 8e 05 04 02 08 e3 41 92 a0 00 0f 01 ${formatBL(delay)} 1e f4 8e f2`);
        if (formula_start_eval !== -1) {
            applyPatch(formula_start_eval, convertHexStringToBytes("10 00 11 90 46 f0 04 00 11 90 42 f0 1f fe"));
            kbdLog("[ + ] Patched formula_start_eval.");
        }

        const is_ac_pressed = findSignature(`ce f8 5e f4 ?? 04 8e 05 08 02 08 e3 41 92 a0 00 0f 01 ${formatBL(delay)} 00 e0`);
        if (is_ac_pressed !== -1) {
            applyPatch(is_ac_pressed, convertHexStringToBytes("a1 a0 40 f0 02 c9 00 00 1f fe 01 00 1f fe"));
            kbdLog("[ + ] Patched is_ac_pressed.");
        }

        const memcpy_far = findSignature("5e fe 1a ae 6e f8 6e f4 5e fc 05 f8 20 8a 05 f4 20 86 42 b0 05 fc 0a ce 45 f0 c0 93 6f 90 41 93 81 e0 05 f4 81 ec 44 b0 ff e0 c4 b0 00 e0 44 b2 27 f0 f2 c1 85 f0 a0 82 1e fc 2e f4 2e f8 ea a1 1e fe");
        if (memcpy_far !== -1) {
            kbdLog(`[ + ] memcpy_far: ${memcpy_far.toString(16).toUpperCase()}`);
            let start_addr = 0;
            while(true) {
                const memcpy_far_caller = findSignature(`00 00 90 01 08 02 ${formatBL(memcpy_far)}`, start_addr);
                if (memcpy_far_caller === -1) break;
                kbdLog(`[ + ] memcpy_far caller: ${memcpy_far_caller.toString(16).toUpperCase()}`);
                rom[memcpy_far_caller + 0x2] = 0xf8;
                rom[memcpy_far_caller + 0x4] = 0;
                start_addr = memcpy_far_caller + 1;
            }
        }

        const mul = findSignature("6e f4 5e f8 00 e8 00 86 24 f6 00 84 34 f4 41 87 56 88 10 84 24 f4 41 87 56 88 00 69 10 82 34 f2 86 f2 65 f0 1e f8 2e f4 1f fe");
        if (mul !== -1) {
            kbdLog(`[ + ] mul: ${mul.toString(16).toUpperCase()}`);
            const cursor_render = findSignature(`60 80 00 01 06 e2 ${formatBL(mul)} a6 f0 00 90 81 90 60 80 00 01 06 e2 ${formatBL(mul)} a6 f0 08 90 01 00 89 90 01 00 60 80 00 01 06 e2 ${formatBL(mul)} a6 f0 08 90 02 00 89 90 02 00 01`);
            if (cursor_render !== -1) {
                kbdLog(`[ + ] cursor_render: ${cursor_render.toString(16).toUpperCase()}`);
                applyPatch(cursor_render + 0x52, convertHexStringToBytes("89 90 00 00"));
                applyPatch(cursor_render + 0x6A, convertHexStringToBytes("89 90 01 00"));
                applyPatch(cursor_render + 0x82, convertHexStringToBytes("89 90 02 00"));
                kbdLog(`[ * ] cursor_render patched.`);
            }
        }

        const loading_icon = findSignature("a0 08 fa 09 aa 02 fa 03 17 00 00 8c 02 00 02 04 02 70");
        if (loading_icon !== -1) {
            const loading_icon_patch_addr = loading_icon - 0x18;
            kbdLog(`[ * ] loading icon patch addr: ${loading_icon_patch_addr.toString(16).toUpperCase()}`);
            applyPatch(loading_icon_patch_addr, convertHexStringToBytes("56 00 11 90 31 f0 1f fe"));
        }

        kbdLog("[ + ] Patching finished!");

    } catch (e) {
        kbdLog(`[ x ] ERROR: ${e.message}`);
    }
}

document.getElementById('patchKbdButton').addEventListener('click', async function() {
    const fileInput = document.getElementById('shutdownPngFile');
    let shutdownImage = null;
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        shutdownImage = await new Promise((resolve, reject) => {
            reader.onload = e => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    await patchKbd(shutdownImage);
});

function set3_js(rb1, rb2, width, height, image) {
    const w2 = width / 8;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height).data;

    const array1_offset = rb1;
    const array2_offset = rb2;

    // Clear the target areas in the ROM
    for(let i=0; i < height * w2; i++) {
        rom[array1_offset + i] = 0;
        rom[array2_offset + i] = 0;
    }

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < w2; i++) {
            for (let k = 0; k < 8; k++) {
                const pixelIndex = (j * width + i * 8 + k) * 4;
                // Using the red channel (index 0) for grayscale value
                const b = imageData[pixelIndex] >> 6; // 0, 1, 2, or 3

                if ((b & 0b10) === 0) {
                    rom[array2_offset + j * w2 + i] |= (0x80 >> k);
                } else {
                    rom[array2_offset + j * w2 + i] &= ~(0x80 >> k);
                }

                if ((b & 0b01) === 0) {
                    rom[array1_offset + j * w2 + i] |= (0x80 >> k);
                } else {
                    rom[array1_offset + j * w2 + i] &= ~(0x80 >> k);
                }
            }
        }
    }
}