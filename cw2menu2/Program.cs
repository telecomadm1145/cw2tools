using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
Dictionary<int, string> map = [];
unsafe  byte GetByte(byte* pattern)
{
    if (*pattern == '?')
        return 0;

    byte high = (byte)(pattern[0] >= '0' && pattern[0] <= '9' ? pattern[0] - '0' : pattern[0] - 'A' + 10);
    byte low = (byte)(pattern[1] >= '0' && pattern[1] <= '9' ? pattern[1] - '0' : pattern[1] - 'A' + 10);

    return (byte)((high << 4) | low);
}
unsafe IntPtr FindSignature(byte* start, nint size, string signature)
{
    byte* pattern = (byte*)Marshal.StringToHGlobalAnsi(signature).ToPointer();
    byte* oldPat = pattern;
    byte* end = start + size;
    IntPtr firstMatch = IntPtr.Zero;

    byte patByte = GetByte(pattern);

    for (byte* pCur = start; pCur < end; pCur++)
    {
        if (*pattern == 0)
            return firstMatch;

        while (*pattern == ' ')
            pattern++;

        if (*pattern == 0)
            return firstMatch;

        if (oldPat != pattern)
        {
            oldPat = pattern;
            if (*pattern != '?')
                patByte = GetByte(pattern);
        }

        if (*pattern == '?' || *pCur == patByte)
        {
            if (firstMatch == IntPtr.Zero)
                firstMatch = (IntPtr)pCur;

            if (pattern[1] == 0 || pattern[2] == 0)
                return firstMatch;

            pattern += 2;
        }
        else
        {
            pattern = (byte*)Marshal.StringToHGlobalAnsi(signature).ToPointer();
            firstMatch = IntPtr.Zero;
        }
    }

    return IntPtr.Zero;
}


unsafe ushort be_read(byte* ptr)
{
    return (ushort)((ptr[0] << 8) | ptr[1]);
}
unsafe string strdup(byte* sb)
{
    StringBuilder b = new();
    while (true)
    {
        var c = *sb;
        if (c == 0)
            break;
        if (c >= 0xf0)
        {
            var key = be_read(sb);
            if (map.ContainsKey(key))
                b.Append(map[key]);
            else
            {
                b.Append($"<{key:X4}>");
            }
            sb += 2;
        }
        else
        {
            var key = c;
            if (map.ContainsKey(key))
                b.Append(map[key]);
            else
            {
                b.Append($"<{key:X4}>");
            }
            sb++;
        }
    }
    return b.ToString();
}
unsafe string get_local_string(byte* rom, ushort offset, ushort code, byte language)
{
    var ofst = *(uint*)(rom + code * 4 + ((ushort*)(rom + offset))[language]);
    if (ofst > 0x60000)
        return "";
    return strdup(rom + ofst);
}
unsafe string convert_local(byte* rom, ushort offset, ushort str, byte language)
{
    StringBuilder b = new();
    if (str <= 0x200)
    {
        return get_local_string(rom, offset, (ushort)(str - 1), language);
    }
    byte* sb = rom + str;
    while (true)
    {
        var c = *sb;
        if (c == 0)
            break;
        if (c == 0x02)
        {
            // b.Append($"{c:X2}:");
            b.Append(get_local_string(rom, offset, (ushort)(sb[1] - 1), language));
            sb += 2;
        }
        else if (c == 0x04)
        {
            // b.Append($"{c:X2}:");
            b.Append(get_local_string(rom, offset, (ushort)(sb[1] + 0xfe), language));
            sb += 2;
        }
        else if (c == 0x05)
        {
            // b.Append($"{c:X2}:");
            b.Append(get_local_string(rom, offset, (ushort)(sb[1] + 0x1fd), language));
            sb += 2;
        }
        else if (c >= 0xf0)
        {
            var key = be_read(sb);
            if (map.ContainsKey(key))
                b.Append(map[key]);
            else
            {
                b.Append($"<{key:X4}>");
            }
            sb += 2;
        }
        else
        {
            var key = c;
            if (map.ContainsKey(key))
                b.Append(map[key]);
            else
            {
                b.Append($"<{key:X4}>");
            }
            sb++;
        }
    }
    if (b.Length > 40)
        return "ERROR";
    return b.ToString();
}

{
    JsonDocument jd;
    using (var fs = File.OpenRead("public_font_map_dist.json"))
        jd = JsonDocument.Parse(fs);
    var ey = jd.RootElement.GetProperty("EY");
    var un_00 = ey.GetProperty("UN_00");
    var un_f0 = ey.GetProperty("UN_F0");
    var cy = jd.RootElement.GetProperty("CY");
    var cn_f1 = cy.GetProperty("JA_F1");
    var cn_f2 = cy.GetProperty("JA_F2");
    var sr_f3 = ey.GetProperty("SR_F3");
    var vn_f4 = ey.GetProperty("VN_F4");

    var tmp = un_00.GetProperty("inputMap");
    foreach (var obj in tmp.EnumerateObject())
    {
        var key = Convert.ToInt32(obj.Name, 16);
        var v = obj.Value.GetString();
        if (v != null)
        {
            map.Add(key, v);
        }
    }
    tmp = un_f0.GetProperty("inputMap");
    foreach (var obj in tmp.EnumerateObject())
    {
        var key = Convert.ToInt32(obj.Name, 16);
        var v = obj.Value.GetString();
        if (v != null)
        {
            map.Add(key, v);
        }
    }
    tmp = cn_f1.GetProperty("inputMap");
    foreach (var obj in tmp.EnumerateObject())
    {
        var key = Convert.ToInt32(obj.Name, 16);
        var v = obj.Value.GetString();
        if (v != null)
        {
            map.Add(key, v);
        }
    }
    tmp = cn_f2.GetProperty("inputMap");
    foreach (var obj in tmp.EnumerateObject())
    {
        var key = Convert.ToInt32(obj.Name, 16);
        var v = obj.Value.GetString();
        if (v != null)
        {
            map.Add(key, v);
        }
    }
    tmp = sr_f3.GetProperty("inputMap");
    foreach (var obj in tmp.EnumerateObject())
    {
        var key = Convert.ToInt32(obj.Name, 16);
        var v = obj.Value.GetString();
        if (v != null)
        {
            map.Add(key, v);
        }
    }
    tmp = vn_f4.GetProperty("inputMap");
    foreach (var obj in tmp.EnumerateObject())
    {
        var key = Convert.ToInt32(obj.Name, 16);
        var v = obj.Value.GetString();
        if (v != null)
        {
            map.Add(key, v);
        }
    }
    jd.Dispose();
}

unsafe
{
    using var o = File.CreateText("result.csv");
    byte* rom = stackalloc byte[0x70000];
    using (var fs = File.OpenRead("rom.bin"))
        fs.Read(new Span<byte>(rom, 0x60000));
    var language = FindSignature(rom,0x60000,"5e f8 5e f4 05 f8 10 90 bb 91 00 01 06 f0 85 f2 2b 93 2a 92 08 a0 ?? ?? 26 f0 08 a2 fc ff 08 90 fe ff 25 f4 00 82 45 f0 1e f4 1e f8 1f fe".ToUpper());
    if (language == 0)
    {
        Console.WriteLine("Search failed");
        return;
    }
    Console.WriteLine($"Local func: 0x{language - (nint)rom:X6}");
    language += 0x16;
    var offst = *(ushort*)language;
    Console.WriteLine($"Lang LUT: 0x{offst:X4}");
    var show_menu = FindSignature(rom, 0x60000, "00 82 e9 90 9f ff 00 03 25 f0 06 e2 01".ToUpper());
    if (show_menu == 0)
    {
        Console.WriteLine("Search failed");
        return;
    }
    Console.WriteLine($"Menu  func: 0x{show_menu - (nint)rom:X6}");
    show_menu += 0x10;
    var sm = (byte*)show_menu;
    var b = (sm[0] << 16 | sm[5] << 8 | sm[4]) - 3;
    Console.WriteLine($"Menus: 0x{b:X6}");


    var ptr = (Menu*)(rom + b);
    int i = 0;
    o.WriteLine("MenuId,Ptr,Type,Count,Operation,Condition,TextPtr,Text1,Text2");
    while (i < 255)
    {
        if (ptr->type > 3 || ptr->item_count > 30)
        {
            i++;
            continue;
        }
        o.WriteLine($"0xEB{i++:X2},0x{ptr->pitems:X4},0x{ptr->type:X2},\"{ptr->item_count}\",0x{ptr->parent_menu:X4}");
        var ptr2 = (MenuItem*)(rom + ptr->pitems);
        for (int j = 0; j < ptr->item_count; j++)
        {
            o.WriteLine($",,,,0x{ptr2[j].op:X4},0x{ptr2[j].cond:X2},0x{ptr2[j].ptext:X04},\"{convert_local(rom, offst, ptr2[j].ptext, 0)}\",\"{convert_local(rom, offst, ptr2[j].ptext, 1)}\"");
        }
        o.Flush();
        ptr++;
    }
    Console.WriteLine("Done!");
    Console.ReadKey();
}
struct Menu
{
    public ushort pitems;
    public byte type;
    public byte item_count;
    public ushort parent_menu;
}
struct MenuItem
{
    public ushort ptext;
    public ushort op;
    public byte cond;
    public byte pad;
}