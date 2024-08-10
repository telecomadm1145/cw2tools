using System.Drawing;
using static cw2tools.CasioInternal.Static;
using static cw2tools.CasioInternal.Bitmap;
using System.IO;
using System.Windows.Media.Imaging;
using System.Reflection.Metadata;
using System.Runtime.InteropServices;
Console.WriteLine("[ + ] cw2kbd by telecomadm1145");
Console.WriteLine("[ + ] Emulator rom keyboard patcher");
string BL(nint func)
{
    return $"01 F{(func >> 16) & 0xf:X} {func & 0xff:X2} {(func >> 8) & 0xff:X2}";
}
string B(nint func)
{
    return $"00 F{(func >> 16) & 0xf:X} {func & 0xff:X2} {(func >> 8) & 0xff:X2}";
}
unsafe nint CheckSignature(nint signature, string description)
{
    if (signature == 0)
    {
        Console.WriteLine($"[ x ] Signature not found for {description}");
        // Handle the error appropriately, e.g., throw an exception or set a default value
        throw new Exception($"Signature not found for {description}");
    }
    else
    {
        Console.WriteLine($"[ + ] {description}:{signature - (nint)rom:X6}");
    }
    return signature;
}

unsafe
{
    rom = (byte*)Marshal.AllocHGlobal(0x80000);
    using (var fs = File.OpenRead("rom.bin"))
        _ = fs.Read(new Span<byte>(rom, 0x80000));
    var ki_mask_0xff = CheckSignature(FindSignature(rom, 0x60000, "ff 00 11 90 42 f0 1f fe") - (nint)rom, "ki_mask_0xff");
    var ko_0_0x7f = CheckSignature(FindSignature(rom, 0x60000, "7f 00 11 90 46 f0 1f fe") - (nint)rom, "ko_0_0x7f");
    var delay = CheckSignature(FindSignature(rom, 0x60000, "ce f8 05 f2 91 a0 0a f0 35 c8") - (nint)rom, "delay");
    var reset_timer = delay + 0x7a;
    var STOP = reset_timer + 0x4;
    var tick = CheckSignature(FindSignature(rom, 0x60000, "ce f8 01 ?? ?? ?? 05 f8 0b f0 00 03 3f fe 08 92 00 03 20 84 00 05 08 90 ff 02 00 01 04 e2") - (nint)rom, "tick");
    var is_key_available = CheckSignature(FindSignature(rom, 0x60000, "1e 00 ff 10 fe c8 7f 00 11 90 46 f0 00 e0 10 92 40 f0 ff 72 00 60 1f fe") - (nint)rom, "is_key_available");
    var ko_0 = CheckSignature(FindSignature(rom, 0x60000, "00 02 11 92 46 f0 1f fe") - (nint)rom, "ko_0");
    var ki_mask_0 = CheckSignature(FindSignature(rom, 0x60000, "00 00 11 90 42 f0 1f fe") - (nint)rom, "ki_mask_0");
    var exit = CheckSignature(FindSignature(rom, 0x60000, "ea a1 2e f4 3e f8 8e f2") - (nint)rom, "exit");
    var enter = CheckSignature(FindSignature(rom, 0x60000, "7e f8 6e f4 1a ae 1f fe") - (nint)rom, "enter");

    var get_kiko_emu = (byte*)CheckSignature(FindSignature(rom, 0x60000, $"ce f8 {BL(enter)} fe e1 f4 04 01 05 07 ce"), "get_kiko_emu");
    var scan_key = ((get_kiko_emu[0x39] & 0xf) << 16) | (get_kiko_emu[0x3a] & 0xff) | ((get_kiko_emu[0x3b] & 0xff) << 8);

    if (get_kiko_emu[0x38] != 1 && ((get_kiko_emu[0x39] & 0xf0) != 0xf0))
    {
        Console.WriteLine("[ x ] Invalid get_kiko_emu data");
        // Handle the error appropriately
        throw new Exception("Invalid get_kiko_emu data");
    }

    var key_debounce = ((get_kiko_emu[0x45] & 0xf) << 16) | (get_kiko_emu[0x46] & 0xff) | ((get_kiko_emu[0x47] & 0xff) << 8);

    if (get_kiko_emu[0x44] != 1 && ((get_kiko_emu[0x45] & 0xf0) != 0xf0))
    {
        Console.WriteLine("[ x ] Invalid get_kiko_emu data");
        // Handle the error appropriately
        throw new Exception("Invalid get_kiko_emu data");
    }

    var render_copy = (byte*)FindSignature(rom, 0x60000, $"ce f8 {BL(enter)} fa e1 00 88 00 00 11 90 fc 91 10 90 08 92");
    Console.WriteLine($"[ * ] render_copy: {render_copy - rom:X4}");
    if (render_copy != null)
    {
        render_copy[0x6c] = 0xf8;
        render_copy[0x6e] = 0;
        Console.WriteLine($"[ + ] Patched render_copy.");
    }

    var sleep = CheckSignature(FindSignature(rom, 0x60000, "0c f0 14 f0 30 90 fd 20 31 90 0c f0 08 f0 50 00 a0 01 31 90 51 91 02 00 31 90 8f fe 8f fe 1f fe") - (nint)rom, "sleep");
    sleep -= (nint)rom;
    var key_func = $"""
                    ce f8
                    {BL(enter)}
                    05 f8 fe e1
                    {BL(ki_mask_0xff)}
                    {BL(ko_0_0x7f)}
                    {BL(reset_timer)}
                    85 f0
                    {BL(tick)}
                    a0 00 0f 01
                    {BL(delay)}
                    91 a0 14 f0 1a c9
                    {BL(is_key_available)}
                    00 70 19 c9
                    {BL(ko_0)}
                    {BL(ki_mask_0)}
                    01 e0
                    {BL(delay)}
                    e5 f0 fe e0
                    {BL(scan_key)}
                    00 70 df c9 e5 f0 fe e0
                    {BL(key_debounce)}
                    00 70 d9 c9 7e b0 13 90 e0 91
                    06 ce
                    {BL(sleep)}
                    00 30 00 30 00 30
                    dc ce
                    {B(exit)}
                    """;
    byte[] patch = ConvertHexStringToBytes(key_func);
    var animate_func = (byte*)FindSignature(rom, 0x60000, "ce f8 01 ?? ?? ?? 20 8a 05 fc 1c ce 01 ?? ?? ?? 0a d0 4e f0 08 b0 5e f0 06 d0 4e f0 04 b0 5e f0 03 d3 02 d2 01 d1 c0 90");
    Console.WriteLine($"[ * ] animate: {animate_func - rom:X6}");
    var bit_blit = ((animate_func[0x29] & 0xf) << 16) | ((animate_func[0x29 + 1] & 0xff)) | ((animate_func[0x29 + 2] & 0xff) << 8);
    Console.WriteLine($"[ * ] bit_blit: {bit_blit:X6}");
    var emu_scan_key_1 = FindSignature(rom, 0x60000, $"e5 f0 fa 10 fc 61 {BL(tick)} a0 00 0f 01 {BL(delay)}");
    Console.WriteLine($"[ * ] emu_scan_key patch point: {(byte*)emu_scan_key_1 - rom:X4}");
    var emu_scan_key_real = emu_scan_key_1 - 0x114;
    Console.WriteLine($"[ * ] emu_scan_key: {(byte*)emu_scan_key_real - rom:X4}");
    var wait_key = (byte*)FindSignature(rom, 0x60000, $"e5 f0 ca e0 {BL(emu_scan_key_real - (nint)rom)} e8 90 cb ff");
    if(wait_key == null)
    {
        wait_key = (byte*)FindSignature(rom, 0x60000, $"e5 f0 ca e0 01 ?? ?? ?? e8 90 cb ff");
        Console.WriteLine($"[ + ] Warn: fall back to magic pattern.");
    }
    Console.WriteLine($"[ * ] wait_key part: {wait_key - rom:X4}");
    var emu_report_status = ((wait_key[0x25] & 0xf) << 16) | ((wait_key[0x26] & 0xff)) | ((wait_key[0x27] & 0xff) << 8);
    Console.WriteLine($"[ * ] emu_report_status: {emu_report_status:X4}");
    ApplyPatch(rom + emu_report_status, [0x1f, 0xfe]);
    var wait_kiko_v2 = emu_report_status + 2;
    ApplyPatch(rom + wait_kiko_v2, patch);
    Console.WriteLine($"[ + ] Written wait_kiko_v2 to {wait_kiko_v2:X6}");

    if (File.Exists("shutdown.png"))
    {
        BitmapImage bitmap = new();
        using var fs4 = File.OpenRead("shutdown.png");
        bitmap.BeginInit();
        bitmap.StreamSource = fs4;
        bitmap.EndInit();
        const int bs = 0x5cc70;
        Set3(bs + 0x10, bs + 0x10 + 0x5ea, 192, 63, bitmap);
        var table = (int*)(rom + bs);
        table[0] = bs + 0x10 + 0x5ea;
        table[1] = bs + 0x10;
        ApplyPatch(rom + bs + 0x8, [0, 0, 192, 63]);
        var xx = (bs >> 16) & 0xf;
        var yy = (bs >> 8) & 0xff;
        var zz = bs & 0xff;
        Console.WriteLine($"[ * ] Written shutdown logo to {bs:X6}.");
        var shutdown_func = ConvertHexStringToBytes($"""
        00 00
        11 90 d1 f0
        0c f0 {zz:X2} {yy:X2}
        {xx:X2} E3
        54 90
        6E F0
        {xx:X2} E3
        54 90
        6E F0
        {xx:X2} E3
        54 90
        {BL(bit_blit)}
        {BL((nint)(render_copy - rom))}
        a0 00
        0f 01
        {BL(delay)}
        03 00 11 90 31 f0 00 00 11 90 3d f0 11 90 0a f0 11 90 10 f0 11 90 11 f0 11 90 12 f0
        {BL(ki_mask_0)}
        {BL(ko_0)}
        {B(STOP)}
        """);
        const int shutdown_ = 0x5cbb0;
        ApplyPatch(rom + shutdown_, shutdown_func);
        Console.WriteLine($"[ * ] Written shutdown function to {shutdown_:X6}.");
        var wait_key_shutdown_routine = wait_key + 0x9C;
        ApplyPatch(wait_key_shutdown_routine, ConvertHexStringToBytes($"""
                                            {BL(shutdown_)}
                                            00 30 00 30
                                            00 30
                                            00 30 00 30
                                            00 30
                                            00 30 00 30
                                            """));
        Console.WriteLine($"[ * ] Patched shutdown call.");
    }
    else
    {
        var shutdown_func = ConvertHexStringToBytes($"""
        03 00
        11 90 31 f0
        00 00
        11 90 d1 f0
        11 90 3d f0
        11 90 0a f0
        11 90 10 f0
        11 90 11 f0
        11 90 12 f0
        {BL(ki_mask_0)}
        {BL(ko_0)}
        {B(STOP)}
        """);
        var shutdown_ = emu_report_status + 2 + patch.Length;
        ApplyPatch(rom + shutdown_, shutdown_func);
        Console.WriteLine($"[ * ] Written shutdown function to {shutdown_:X6}.");
        var wait_key_shutdown_routine = wait_key + 0x9C;
        ApplyPatch(wait_key_shutdown_routine, ConvertHexStringToBytes($"""
                                            {BL(shutdown_)}
                                            00 30 00 30
                                            00 30
                                            00 30 00 30
                                            00 30
                                            00 30 00 30
                                            """));
        Console.WriteLine($"[ * ] Patched shutdown call.");
    }

    if (emu_scan_key_1 != 0)
    {
        var scan_key_patch = $"""
                          00 00 00 01
                          13 90 e0 91
                          e5 f0 fa 10 fc 61
                          {BL(wait_kiko_v2)}
                          00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 12 90 e0 91 83 90 00 30 13 80
                          """;
        byte[] patch2 = ConvertHexStringToBytes(scan_key_patch);
        ApplyPatch((byte*)emu_scan_key_1, patch2);
        var scan_key_patch2 = $"""
                          01 00 11 90 c9 91 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30 00 30
                          """;
        byte[] patch3 = ConvertHexStringToBytes(scan_key_patch2);
        ApplyPatch((byte*)emu_scan_key_1 + 0x3c, patch3);
        Console.WriteLine("[ + ] Patched emu_scan_key.");
    }

    var exicon_func = FindSignature(rom, 0x60000, "03 00 11 90 18 f0 1f fe");
    Console.WriteLine($"[ * ] exicon setup: {(byte*)exicon_func - rom:X4}");
    if (exicon_func != 0)
    {
        *(byte*)exicon_func = 0;
        Console.WriteLine("[ + ] Patched exicon setup.");
    }

    var formula_start_eval = (byte*)FindSignature(rom, 0x60000, $"ce f8 5e f4 ?? 04 8e 05 04 02 08 e3 41 92 a0 00 0f 01 {BL(delay)} 1e f4 8e f2");
    Console.WriteLine($"[ * ] formula_start_eval: {formula_start_eval - rom:X4}");
    if (formula_start_eval != null)
    {
        ApplyPatch(formula_start_eval, ConvertHexStringToBytes("""
            10 00 11 90 46 f0 04 00 11 90 42 f0
            1f fe
            """));
        Console.WriteLine($"[ + ] Patched formula_start_eval.");
    }
    var is_ac_pressed = (byte*)FindSignature(rom, 0x60000, $"ce f8 5e f4 ?? 04 8e 05 08 02 08 e3 41 92 a0 00 0f 01 {BL(delay)} 00 e0");
    Console.WriteLine($"[ * ] is_ac_pressed: {is_ac_pressed - rom:X4}");
    if (is_ac_pressed != null)
    {
        ApplyPatch(is_ac_pressed, ConvertHexStringToBytes("""
            a1 a0 40 f0
            02 c9
            00 00
            1f fe
            01 00
            1f fe
            """));
        Console.WriteLine($"[ + ] Patched is_ac_pressed.");
    }
    var memcpy_far = FindSignature(rom, 0x60000, "5e fe 1a ae 6e f8 6e f4 5e fc 05 f8 20 8a 05 f4 20 86 42 b0 05 fc 0a ce 45 f0 c0 93 6f 90 41 93 81 e0 05 f4 81 ec 44 b0 ff e0 c4 b0 00 e0 44 b2 27 f0 f2 c1 85 f0 a0 82 1e fc 2e f4 2e f8 ea a1 1e fe");
    if (memcpy_far != 0)
    {
        memcpy_far -= (nint)rom;
        Console.WriteLine($"[ + ] memcpy_far: {memcpy_far:X4}");
        byte* memcpy_far_caller = rom;
        nint size = 0x60000;
        while ((memcpy_far_caller = (byte*)FindSignature(memcpy_far_caller, size, $"00 00 90 01 08 02 {BL(memcpy_far)}")) != null)
        {
            Console.WriteLine($"[ + ] memcpy_far caller: {memcpy_far_caller - rom:X4}");
            size = (nint)(0x60000 - (memcpy_far_caller - rom));
            memcpy_far_caller[0x2] = 0xf8;
            memcpy_far_caller[0x4] = 0;
        }
    }

    var mul = FindSignature(rom, 0x60000, "6e f4 5e f8 00 e8 00 86 24 f6 00 84 34 f4 41 87 56 88 10 84 24 f4 41 87 56 88 00 69 10 82 34 f2 86 f2 65 f0 1e f8 2e f4 1f fe");
    if (mul == 0)
        return;
    mul -= (nint)rom;
    Console.WriteLine($"[ + ] mul: {mul:X6}");

    var cursor_render = (byte*)FindSignature(rom, 0x60000, $"60 80 00 01 06 e2 {BL(mul)} a6 f0 00 90 81 90 60 80 00 01 06 e2 {BL(mul)} a6 f0 08 90 01 00 89 90 01 00 60 80 00 01 06 e2 {BL(mul)} a6 f0 08 90 02 00 89 90 02 00 01");
    if (cursor_render == null)
        return;
    Console.WriteLine($"[ + ] cursor_render: {cursor_render - rom:X6}");

    ApplyPatch(cursor_render + 0x52,ConvertHexStringToBytes("89 90 00 00"));
    ApplyPatch(cursor_render + 0x6A, ConvertHexStringToBytes("89 90 01 00"));
    ApplyPatch(cursor_render + 0x82, ConvertHexStringToBytes("89 90 02 00"));

    Console.WriteLine($"[ * ] cursor_render patched.");

    var loading_icon = (byte*)FindSignature(rom, 0x60000, "a0 08 fa 09 aa 02 fa 03 17 00 00 8c 02 00 02 04 02 70");
    if (loading_icon == null)
        return;
    loading_icon -= 0x18;

    ApplyPatch(loading_icon, ConvertHexStringToBytes($"""
        56 00
        11 90 31 f0
        1f fe
        """));

    using (var fs = File.OpenWrite("rom_patched.bin"))
        fs.Write(new Span<byte>(rom, 0x80000));
}