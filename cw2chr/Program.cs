using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
Dictionary<int, string> map = [];
unsafe byte GetByte(byte* pattern)
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
    var cn_f1 = ey.GetProperty("CN_F1");
    var cn_f2 = ey.GetProperty("CN_F2");
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
    using (var fs = File.OpenRead(Console.ReadLine()))
        fs.Read(new Span<byte>(rom, 0x60000));
    var func = FindSignature(rom, 0x60000, "ce f8 01 ?? ?? ?? 25 fa 00 05 00 e6 00 ec 00 02 a1 92 00 84 00 71".ToUpper());
    if (func == 0)
    {
        Console.WriteLine("Search failed");
        return;
    }
    Console.WriteLine($"char_to_string func: 0x{func - (nint)rom:X6}");
    func += 20;
    Dictionary<int, nint> subroutines = new();
    Dictionary<int, (int ptr, int count)> tables = new();
    while (((byte*)func)[1] == 0x71 && ((byte*)func)[3] == 0xc9)
    {
        subroutines.Add(((byte*)func)[0], func + 4 + ((sbyte*)func)[2] * 2);
        func += 4;
    }
    foreach (var rt in subroutines)
    {
        var rtd = (byte*)rt.Value;
        Console.WriteLine($"{rt.Key:X2} = {rt.Value - (nint)rom:X6} {(rtd[0] | (rtd[2] << 8)):X4} {*(ushort*)(rom + *(ushort*)&rtd[6]):X4}");
        tables.Add(rt.Key, (rtd[0] | (rtd[2] << 8), *(ushort*)(rom + *(ushort*)&rtd[6])));
    }
    o.WriteLine("Address,String");
    foreach (var tb in tables)
    {
        for (int i = 0; i < Math.Min(0x100,tb.Value.count); i++)
        {
            o.WriteLine($"0x{tb.Key:X2}{i:X2},\"{strdup(rom + ((ushort*)(rom + tb.Value.ptr))[(i << 1) + 1])}\"");
        }
    }
    o.Flush();
    o.Close();
    Console.WriteLine("Done!");
    Console.ReadKey();
}